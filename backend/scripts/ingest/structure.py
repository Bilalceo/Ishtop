"""Turn harvested posts into vacancy rows, without inventing anything.

Rules that matter here:
  * nothing is guessed. A salary, a city or a requirement is set only when the
    post actually says it; otherwise the field stays empty and the description
    carries the original wording.
  * a post advertising several different roles at once ("BO'SH ISH O'RINLARI:"
    followed by twelve job names) is skipped — splitting it would mean deciding
    which requirement belongs to which role, and we would be making that up.
  * job-seeker posts are not vacancies. UstozShogird carries "Ish joyi kerak"
    (someone looking) alongside "Xodim kerak" (someone hiring); only the latter
    is an employer.
"""
import sys, re, json, unicodedata
from roles import role_name

src, dst = sys.argv[1], sys.argv[2]
posts = json.load(open(src, encoding="utf-8"))

# Startup/news channels post announcements, not vacancies.
NEWS_CHANNELS = {"uzcombinator", "foundershub_uz"}
# An employer post says, somewhere, that it is hiring.
HIRING = re.compile(
    r"(ishga (taklif|qabul|olinadi)|xodim kerak|ishchi kerak|kerak\b|vakansiya|"
    r"вакансия|требуется|ищем|мы ищем|приглашаем|набираем|hiring|we are looking|"
    r"qidirmoqda|izlamoqda|jamoaga|talab qilinadi|ish o'rni|bo'sh ish)", re.I)

# The role is what the site shows as a title. Post headlines are sentences
# ("O'zbekistonda yagona bo'lgan tashkilotimizning call center bo'limiga ishga
# qabul ochildi"), so pull the role phrase out rather than printing the sentence.
ROLE_WORDS = (
    r"sotuvchi|sotuv menejeri|savdo menejeri|savdo agenti|savdo vakili|menejer|manager|"
    r"operator|call ?center|kuryer|курьер|haydovchi|водитель|buxgalter|бухгалтер|"
    r"kassir|кассир|administrator|admin|farrosh|oshpaz|повар|ofitsiant|официант|"
    r"barmen|bармен|sotuv operatori|marketolog|smm|dizayner|designer|developer|"
    r"dasturchi|programmer|muhandis|engineer|o'qituvchi|repetitor|преподавател|"
    r"hr|rekruter|recruiter|psixolog|shifokor|hamshira|omborchi|ombor mudiri|"
    r"qo'riqchi|охранник|texnolog|brigadir|supervayzer|supervisor|konsultant|"
    r"consultant|yordamchi|assistent|assistant|kotib|sekretar|analitik|analyst|"
    r"tester|qa|devops|frontend|backend|fullstack|mobil dasturchi|copywriter|"
    r"kopirayter|montajchi|mobilograf|targetolog|prodavets|продавец|логист|logist"
)
ROLE_RE = re.compile(rf"([\w''\-/. ]{{0,26}}?\b(?:{ROLE_WORDS})\b[\w''\-/. ]{{0,26}})", re.I)

# --- what is not a vacancy ---------------------------------------------------
SEEKER = re.compile(r"^\s*[*_]*\s*(ish joyi kerak|sherik kerak|shogird kerak|"
                    r"ustoz kerak|ishchi izlayman|ish qidiryapman)", re.I)
MULTI_ROLE = re.compile(r"(bo['‘’]?sh ish o['‘’]?rinlari|вакантные места|"
                        r"свободные вакансии|quyidagi lavozimlar)", re.I)

CITIES = [
    ("Toshkent", r"toshkent|ташкент|tashkent"),
    ("Samarqand", r"samarqand|самарканд"),
    ("Buxoro", r"buxoro|бухар"),
    ("Andijon", r"andijon|андижан"),
    ("Farg'ona", r"farg['‘’]?ona|фергана"),
    ("Namangan", r"namangan|наманган"),
    ("Navoiy", r"navoiy|навои"),
    ("Qarshi", r"qarshi|карши"),
    ("Termiz", r"termiz|термез"),
    ("Urganch", r"urganch|ургенч"),
    ("Jizzax", r"jizzax|джизак"),
    ("Nukus", r"nukus|нукус"),
    ("Guliston", r"guliston|гулистан"),
    ("Xorazm", r"xorazm|хорезм"),
]
REMOTE = re.compile(r"masofa(viy|dan)|удал[её]нн|remote|onlayn ish|online ish", re.I)

