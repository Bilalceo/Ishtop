"""IshTop job -> category (soha) classifier — keyword based.

The Job table has no `category` column and its `profession_slug` is noisy /
often empty (≈45% of aggregated jobs), so the Telegram catalog groups jobs by
running this cheap keyword classifier over each job's title (+ optional extra
text). Validated on 224 live jobs: only 1 fell through to 'other'.

Shared taxonomy: the bot uses it today; the website can reuse it later.

classify_job(title, extra="") -> category id (always returns one; 'other' fallback).
"""
from __future__ import annotations
import re

# id, emoji, uz label, keyword patterns (matched as word-ish substrings, lowercased,
# both latin & common russian variants). Order matters: first match wins, so put
# the more specific / higher-signal categories BEFORE the broad ones (savdo/boshqa).
CATEGORIES = [
    ("it",        "💻", "IT · Dasturlash", [
        "developer","dasturchi","programmer","programmist","dasturlash","frontend","backend",
        "full stack","fullstack","full-stack","devops","qa engineer","qa tester","tester","tester",
        "1c","1с","flutter","android","kotlin","react","vue","php","python","java","golang","node",
        "ai ","sun'iy intellekt","suniy intellekt","machine learning","ml ","data scientist","data analyst",
        "sysadmin","system administrator","tizim administrator","dba","database administrator",
        "it-mutaxassis","it mutaxassis","it menejer","it-menejer","it specialist","ux","ui/ux","seo",
        "telefon-programmist","telefon programmist","integrator","technical support engineer","support engineer",
        "product manager","prodaktolog","продакт","solution architect","system architect","scrum","product owner",
    ]),
    ("finance",   "📊", "Buxgalteriya · Moliya", [
        "buxgalter","buxgalteriya","hisobchi","bugalter","бухгалтер","moliyachi","moliya","finansist",
        "ekonomist","iqtisodchi","auditor","kassir-buxgalter","moddiy buxgalter","glavbux",
    ]),
    ("food",      "🍽", "Ovqatlanish · HoReCa", [
        "oshpaz","shef","povar","повар","ofitsiant","официант","waiter","konditer","кондитер","baker","novvoy",
        "restoran","kafe","bar ","barmen","бармен","oshxona","qassob","salatchi","posuda","kuxnya","fastfood","burger",
        "shashlik","shashlikchi","universal","hostes",
    ]),
    ("engineering","🏭", "Ishlab chiqarish · Muhandislik", [
        "muhandis","injener","инженер","engineer","prorab","прораб","stanok","станок","operator stanok",
        "elektronik","elektrik","электрик","montaj","montajchi","mexanik","механик","texnolog","технолог",
        "ishlab chiqarish","proizvodstvo","zavod","fabrika","svarshik","payvandchi",
        "qoliplovchi","формовщик","qolip","liteyshik","frezerovshik","tokar","токарь",
    ]),
    ("marketing", "🎨", "Marketing · Dizayn", [
        "marketing","marketolog","маркетолог","smm","targetolog","таргетолог","dizayn","dizayner","дизайн","designer",
        "grafik dizayn","videograf","видеограф","mobilograf","montajchi video","video montaj","kontent","content maker",
        "kreativ","brand","reklama","copywriter","kopirayter","3d","animator","fotograf","vizualizator",
    ]),
    ("call",      "📞", "Call-markaz · Operator", [
        "call","колл","call-markaz","call markaz","call-center","call center","operator-konsultant","dispetcher","диспетчер",
        "operator (","operator, ","telemarketing","kontakt markaz",
    ]),
    ("logistics", "🚚", "Logistika · Transport", [
        "kuryer","kurer","курьер","courier","haydovchi","хайдовчи","voditel","водитель","driver","yuk tashuvchi",
        "yetkazib beruvchi","ekspeditor","экспедитор","ombor","склад","logist","логист","logistika","gruzchik","yuk ortuvchi",
    ]),
    ("construction","🏗", "Qurilish · Ta'mirlash", [
        "quruvchi","qurilish","стройка","santexnik","сантехник","payvandchi","сварщик","usta ","malyar","shtukatur",
        "beton","g'isht teruvchi","otdelka","remont","ta'mirlash","plitkachi","gipsokarton",
    ]),
    ("education", "📚", "Ta'lim", [
        "o'qituvchi","oqituvchi","ustoz","teacher","репетитор","repetitor","murabbiy","tutor","tarbiyachi","воспитатель",
        "pedagog","педагог","mentor","trener","тренер","instruktor","ustaz","преподаватель","prepodavatel","o'qituvchisi",
    ]),
    ("medicine",  "🏥", "Tibbiyot · Go'zallik", [
        "hamshira","медсестра","shifokor","vrach","врач","doktor","kosmetolog","косметолог","stomatolog","стоматолог",
        "massajist","массажист","farmatsevt","фармацевт","laborant","pediatr","kosmetolog yordamchisi","salon",
        "sartarosh","парикмахер","manikur","маникюр","brovist","vizajist","apteka",
        "logoped","defektolog","terapist","терапист","psixolog","психолог","aba terapist","reabilitolog",
    ]),
    ("sales",     "🛒", "Savdo · Xizmat", [
        "sotuvchi","sotuv","savdo","продавец","продаж","konsultant","консультант","kassir","кассир","menejer",
        "менеджер","supervayzer","супервайзер","agent","агент","merchandayzer","administrator",
        "администратор","xizmat","ресепшн","resepshn","reception","assistent","yordamchi","hr ","rekruter","рекрутер","ambassador",
        "tovaroved","товаровед","realizator",
        "sales","supervisor","promouter","промоутер","promoter","tozalik","tozalovchi","farrosh","gornichnaya",
        "уборщиц","уборка","parkovka","парковка","xonalar tozalovchisi","klining","cleaning","kotib","sekretar","секретарь",
    ]),
]
CAT_BY_ID = {c[0]: c for c in CATEGORIES}
OTHER = ("other", "📁", "Boshqa", [])


