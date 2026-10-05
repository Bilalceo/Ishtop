"""scripts/ingest/textclean.py — what an imported post must not carry onto our pages."""
import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "scripts" / "ingest"))
tc = pytest.importorskip("textclean")

POST = """Sotuvchi kerak
Maosh: 5 000 000 so'm
Aloqa: @sabina5444
e'lonlarning texnik holatiga, oyliklarga va ish beruvchi bilan kelishuvingizga kanal ma'muriyati javob bermaydi!!!
Ogohlik-davr talabi…
Shaxsiy ma'lumotingizni (pasport,karta) hechkimga bermang!!!
instagram | telegram | facebook
@rabotauz"""


def test_strips_the_source_channel_and_its_boilerplate():
    out = tc.clean_text(POST)
    for gone in ("javob bermaydi", "Ogohlik", "hechkimga", "instagram |", "@rabotauz"):
        assert gone not in out
    # The employer's own contact and the facts stay.
    assert "@sabina5444" in out and "5 000 000" in out


def test_inline_source_handle_removed_but_employer_handle_kept():
    assert tc.clean_text("Rezyume: @hrotto yoki @rabota_uz") == "Rezyume: @hrotto yoki"


def test_language():
    assert tc.lang("Менеджер по продажам в офис") == "ru"
    assert tc.lang("Юк ташувчи-ёрдамчи ишчи керак, маош ойига") == "uz-cyr"
    assert tc.lang("Sotuv menejeri kerak") == "uz"


def test_transliteration_follows_uzbek_rules():
    assert tc.translit("Юк ташувчи-ёрдамчи ишчи") == "Yuk tashuvchi-yordamchi ishchi"
    assert tc.translit("Меҳмонхона йиғиштирувчиси") == "Mehmonxona yig'ishtiruvchisi"
    assert tc.translit("Ўзбекистон") == "O'zbekiston"
    assert tc.translit("ТОШКЕНТ") == "TOSHKENT"


def test_a_russian_gloss_in_brackets_is_dropped():
    """An Uzbek post that glosses a label in Russian reads as Uzbek, so it
    skips translation and the gloss reaches the site as the only Cyrillic on
    the listing. It carries nothing the Uzbek label has not already said."""
    from textclean import clean_text

    assert clean_text("Ish haqi: (Зарплата)") == "Ish haqi:"
    assert clean_text("Kompaniya: (Компания) IshTop") == "Kompaniya: IshTop"
    # a bracket that is not purely Cyrillic is content, and stays
    assert clean_text("Dasturchi (Python)") == "Dasturchi (Python)"
    assert clean_text("Maosh: 5 mln") == "Maosh: 5 mln"