EXPERIENCE = [
    ("intern", r"tajriba\s*(talab\s*qilinmaydi|shart\s*emas|yo['‘’]?q)|без\s*опыта|"
               r"o['‘’]?rgatamiz|talabalar ham|стажёр|stajyor|intern\b"),
    ("senior", r"\b(5|6|7|8|9|10)\+?\s*(yil|год|лет)|\bsenior\b|\blead\b|бош mutaxassis"),
    ("mid", r"\b([2-4])\+?\s*(yil|год|лет)|\bmiddle\b|\bmid\b|o['‘’]?rta darajadagi"),
]

PHONE = re.compile(r"\+?998[\s\-()]?\d{2}[\s\-()]?\d{3}[\s\-()]?\d{2}[\s\-()]?\d{2}")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
URL = re.compile(r"\[([^\]]*)\]\(([^)]*)\)|https?://\S+|t\.me/\S+|www\.\S+")

# headings that open a bullet list we can lift verbatim
REQ_HEAD = re.compile(r"(talab(lar)?|требовани|sizdan kutamiz|bizga kerak|kerakli)", re.I)
RESP_HEAD = re.compile(r"(vazifa(lar)?|majburiyat|обязанност|ish haqida|чем предстоит)", re.I)
BEN_HEAD = re.compile(r"(biz taklif|taklif qilamiz|мы предлагаем|sizga|shart(lar)?|условия)", re.I)


def strip_md(s: str) -> str:
    s = URL.sub(lambda m: m.group(1) or "", s)
    s = re.sub(r"[*_`]{1,3}", "", s)
    s = re.sub(r"#\S+", "", s)
    return s


def strip_emoji(s: str) -> str:
    out = []
    for ch in s:
        cat = unicodedata.category(ch)
        if cat in ("So", "Sk", "Cf") or ord(ch) in (0x2018, 0x2019) and False:
            continue
        out.append(ch)
    return "".join(out)


