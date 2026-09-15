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
    (r"(sotuv|savdo|сотув|савдо)\s+менежер\w*|(sotuv|savdo)\s+menejer\w*|"
     r"менеджер\s+по\s+продажам|sales\s+manager",
     "Sotuv menejeri", "Менеджер по продажам"),
    (r"(sotuv|savdo|сотув|савдо)\s+операторы?|(sotuv|savdo)\s+operator\w*|"
     r"оператор\s+продаж",
     "Sotuv operatori", "Оператор продаж"),
    (r"(savdo|sotuv)\s+(agenti|vakili)|(савдо|сотув)\s+агент\w*|"
     r"торгов\w+\s+представител\w+|агент\s+прямых\s+продаж",
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
    (r"o['’`]?qituvchi|преподавател\w+|учител\w+|педагог\w*|repetitor|репетитор|"
     r"o['’`]?quv markazi|мактаб|maktabga",
     "O'qituvchi", "Преподаватель"),
    (r"hr[\s-]*(menejer|менеджер|mutaxassis|специалист)|rekruter|рекрутер|recruiter",
     "HR menejer", "HR-менеджер"),
    (r"hamshira|медсестр\w+", "Hamshira", "Медсестра"),
    (r"shifokor|врач", "Shifokor", "Врач"),
    (r"provizor|фармацевт|farmatsevt", "Farmatsevt", "Фармацевт"),
    # The role, not the noun: texnolog/технолог but NOT texnologiya,
    # технология, технологий, технологии — "Стек технологий" and "Учитель
    # информационных технологий" were both being titled as technologists.
    # The role declines (texnologi, texnologlar, технолога, технологи); the
    # NOUN always continues with iya/ik or "и"+vowel (texnologiya,
    # технология/технологий/технологический). Blocking exactly those keeps
    # "Ishlab chiqarish texnologi" while refusing "Стек технологий".
    (r"\btexnolog(?!iya|ik)|\bтехнолог(?!и[яийче])", "Texnolog", "Технолог"),
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
    (r"sotuvchi|сотувчи|продавец", "Sotuvchi", "Продавец"),
    (r"menejer|менеджер|manager", "Menejer", "Менеджер"),
    # More specific than the bare `engineer` below, so it must come first.
    (r"(software|backend|frontend|fullstack|full[- ]stack|data|ml|ai|devops|qa|"
     r"mobile|cloud|platform)\s*engineer", "Dasturchi", "Разработчик"),
    (r"muhandis|инженер|\bengineer\b", "Muhandis", "Инженер"),
    (r"analitik|аналитик|analyst", "Analitik", "Аналитик"),
    (r"mobilograf|мобилограф", "Mobilograf", "Мобилограф"),
    (r"montajchi|монтажёр|видеомонтаж", "Video montajchi", "Видеомонтажёр"),
    (r"kopirayter|копирайтер|copywriter", "Kopirayter", "Копирайтер"),

    # --- trades and services the source channels are full of -----------------
    # These were the biggest single loss: 38 posts a fortnight dropped for
    # "no recognised role" turned out to be real jobs whose titles simply were
    # not in this list — and most were written in Cyrillic Uzbek, which is
    # neither the Latin spelling nor the Russian one.
    (r"tikuvchi|тикувчи|швея|швеи|портной|tikuv sex",
     "Tikuvchi", "Швея"),
    (r"bichuvchi|бичувчи|закройщик", "Bichuvchi", "Закройщик"),
    (r"gruming|грумер|grumer", "Grumer", "Грумер"),
    (r"gornichnaya|горничн|mehmonxona xizmatchisi|xizmatchi ayol",
     "Mehmonxona xizmatchisi", "Горничная"),
    (r"tarbiyachi|тарбиячи|воспитател|nanny|enaga",
     "Tarbiyachi", "Воспитатель"),
    (r"manikyur|маникюр|ногтев\w+|pedikyur|педикюр|\blash\s*(maker|ustasi)|"
     r"наращивание ресниц|kiprik\s*(ustasi|qo)",
     "Manikyur ustasi", "Мастер маникюра"),
    (r"kosmetolog|косметолог|vizajist|визажист", "Kosmetolog", "Косметолог"),
    (r"sartarosh|сартарош|парикмахер|barber", "Sartarosh", "Парикмахер"),
    (r"massajchi|массажист|massaj ustasi", "Massajchi", "Массажист"),
    (r"poligrafi|полиграфи|bosmaxona|типограф",
     "Poligrafiya xodimi", "Работник полиграфии"),
    (r"elektrik\w*\s*(usta|bo['‘’]?yicha)|электрик|elektr montaj",
     "Elektrik", "Электрик"),
    (r"payvandchi|сварщик|svarshik", "Payvandchi", "Сварщик"),
    (r"santexnik|сантехник", "Santexnik", "Сантехник"),
    (r"tozalik xodim|тозалик ходим|уборщи|farrosh|фаррош",
     "Tozalik xodimi", "Уборщик"),
    (r"qadoqlovchi|қадоқлаш|qadoqlash|упаковщи|фасовщи",
     "Qadoqlovchi", "Упаковщик"),
    (r"presslovchi|прессловчи|пресс operator", "Presslovchi", "Прессовщик"),
    (r"tikuvchi yordamchisi|ёрдамчи тикувчи", "Tikuvchi yordamchisi", "Помощник швеи"),
]
COMPILED = [(re.compile(p, re.I), uz, ru) for p, uz, ru in ROLES]


