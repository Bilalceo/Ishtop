"""Text hygiene for imported posts: the source channel's boilerplate and handles,
and the site's language (Uzbek, Latin script).

Found on 2026-09-25 in the live listings: 117 descriptions still carried the
source channel's disclaimer ("…kanal ma'muriyati javob bermaydi!!!"), its social
links and its signature "@rabotauz" — a competitor's channel advertised on our
own pages — and 89 were in Russian on an Uzbek site.
"""
import re
SOURCE_HANDLES = {"rabotauz", "rabota_uz", "ustozshogird", "ishtopuz_rasmiy", "ishmi_ish", "itcloz", "p_rabota",
                  "django_jobs_board", "remocatedevs", "proglib_jobs", "forpython", "pythonpythonjobs", "jobfortm",
                  "runello_rus_python"}
BOILER = [
    r"e['‘’`]?lonlarning texnik holatiga.*javob bermaydi.*",
    r"ogohlik[\s\-–—]*davr talabi.*",
    r"shaxsiy ma['‘’`]?lumotingizni.*bermang.*",
    r"(instagram|telegram|facebook|youtube)(\s*[|•·,/]\s*(instagram|telegram|facebook|youtube))+\s*",
    r"xodim kerak[!.\s]*",
    r"@(" + "|".join(SOURCE_HANDLES) + r")\s*",
    r"канал не несет ответственност.*",
]
BOILER_RE = re.compile(r"^\s*(?:" + "|".join(BOILER) + r")$", re.I)
INLINE_SRC = re.compile(r"(?<![\w.])@(" + "|".join(SOURCE_HANDLES) + r")\b", re.I)

# An Uzbek post sometimes glosses a label in Russian — "Ish haqi: (Зарплата)".
# The post reads as Uzbek, so it skips translation, and the gloss lands on the
# site as the only Cyrillic on an otherwise Uzbek listing. A bracket whose
# whole content is Cyrillic carries nothing the Uzbek label has not said.
CYR_PARENS = re.compile(r"\s*\(\s*[А-Яа-яЁё][А-Яа-яЁё\s.,/-]*\)")


def clean_text(t):
    if not t: return t
    out = []
    for line in t.split("\n"):
        if BOILER_RE.match(line.strip()): continue
        line = INLINE_SRC.sub("", line).rstrip()
        line = CYR_PARENS.sub("", line).rstrip()
        out.append(line)
    s = "\n".join(out)
    s = re.sub(r"\n{3,}", "\n\n", s).strip()
    return s

def clean_list(xs):
    return [clean_text(x) for x in (xs or []) if clean_text(x) and not BOILER_RE.match(x.strip())]

UZ_CYR = re.compile(r"[ўқғҳЎҚҒҲ]")
# Uzbek written in Cyrillic often skips ў/қ/ғ/ҳ in quick posts ("керак", "маош"),
# so the letters alone misread it as Russian. Common words settle it.
UZ_WORDS = re.compile(r"(?<![а-яё])(ва|учун|билан|керак|ойлик|маош|бор|ёш|ёшдан|тажриба|талаблар|вазифалар|"
                      r"манзил|мурожаат|ишга|иш|таклиф|киламиз|қиламиз|булиши|бўлиши|шарт|гача|дан)(?![а-яё])", re.I)
RU_WORDS = re.compile(r"(?<![а-яё])(и|в|на|для|по|от|до|с|требуется|ищем|опыт|работы|зарплата|график|"
                      r"обязанности|требования|условия|мы|вы|не)(?![а-яё])", re.I)
def lang(t):
    t = t or ""; cyr = len(re.findall(r"[А-Яа-яЁёЎўҚқҒғҲҳ]", t)); lat = len(re.findall(r"[A-Za-z]", t))
    if cyr + lat < 5: return "-"
    if cyr > lat:
        if UZ_CYR.search(t): return "uz-cyr"
        return "uz-cyr" if len(UZ_WORDS.findall(t)) > len(RU_WORDS.findall(t)) else "ru"
    return "uz"

_MAP = {"а":"a","б":"b","в":"v","г":"g","д":"d","ж":"j","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n",
        "о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"x","ц":"s","ч":"ch","ш":"sh","щ":"sh","ъ":"'",
        "ы":"i","ь":"","э":"e","ю":"yu","я":"ya","ё":"yo","ў":"o'","қ":"q","ғ":"g'","ҳ":"h"}
VOW = set("аеёиоуэюяўАЕЁИОУЭЮЯЎ")
def translit(t):
    if not t: return t
    res = []
    for i, ch in enumerate(t):
        low = ch.lower()
        if low == "е":
            prev = t[i-1] if i else " "
            v = "ye" if (not prev.isalpha() or prev in VOW or prev in "ъьЪЬ") else "e"
        elif low in _MAP: v = _MAP[low]
        else: res.append(ch); continue
        if ch.isupper() and v:
            nxt = t[i+1] if i + 1 < len(t) else ""
            v = v.upper() if (nxt.isupper() and nxt.isalpha()) else v[0].upper() + v[1:]
        res.append(v)
    return "".join(res)