def _norm(s: str) -> str:
    s = (s or "").lower().replace("ʼ", "'").replace("`", "'").replace("’", "'")
    return re.sub(r"\s+", " ", s)


def classify_job(title: str, extra: str = "") -> str:
    """Return a category id. First matching category wins; 'other' if none."""
    hay = _norm(title) + " || " + _norm(extra)
    for cid, _emoji, _label, kws in CATEGORIES:
        for kw in kws:
            if kw in hay:
                return cid
    return "other"


def category_meta(cid: str):
    c = CAT_BY_ID.get(cid, OTHER)
    return {"id": c[0], "emoji": c[1], "label": c[2]}


ALL_IDS = [c[0] for c in CATEGORIES] + ["other"]


# =============================================================================
# CITY (shahar) classifier — same story as categories: the city_slug column is
# ~50% empty and split across variants (tashkent / toshkent-shahri / ...), so we
# normalize the free-text `location` field instead. classify_city(location) ->
# city id. Remote is checked first; Tashkent district names fold into 'toshkent'.
# =============================================================================
CITIES = [
    ("remote",   "🌐", "Masofaviy (Remote)", [
        "masofaviy","remote","удал","удалён","удаленн","onlayn","online","онлайн","distant","gibrid","hybrid",
    ]),
    ("toshkent", "🏙", "Toshkent", [
        "toshkent","tashkent","ташкент","тошкент","chilanzar","chilonzor","чиланзар","yunusobod","юнусабад",
        "sergeli","сергели","yashnobod","яшнабад","olmazor","алмазар","bektemir","mirzo ulug","yalangoch",
        "quyliq","куйлюк","minor","минор","olmaliq","алмалык","boka","бука","yangihayot","chirchiq","чирчик",
        "yunusabad","mirobod","shayxontohur","uchtepa","yakkasaroy","qibray","кибрай","bog'ishamol","богишамол",
        "alayskiy","алайск","zulfiya","зульфия","binokor","бинокор",
    ]),
    ("samarqand","🕌", "Samarqand", ["samarqand","samarkand","самарканд"]),
    ("fargona",  "🌄", "Farg'ona", ["farg'ona","fargona","fergana","фергана","ферган"]),
    ("qoqon",    "🏘", "Qo'qon", ["qo'qon","qoqon","kokand","коканд","қўқон"]),
    ("namangan", "🏞", "Namangan", ["namangan","наманган"]),
    ("andijon",  "🌅", "Andijon", ["andijon","andijan","андижан","андижон"]),
    ("buxoro",   "🕌", "Buxoro", ["buxoro","bukhara","бухара","бухоро"]),
    ("navoiy",   "⛏", "Navoiy", ["navoiy","navoi","навои","навоий"]),
    ("qarshi",   "🏜", "Qarshi · Qashqadaryo", ["qarshi","karshi","карши","qashqadaryo","кашкадар"]),
    ("termiz",   "☀️", "Termiz · Surxondaryo", ["termiz","termez","термез","surxondaryo","сурхандар"]),
    ("urganch",  "🏝", "Urganch · Xorazm", ["urganch","urgench","ургенч","xorazm","khorezm","хорезм","xiva","khiva","хива"]),
    ("jizzax",   "🌾", "Jizzax", ["jizzax","jizzakh","джизак"]),
    ("guliston", "🌱", "Guliston · Sirdaryo", ["guliston","gulistan","гулистан","sirdaryo","сырдар"]),
    ("nukus",    "🏔", "Nukus · Qoraqalpog'iston", ["nukus","нукус","qoraqalpog","каракалпак","karakalpak"]),
]
CITY_BY_ID = {c[0]: c for c in CITIES}
OTHER_CITY = ("other", "📍", "Boshqa hudud", [])


def classify_city(location: str) -> str:
    """Return a city id from a free-text location. 'other' if none match."""
    hay = _norm(location)
    if not hay.strip():
        return "other"
    for cid, _emoji, _label, kws in CITIES:
        for kw in kws:
            if kw in hay:
                return cid
    return "other"


def city_meta(cid: str):
    c = CITY_BY_ID.get(cid, OTHER_CITY)
    return {"id": c[0], "emoji": c[1], "label": c[2]}


ALL_CITY_IDS = [c[0] for c in CITIES] + ["other"]
