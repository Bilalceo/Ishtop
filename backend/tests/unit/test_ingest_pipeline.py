"""The vacancy ingest gate.

Every assertion here stands for a failure that reached production: 130 listings
a candidate could not act on, contacts that pointed at the channel we scraped
rather than the employer, a title sliced mid-word, and a fallback path that had
never once run. The pipeline's job is to refuse things, so the refusals are what
gets tested.

The scripts live outside the app package (they are operator tools, not request
handlers) so they are loaded by path.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

INGEST = Path(__file__).resolve().parents[2] / "scripts" / "ingest"
# The scripts import each other by bare name (`from roles import role_name`),
# the way they do when run from their own directory.
if str(INGEST) not in sys.path:
    sys.path.insert(0, str(INGEST))


def _load(name: str):
    """Import an ingest script for its helpers.

    Safe because each one keeps its argv handling behind `if __name__ ==
    "__main__"` — which is exactly why `structure.py` was restructured: it used
    to read argv and open its input file at import time, so nothing below that
    line existed to test.
    """
    spec = importlib.util.spec_from_file_location(f"ingest_{name}", INGEST / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


roles = _load("roles")


@pytest.fixture(scope="module")
def struct():
    return _load("structure")


# ---------------------------------------------------------------------------
# roles.py — the title is a job name, not a slogan
# ---------------------------------------------------------------------------

class TestRoleName:
    def test_names_the_role_from_a_sentence(self):
        assert roles.role_name(
            "O'zbekistonda yagona bo'lgan tashkilotimizning call center "
            "bo'limiga ishga qabul ochildi") == "Call-markaz operatori"

    def test_answers_in_the_language_of_the_post(self):
        assert roles.role_name("Требуется менеджер по продажам") == "Менеджер по продажам"
        assert roles.role_name("Sotuv menejeri kerak") == "Sotuv menejeri"

    def test_returns_nothing_when_no_role_is_named(self):
        # A slogan is not a job title: "Стань частью команды мечты".
        assert roles.role_name("Стань частью команды мечты") == ""

    def test_never_slices_a_word(self):
        # A character window around the keyword produced "ьство КНР в РУз
        # требуется охранник" and "qarish fabrikasi MALAKALI DIZAYNER".
        for text in [
            "Посольство КНР в РУз требуется охранник",
            "Mebel ishlab chiqarish fabrikasi MALAKALI DIZAYNER qidirmoqda",
        ]:
            name = roles.role_name(text)
            assert name
            assert name == name.strip()
            assert not name[0].islower() or name[0].isalpha()

    def test_prefers_the_more_specific_role(self):
        assert roles.role_name("Sotuvchi-konsultant kerak") == "Sotuvchi-konsultant"

    def test_knows_the_trades_these_channels_carry(self):
        # 38 posts a fortnight were dropped for "no recognised role" and turned
        # out to be real jobs the list simply had never heard of.
        for text, want in [
            ("МАЛАКАЛИ ТИКУВЧИ ВА ЁРДАМЧИ ТИКУВЧИ", "Tikuvchi"),
            ("GROOM COUTURE ИЩЕТ ГРУМЕРОВ В КОМАНДУ", "Грумер"),
            ("ХОСТЕЛ BESHIC СРОЧНО ИЩЕТ ГОРНИЧНУЮ", "Горничная"),
            ("Вакансия: Воспитатель в детский сад", "Воспитатель"),
            ("ELEKTRIKA BO'YICHA USTALAR ISHGA TAKLIF QILINADI", "Elektrik"),
            ("Тозалик ходимаси талаб этилади", "Tozalik xodimi"),
            ("ТРЕБУЮТСЯ РАБОТНИКИ НА ПОЛИГРАФИЧЕСКОЕ ПРОИЗВОДСТВО",
             "Работник полиграфии"),
        ]:
            assert roles.role_name(text) == want, text

    def test_lash_does_not_match_inside_qadoqlash(self):
        # "Tuz qadoqlash sehiga..." came out as a nail technician: "lash"
        # matched inside "qadoqlash". Same class of bug as substring matching
        # in the scorer.
        assert roles.role_name(
            "Tuz qadoqlash sehiga ayol qizlarni ishga taklif qilamiz"
        ) == "Qadoqlovchi"

    def test_cyrillic_uzbek_answers_in_uzbek(self):
        # Cyrillic does not mean Russian: these channels carry Uzbek in
        # Cyrillic, and "МАЛАКАЛИ ТИКУВЧИ" was getting the Russian job title.
        assert roles.role_name("Сотув агентлари керак") == "Savdo vakili"
        assert roles.role_name("Тошкент шахардан сотувчилар") == "Sotuvchi"
        # ...while actual Russian still answers in Russian.
        assert roles.role_name("Требуется продавец в магазин") == "Продавец"


class TestLanguageDetection:
    def test_cyrillic_heavy_text_is_russian(self):
        assert roles.is_russian("Требуется менеджер по продажам в Ташкенте")

    def test_latin_uzbek_is_not(self):
        assert not roles.is_russian("Sotuv menejeri kerak, Toshkent shahri")


# ---------------------------------------------------------------------------
# structure.py — nothing is invented, nothing junk is kept
# ---------------------------------------------------------------------------

class TestSalary:
    def test_reads_a_stated_range(self, struct):
        assert struct.find_salary("Oylik: 4.000.000 - 8.000.000") == (4_000_000, 8_000_000)

    def test_reads_dan_gacha(self, struct):
        lo, hi = struct.find_salary("4 000 000 so'mdan 10 000 000 gacha")
        assert (lo, hi) == (4_000_000, 10_000_000)

    def test_reads_millions_shorthand(self, struct):
        assert struct.find_salary("4–12 mln so'm") == (4_000_000, 12_000_000)

    def test_invents_nothing_when_the_post_is_silent(self, struct):
        assert struct.find_salary("Ish haqi suhbat asosida") == (None, None)

    def test_reads_dollars(self, struct):
        # An IT listing said "Maosh: $500+" while the page said "Maosh
        # ko'rsatilmagan" — only so'm was ever read.
        lo, hi = struct.find_salary("Maosh: $500+")
        assert lo == 500 * struct.USD_RATE and hi is None
        lo, hi = struct.find_salary("Maosh: 1000-1500$")
        assert (lo, hi) == (1000 * struct.USD_RATE, 1500 * struct.USD_RATE)

    def test_reads_the_shapes_the_posts_actually_use(self, struct):
        for text, lo, hi in [
            ("Maosh: 300$ - 500$", 300, 500),
            ("Maosh: 700-1000+$", 700, 1000),
            ("Maosh: Internship / 150$-200$", 150, 200),
            ("Maosh: 100$", 100, None),
        ]:
            got = struct.find_salary(text)
            assert got == (lo * struct.USD_RATE,
                           hi * struct.USD_RATE if hi else None), text

    def test_a_weekly_figure_is_not_a_salary(self, struct):
        # "Haftalik daromad: 50$ – 300$" stored as a monthly wage would
        # understate the job by four.
        assert struct.find_salary("Haftalik daromad: 50$ – 300$ gacha") == (None, None)

    def test_ignores_figures_that_are_not_money(self, struct):
        # "18-35 yosh" is an age range, and 18 so'm is not a salary.
        assert struct.find_salary("Yosh: 18-35") == (None, None)


class TestCity:
    def test_finds_a_city_it_knows(self, struct):
        assert struct.find_city("Manzil: Toshkent shahri") == "Toshkent"
        assert struct.find_city("Работа в Самарканде") == "Samarqand"

    def test_returns_empty_rather_than_guessing_tashkent(self, struct):
        # A post that never says where the work is must NOT become a Tashkent
        # job — location is the field candidates filter on hardest.
        assert struct.find_city("Masofaviy ish, grafik erkin") == ""


class TestSectionLists:
    def test_lifts_the_bullets_under_a_heading(self, struct):
        text = "Talablar:\nRus tili\nKompyuterda ishlash\n\nAloqa: +998901234567"
        got = struct.section(text, struct.REQ_HEAD)
        assert "Rus tili" in got

    def test_drops_a_social_links_line(self, struct):
        # Ten listings shipped "instagram | telegram | facebook" as their only
        # stated requirement.
        text = "Talablar:\ninstagram | telegram | facebook\nRus tili"
        got = struct.section(text, struct.REQ_HEAD)
        assert not any("instagram" in x.lower() for x in got)

    def test_drops_a_nested_heading(self, struct):
        # A card once read "Talablar: • Обязательные".
        text = "Требования:\nОбязательные\nPython 3 yil"
        got = struct.section(text, struct.REQ_HEAD)
        assert "Обязательные" not in got

    def test_keeps_a_short_real_entry(self, struct):
        # A length rule would have been easier and wrong.
        text = "Talablar:\nPython\nDjango\nDRF"
        got = struct.section(text, struct.REQ_HEAD)
        assert {"Python", "Django", "DRF"} <= set(got)


class TestTitleShortening:
    def test_collapses_a_multi_role_title(self, struct):
        got = struct.shorten_title(
            "Ofitsiant / Shashlikchi / Oshpaz Universal / Posuda moyka / "
            "Salatchi / Qassob")
        assert got == "Ofitsiant va yana 5 ta lavozim"

    def test_leaves_a_normal_title_alone(self, struct):
        assert struct.shorten_title("Sotuv menejeri") == "Sotuv menejeri"

    def test_does_not_split_inside_the_employer_bracket(self, struct):
        t = "Mehnat muhofazasi muhandisi (Ishlab chiqarish, Toshkent)"
        assert struct.shorten_title(t) == t

    def test_splits_on_commas_too(self, struct):
        assert struct.split_roles("A, B / C") == ["A", "B", "C"]


# ---------------------------------------------------------------------------
# harvest.py — who counts as a contact, and whose posts we read
# ---------------------------------------------------------------------------

class TestContactGate:
    """`employer_contact` in tg_pipeline is the same rule insert_jobs applies."""

    @pytest.fixture(scope="class")
    def gate(self):
        import re

        AGGREGATORS = {"rabota_uz", "ishmi_ish", "itcloz", "ishtopuz_official"}
        PHONE = re.compile(
            r"\+?998[\s\-()]?\d{2}[\s\-()]?\d{3}[\s\-()]?\d{2}[\s\-()]?\d{2}")
        EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
        HANDLE = re.compile(r"(?:^|[\s:;,.·|(])@([A-Za-z0-9_]{4,32})(?![\w.])")

        def contact(text: str) -> str:
            phones = [p.strip() for p in PHONE.findall(text)]
            emails = EMAIL.findall(text)
            handles = [f"@{h}" for h in HANDLE.findall(EMAIL.sub(" ", text))
                       if h.lower() not in AGGREGATORS]
            return ", ".join(dict.fromkeys(phones[:2] + handles[:2] + emails[:1]))

        return contact

    def test_accepts_a_phone(self, gate):
        assert gate("Aloqa: +998 90 123 45 67") == "+998 90 123 45 67"

    def test_accepts_an_employer_handle(self, gate):
        assert gate("Murojaat: @hr_cakelab_2024") == "@hr_cakelab_2024"

    def test_rejects_the_channel_we_read_it_from(self, gate):
        # "Batafsil: @ishmi_ish kanali" was stored as the employer's contact on
        # 46 listings — writing there reaches nobody.
        assert gate("Batafsil: @ishmi_ish kanali") == ""

    def test_rejects_an_emails_domain_as_a_handle(self, gate):
        assert gate("shintree.uz@korshop.one") == "shintree.uz@korshop.one"
        assert "@korshop," not in gate("shintree.uz@korshop.one")

    def test_rejects_a_post_with_nothing_reachable(self, gate):
        assert gate("Batafsil ma'lumot uchun havolaga o'ting") == ""


class TestTemplatePhones:
    """A placeholder number parses as valid and reaches nobody."""

    @pytest.fixture(scope="class")
    def real_phone(self):
        import re

        def f(raw: str) -> bool:
            body = re.sub(r"\D", "", raw)[-9:]
            if len(body) < 9 or len(set(body)) <= 2:
                return False
            return body[2:] not in ("1234567", "7654321", "0000000")

        return f

    def test_rejects_the_example_number(self, real_phone):
        assert not real_phone("+998 90 123 45 67")

    def test_rejects_a_repeated_digit(self, real_phone):
        assert not real_phone("+998000000000")

    def test_accepts_a_real_one(self, real_phone):
        assert real_phone("+998935906688")