def clean_line(s: str) -> str:
    s = strip_emoji(strip_md(s))
    s = s.replace("’", "'").replace("‘", "'").replace("‚", "'")
    s = re.sub(r"^[\s\-–—•·▪◾◽✅❗️➡️✔️🔹]+", "", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s.strip(" .,:;-–—")


def lines_of(text: str):
    return [clean_line(l) for l in text.split("\n")]


def pick_title(text: str) -> str:
    """The first line that reads like a role, not a greeting or a banner."""
    for raw in lines_of(text):
        l = raw.strip()
        if len(l) < 4 or len(l) > 90:
            continue
        if re.fullmatch(r"[\W\d]+", l):
            continue
        if re.match(r"^(assalom|salom|hurmatli|diqqat|e['‘’]?tibor|внимание|друзья)", l, re.I):
            continue
        if PHONE.search(l) or l.lower().startswith(("telegram", "aloqa", "murojaat", "hudud", "manzil")):
            continue
        # "Xodim kerak:" is UstozShogird's post type, not the role
        if re.fullmatch(r"(xodim|ishchi) kerak:?", l, re.I):
            continue
        return l
    return ""


def role_from(text: str, headline: str) -> str:
    """A short role phrase, taken from the headline when possible, else the body."""
    for source in (headline, text):
        m = ROLE_RE.search(strip_emoji(strip_md(source)))
        if m:
            phrase = re.sub(r"\s+", " ", m.group(1)).strip(" .,:;-–—/")
            # trim leading filler the window may have caught
            phrase = re.sub(r"^(biz|bizga|bizning|kerak|ishga|jamoaga|yangi|zarur|"
                            r"talab qilinadi|требуется|ищем)\s+", "", phrase, flags=re.I)
            if 3 <= len(phrase) <= 70:
                return phrase
    return ""


# Post headlines sell ("Стань частью команды мечты", "Возможно, наша будущая
# beauty-звёздочка — это ты"). None of that names the job, so the title always
# comes from the role phrase; a post with no recognisable role is skipped rather
# than listed under a slogan.
LEAD_IN = re.compile(
    r"^(вакансия|вакансии|требуется|требуются|ищем|ищет|мы ищем|приглашаем|"
    r"приглашает|открыт набор|набор|срочно|в команду|на работу|нужен|нужна|"
    r"kerak|zarur|talab qilinadi|ishga)\b[\s:—–-]*", re.I)

# «NAVBAHOR APTEKA» / "Zon.uz ищет" / "BIOTACT DEUTSCHLAND ищет"
COMPANY_QUOTED = re.compile(r"[«\"“]([^»\"”]{2,40})[»\"”]")
COMPANY_BEFORE_VERB = re.compile(
    r"\b([A-ZА-Я][\w&.\-']{1,24}(?:\s+[A-ZА-Я0-9][\w&.\-']{1,24}){0,3})\s+"
    r"(?:ищет|приглашает|расширяет|набирает|требуется)", re.U)


# The quoted-phrase heuristic also catches asides ("по прайсу", "а когда
# выплата?") and place names ("в Узбекистане"), which must not be printed as an
# employer — the title is what a candidate reads first.
# A place or a sentence fragment is not an employer. Case matters for the
# "all lowercase" test — an aside reads as prose, a name is capitalised — so
# that one is kept in its own case-sensitive pattern.
NOT_A_COMPANY = re.compile(
    r"^(?:по|в|на|а|и|с|от|до|за|для|уз|руз|узбекистан\w*|ташкент\w*|toshkent|"
    r"o['’`]?zbekiston\w*|компани\w*|фирм\w*)\b|[?!]", re.I)
ALL_LOWERCASE = re.compile(r"^[a-zа-яё\s'-]+$")


def find_company(text: str) -> str:
    head = strip_emoji(strip_md(text))[:400]
    for rx in (COMPANY_QUOTED, COMPANY_BEFORE_VERB):
        m = rx.search(head)
        if m:
            name = re.sub(r"\s+", " ", m.group(1)).strip(" .,:;-")
            if (2 <= len(name) <= 40 and not LEAD_IN.match(name)
                    and not NOT_A_COMPANY.search(name)
                    and not ALL_LOWERCASE.match(name)
                    and re.search(r"[A-ZА-Я]", name)):
                return name
    return ""


def normalise_title(t: str) -> str:
    t = re.sub(r"\s+", " ", t).strip(" !.,:;-")
    # Post headlines shout; the site does not.
    if t.isupper() or (sum(c.isupper() for c in t if c.isalpha()) >
                       0.7 * max(1, sum(c.isalpha() for c in t))):
        t = t.capitalize()
    return t[:180]


def find_city(text: str):
    for name, pat in CITIES:
        if re.search(pat, text, re.I):
            return name
    return ""


def find_salary(text: str):
    """Only what the post states. Returns (min, max) in so'm, or (None, None)."""
    t = text.replace(" ", " ")
    # "4.000.000 - 8.000.000" / "4 000 000-8 000 000"
    m = re.search(r"(\d{1,3}(?:[ .,]\d{3}){1,3})\s*[-–—]\s*(\d{1,3}(?:[ .,]\d{3}){1,3})", t)
    if m:
        a = int(re.sub(r"\D", "", m.group(1)))
        b = int(re.sub(r"\D", "", m.group(2)))
        if 300_000 <= a <= b <= 100_000_000:
            return a, b
    # "4 000 000 so'mdan 10 000 000 gacha" / "от 4 000 000 до 10 000 000"
    m = re.search(r"(\d{1,3}(?:[ .,]\d{3}){1,3})\s*(?:so['‘’]?m|сум)?\s*"
                  r"(?:dan|gacha|до|от)\D{0,12}?(\d{1,3}(?:[ .,]\d{3}){1,3})", t, re.I)
    if m:
        a = int(re.sub(r"\D", "", m.group(1)))
        b = int(re.sub(r"\D", "", m.group(2)))
        if 300_000 <= a <= b <= 100_000_000:
            return a, b
    # "4–12 mln so'm"
    m = re.search(r"(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*(mln|млн|million)", t, re.I)
    if m:
        a, b = int(m.group(1)) * 1_000_000, int(m.group(2)) * 1_000_000
        if a <= b <= 100_000_000:
            return a, b
    # a single figure
    m = re.search(r"(\d{1,3}(?:[ .,]\d{3}){1,3})\s*(so['‘’]?m|sum|сум|uzs)", t, re.I)
    if m:
        a = int(re.sub(r"\D", "", m.group(1)))
        if 300_000 <= a <= 100_000_000:
            return a, None
    m = re.search(r"(\d{1,3})\s*(mln|млн)\s*(so['‘’]?m|сум)?", t, re.I)
    if m:
        a = int(m.group(1)) * 1_000_000
        if 300_000 <= a <= 100_000_000:
            return a, None
    return None, None


def find_experience(text: str, title: str = "") -> str:
    # The title names the level when it has one ("Junior Django-разработчик");
    # the body often mentions other levels in passing.
    if re.search(r"\b(junior|jun\.)\b", title, re.I):
        return "junior"
    if re.search(r"\b(senior|lead|head)\b", title, re.I):
        return "senior"
    if re.search(r"\b(middle|mid)\b", title, re.I):
        return "mid"
    for level, pat in EXPERIENCE:
        if re.search(pat, text, re.I):
            return level
    return "junior"


def section(text: str, head_re) -> list:
    """Bullet lines that follow a heading, verbatim, until the list stops."""
    out, collecting = [], False
    for raw in text.split("\n"):
        l = clean_line(raw)
        if not l:
            if collecting and out:
                break
            continue
        is_head = head_re.search(l) and len(l) < 60
        if is_head:
            collecting = True
            continue
        if collecting:
            # another heading ends this list
            if re.search(r":$", l) and len(l) < 60:
                break
            if PHONE.search(l) or EMAIL.search(l) or l.lower().startswith(("telegram", "aloqa", "murojaat")):
                break
            if 3 < len(l) <= 160:
                out.append(l)
            if len(out) >= 8:
                break
    return out


def build_description(text: str, title: str) -> str:
    keep = []
    for raw in text.split("\n"):
        l = clean_line(raw)
        if not l or l == title:
            continue
        if PHONE.search(l) or EMAIL.search(l):
            continue
        if re.match(r"^(telegram|aloqa|murojaat|bog['‘’]?lanish|контакт|связь)\b", l, re.I):
            continue
        if re.search(r"(kanal|канал|obuna|подпис|ulanish)", l, re.I) and len(l) < 70:
            continue
        keep.append(l)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(keep)).strip()[:4000]