# Letters and words that appear in Uzbek-in-Cyrillic but not in Russian. A
# post can be mostly Cyrillic and still be Uzbek — "МАЛАКАЛИ ТИКУВЧИ" was
# getting a Russian job title.
_UZBEK_CYRILLIC = re.compile(
    r"[ўқғҳ]|\b(ва|учун|керак|ишга|иш|маош|ойлик|талаб|таклиф|бўйича|"
    r"ходим|ходимлар|шахри|шахардан|шаҳар\w*|вилояти|сўм|қилинади|этилади|"
    r"бизга|сизни|сотув\w*|савдо|тикувчи|ёрдамчи|тозалик|хизмат\w*)\b", re.I)


# What a technology stack implies about the job. Template posts state the stack
# and leave the title as "Xodim kerak", so this is the only role signal they
# carry — and it is a strong one: "Python, Django, PostgreSQL" is a backend
# developer whatever the headline says.
#
# Ordered most specific first, and deliberately short: a stack that does not
# clearly name a discipline is better left unnamed than guessed.
STACK_ROLES = [
    (r"\b(figma|adobe xd|ui design|ux design|wireframing|photoshop|illustrator|"
     r"corel|indesign)\b", "Dizayner", "Дизайнер"),
    (r"\b(flutter|dart|swift|kotlin|react native|android studio|jetpack)\b",
     "Mobil ilova dasturchisi", "Мобильный разработчик"),
    (r"\b(kubernetes|k8s|terraform|helm|ansible|jenkins|gitlab ci|docker swarm|"
     r"devops)\b", "DevOps muhandisi", "DevOps-инженер"),
    (r"\b(pytorch|tensorflow|machine learning|deep learning|ml|nlp|"
     r"prompt engineering|fine-?tuning|langchain)\b",
     "AI/ML muhandisi", "AI/ML-инженер"),
    (r"\b(selenium|mannual tester|manual test|test case|qa automation|postman)\b",
     "QA muhandisi", "QA-инженер"),
    (r"\b(arduino|stm32|esp32|robototexnika|robotatexnima|embedded|"
     r"mikrokontroller)\b|\bc\+\+.*\b(arduino|robot)", "Embedded dasturchi",
     "Embedded-разработчик"),
    (r"\b(lego|wedo|scratch|kodlash asoslari)\b",
     "Robototexnika o'qituvchisi", "Преподаватель робототехники"),
    (r"\b(kiberxavfsizlik|cyber ?security|penetration|pentest)\b",
     "Kiberxavfsizlik mutaxassisi", "Специалист по кибербезопасности"),
    (r"\b(react|vue|angular|next\.?js|typescript|tailwind)\b(?!.*\b(node|django|"
     r"laravel|spring)\b)", "Frontend dasturchi", "Frontend-разработчик"),
    (r"\b(django|fastapi|laravel|yii2|spring boot|nestjs|node\.?js|express|"
     r"postgresql|mysql|\.net|asp\.net)\b", "Backend dasturchi", "Backend-разработчик"),
    (r"\b(html|css|javascript|js)\b", "Veb-dasturchi", "Веб-разработчик"),
    (r"\b(python|java|golang|php|ruby)\b|\bc\+\+|\bc#|\bc\s*sharp",
     "Dasturchi", "Разработчик"),
    (r"\b(microsoft word|microsoft excel|excel|word|1c)\b",
     "Ofis xodimi", "Офисный работник"),
]
_STACK = [(re.compile(p, re.I), uz, ru) for p, uz, ru in STACK_ROLES]


def role_from_stack(stack_text: str):
    """Role implied by a technology list, or "" when it names no discipline."""
    ru = is_russian(stack_text)
    for rx, uz_name, ru_name in _STACK:
        if rx.search(stack_text):
            return ru_name if ru else uz_name
    return ""


def is_russian(text: str) -> bool:
    """Russian, as opposed to Uzbek — in either script."""
    cyr = sum(1 for ch in text if "Ѐ" <= ch <= "ӿ")
    lat = sum(1 for ch in text if ch.isascii() and ch.isalpha())
    if cyr <= lat:
        return False
    # Cyrillic-heavy, so now: Russian, or Uzbek written in Cyrillic?
    return not _UZBEK_CYRILLIC.search(text)


def role_name(text: str):
    """Canonical role for this post, or "" when it names no role we know."""
    ru = is_russian(text)
    for rx, uz_name, ru_name in COMPILED:
        if rx.search(text):
            return ru_name if ru else uz_name
    return ""
