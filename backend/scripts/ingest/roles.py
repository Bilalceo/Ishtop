"""Canonical role names.

The earlier attempt cut a phrase out of the post with a character window, which
sliced words in half ("ьство КНР в РУз требуется охранник", "qarish fabrikasi
MALAKALI DIZAYNER"). A vacancy title has to be a job name, so match the role
against a fixed list and print its canonical name instead — in the language the
post is written in, since these channels mix Uzbek and Russian.

Ordered longest/most specific first; the first match wins.
"""
import re

# (pattern, uzbek name, russian name)
ROLES = [
    (r"sotuv(chi)?[\s-]*konsultant|продавец[\s-]*консультант",
     "Sotuvchi-konsultant", "Продавец-консультант"),
    (r"menejer(i)?\s+yordamchisi|помощник\s+менеджера",
     "Sotuv menejeri yordamchisi", "Помощник менеджера"),
    (r"call[\s-]?(centr|center|центр)\w*\s*(operator\w*)?|оператор\s+call",
     "Call-markaz operatori", "Оператор call-центра"),
    (r"(sotuv|savdo)\s+menejer\w*|менеджер\s+по\s+продажам|sales\s+manager",
     "Sotuv menejeri", "Менеджер по продажам"),
    (r"(sotuv|savdo)\s+operator\w*|оператор\s+продаж",
     "Sotuv operatori", "Оператор продаж"),
    (r"(savdo|sotuv)\s+(agenti|vakili)|торгов\w+\s+представител\w+|агент\s+прямых\s+продаж",
     "Savdo vakili", "Торговый представитель"),
    (r"помощник\s+бухгалтера|buxgalter\s+yordamchisi|младший\s+бухгалтер",
     "Buxgalter yordamchisi", "Помощник бухгалтера"),
    (r"bosh\s+buxgalter|главный\s+бухгалтер", "Bosh buxgalter", "Главный бухгалтер"),
    (r"buxgalter|бухгалтер", "Buxgalter", "Бухгалтер"),
    (r"smm[\s-]*(menejer|менеджер|mutaxassis|специалист)\w*|smm\b",
     "SMM mutaxassisi", "SMM-менеджер"),
    (r"targetolog|таргетолог", "Targetolog", "Таргетолог"),
    (r"marketolog|маркетолог|маркетинг\w*\s+специалист",
     "Marketolog", "Маркетолог"),
    (r"(ui/?ux|веб|web)[\s-]*(дизайнер|dizayner)|dizayner|дизайнер|designer",
     "Dizayner", "Дизайнер"),
    (r"backend\s*(developer|dasturchi|разработчик)?",
     "Backend dasturchi", "Backend-разработчик"),
    (r"frontend\s*(developer|dasturchi|разработчик)?",
     "Frontend dasturchi", "Frontend-разработчик"),
    (r"full[\s-]?stack\s*(developer|dasturchi|разработчик)?",
     "Full stack dasturchi", "Full stack разработчик"),
    (r"(mobil|mobile|flutter|android|ios)\s*(developer|dasturchi|разработчик)",
     "Mobil ilova dasturchisi", "Мобильный разработчик"),
    (r"(python|django|php|laravel|golang|java|react)\s*[\w-]*\s*(developer|dasturchi|разработчик)",
     "Dasturchi", "Разработчик"),
    (r"devops", "DevOps muhandisi", "DevOps-инженер"),
    (r"\bqa\b|тестировщик|tester", "QA muhandisi", "QA-инженер"),
    (r"(dastur|про?грамм)\w*\s*(chi|ист)", "Dasturchi", "Программист"),
    (r"kuryer|курьер", "Kuryer", "Курьер"),
    (r"haydovchi|водител\w+", "Haydovchi", "Водитель"),
    (r"погрузчик", "Yuk ortish texnikasi haydovchisi", "Водитель погрузчика"),
    (r"omborchi|ombor\s+mudiri|кладовщик|заведующ\w+\s+складом",
     "Omborchi", "Кладовщик"),
    (r"(oshpaz|повар)\s*(горячего\s+цеха)?", "Oshpaz", "Повар"),
    (r"ofitsiant|официант", "Ofitsiant", "Официант"),
    (r"barmen|бармен", "Barmen", "Бармен"),
    (r"farrosh|уборщи\w+", "Farrosh", "Уборщик"),
    (r"qo['’`]?riqchi|охранник", "Qo'riqchi", "Охранник"),
    (r"promouter|промоутер", "Promouter", "Промоутер"),
    (r"kassir|кассир", "Kassir", "Кассир"),
    (r"administrator|админист\w+|\badmin\b", "Administrator", "Администратор"),
    (r"o['’`]?qituvchi|преподавател\w+|repetitor|репетитор",
     "O'qituvchi", "Преподаватель"),
    (r"hr[\s-]*(menejer|менеджер|mutaxassis|специалист)|rekruter|рекрутер|recruiter",
     "HR menejer", "HR-менеджер"),
    (r"hamshira|медсестр\w+", "Hamshira", "Медсестра"),
    (r"shifokor|врач", "Shifokor", "Врач"),
    (r"provizor|фармацевт|farmatsevt", "Farmatsevt", "Фармацевт"),
    (r"texnolog|технолог", "Texnolog", "Технолог"),
    (r"upakovsh\w+|упаковщи\w+|qadoqlovchi", "Qadoqlovchi", "Упаковщик"),
    (r"rezchik|резчик", "Kesuvchi", "Резчик"),
    (r"chertyojchi|чертёжник|чертежник", "Chizmachi", "Чертёжник"),
    (r"supervayzer|супервайзер", "Supervayzer", "Супервайзер"),
    (r"brigadir|бригадир", "Brigadir", "Бригадир"),
    (r"logist|логист", "Logist", "Логист"),
    (r"kotib|секретар\w+", "Kotib", "Секретарь"),
    (r"assistent|ассистент|yordamchi\b|помощник\b", "Yordamchi", "Помощник"),
    (r"konsultant|консультант", "Konsultant", "Консультант"),
    (r"operator|оператор", "Operator", "Оператор"),
    (r"sotuvchi|продавец", "Sotuvchi", "Продавец"),
    (r"menejer|менеджер|manager", "Menejer", "Менеджер"),
    (r"muhandis|инженер|engineer", "Muhandis", "Инженер"),
    (r"analitik|аналитик|analyst", "Analitik", "Аналитик"),
    (r"mobilograf|мобилограф", "Mobilograf", "Мобилограф"),
    (r"montajchi|монтажёр|видеомонтаж", "Video montajchi", "Видеомонтажёр"),
    (r"kopirayter|копирайтер|copywriter", "Kopirayter", "Копирайтер"),
]
COMPILED = [(re.compile(p, re.I), uz, ru) for p, uz, ru in ROLES]


def is_russian(text: str) -> bool:
    cyr = sum(1 for ch in text if "Ѐ" <= ch <= "ӿ")
    lat = sum(1 for ch in text if ch.isascii() and ch.isalpha())
    return cyr > lat


def role_name(text: str):
    """Canonical role for this post, or "" when it names no role we know."""
    ru = is_russian(text)
    for rx, uz_name, ru_name in COMPILED:
        if rx.search(text):
            return ru_name if ru else uz_name
    return ""