rows, skipped = [], {"seeker": 0, "multi": 0, "no_title": 0, "short": 0}
for p in posts:
    text = p["text"]
    if p["channel"] in NEWS_CHANNELS or not HIRING.search(text):
        skipped["not_hiring"] = skipped.get("not_hiring", 0) + 1
        continue
    if SEEKER.search(text):
        skipped["seeker"] += 1
        continue
    if MULTI_ROLE.search(text):
        skipped["multi"] += 1
        continue
    headline = pick_title(text)
    role = role_name(strip_emoji(strip_md(text)))
    if not role:
        skipped["no_role"] = skipped.get("no_role", 0) + 1
        continue
    title = normalise_title(role)
    company = find_company(text)
    if company and company.lower() not in title.lower():
        title = f"{title} ({company})"
    if len(title) < 5 or len(title) > 80:
        skipped["no_title"] += 1
        continue
    desc = build_description(text, title)
    if len(desc) < 120:
        skipped["short"] += 1
        continue
    smin, smax = find_salary(text)
    rows.append({
        "channel": p["channel"], "msg_id": p["msg_id"], "date": p["date"],
        "title": title, "company": company,
        "description": desc,
        "requirements": section(text, REQ_HEAD),
        "responsibilities": section(text, RESP_HEAD),
        "benefits": section(text, BEN_HEAD),
        "salary_min": smin, "salary_max": smax,
        "city": find_city(text),
        "is_remote": bool(REMOTE.search(text)),
        "experience_level": find_experience(text, title),
        "phones": p["phones"], "emails": p["emails"], "handles": p["handles"],
    })

json.dump(rows, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"tayyor: {len(rows)}   tashlab yuborildi: {skipped}")
print(f"  maoshi bor: {sum(1 for r in rows if r['salary_min'])}")
print(f"  shahri bor: {sum(1 for r in rows if r['city'])}")
print(f"  talablari bor: {sum(1 for r in rows if r['requirements'])}")
