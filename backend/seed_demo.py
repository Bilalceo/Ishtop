#!/usr/bin/env python3
"""
=============================================================================
IshTop / SmartCareer — Realistic Demo Seed (Uzbekistan mixed job market)
=============================================================================

Positioning:
    IshTop is an AI-career & job-matching platform for Uzbekistan students,
    graduates, junior specialists, interns and first-job seekers — NOT an
    IT-only board. This seed reflects the *real* local market: retail,
    delivery, education, fitness, food service, admin, finance, marketing,
    beauty AND a smaller slice of entry-level IT.

Design goals
------------
* IDEMPOTENT. Running it twice never duplicates rows (upsert by stable keys).
* SERVER-SAFE. Never wipes data unless ALLOW_DEMO_SEED_RESET=true.
* LOCALIZED. Every visible description carries Uzbek + Russian text
  (single DB text field, separated by "———").
* UZS salaries in realistic ranges for the Uzbek market.
* Preserves the canonical demo accounts used across the product/tests:
    Student : john@example.com   / Student123!
    Company : hr@epam.com        / Company123!
    Admin   : admin@ishtop.uz    / Admin123!

Usage
-----
    # Safe upsert (default) — adds/updates demo rows, never deletes:
    python seed_demo.py

    # Destructive reset then reseed (guarded):
    ALLOW_DEMO_SEED_RESET=true python seed_demo.py --reset
=============================================================================
"""

from __future__ import annotations

import hashlib
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, ".")

from app.config import settings
from app.models import (
    Application,
    ApplicationStatus,
    Job,
    JobStatus,
    Resume,
    User,
    UserRole,
)
from app.models.base import Base
from app.models.job import SavedJob
from app.models.notification import Notification
from app.models.user import AdminSubRole

engine = create_engine(str(settings.DATABASE_URL), echo=False)
SessionLocal = sessionmaker(bind=engine)

NOW = datetime.now(timezone.utc)

SEP = "\n\n———\n\n"


def rng_for(*parts) -> random.Random:
    """Deterministic RNG seeded by a stable string key.

    Uses hashlib (NOT built-in hash(), which is salted per-process) so the
    same key yields the same stream on every run → reproducible, idempotent
    selection that survives the early-return-on-existing-row code path.
    """
    key = ":".join(str(p) for p in parts)
    seed = int.from_bytes(hashlib.md5(key.encode()).digest()[:8], "big")
    return random.Random(seed)


def bi(uz: str, ru: str) -> str:
    """Combine Uzbek + Russian into one description field."""
    return f"{uz}{SEP}{ru}"


# Inline bilingual separator for short list items (requirements, skills, etc.)
SKILL_SEP = " · "

# UZ → RU dictionary for the recurring short phrases used in requirements,
# responsibilities, benefits, skills and résumé labels. Pure tech tokens
# (Python, SQL, Excel, Git, Figma, CRM, SMM …) intentionally have no entry and
# render once, unchanged, in both languages.
RU_TERMS: dict[str, str] = {
    # experience / generic
    "1+ yil tajriba": "опыт от 1 года", "2+ yil tajriba": "опыт от 2 лет",
    "3+ yil tajriba": "опыт от 3 лет", "Boshlang'ich tajriba": "начальный опыт",
    "Tajriba shart emas": "опыт не требуется", "Tajriba afzal": "опыт желателен",
    "Sertifikat afzal": "сертификат желателен", "Talaba/bitiruvchi": "студент/выпускник",
    "Talabalik mos keladi": "подходит студентам",
    # languages / basics
    "1C asoslari": "основы 1С", "1C bilan ishlash": "работа в 1С",
    "Python asoslari": "основы Python", "SQL asoslari": "основы SQL",
    "React asoslari": "основы React", "Figma asoslari": "основы Figma",
    "Dasturlash asoslari": "основы программирования", "Reklama asoslari": "основы рекламы",
    "Buxgalteriya asoslari": "основы бухучёта", "Canva/Figma asoslari": "основы Canva/Figma",
    "Montaj dasturlari asoslari": "основы программ монтажа",
    "Ingliz tili (Upper-Intermediate+)": "английский (Upper-Intermediate+)",
    "Ingliz tili IELTS 6.5+": "английский IELTS 6.5+",
    "O'zbek/rus tili": "узбекский/русский язык",
    "Uzbek/Russian communication": "общение на узбекском/русском",
    "Uzbek/Russian/English": "узбекский/русский/английский",
    "Yandex/Map usage": "использование Яндекс/карт",
    # soft skills
    "Mas'uliyat": "ответственность", "Diqqatlilik": "внимательность",
    "Aniqlik": "аккуратность", "Muloqot": "коммуникация",
    "Muloqot ko'nikmalari": "коммуникативные навыки", "Muloqotga ochiqlik": "открытость к общению",
    "Muomala madaniyati": "культура общения", "Jamoada ishlash": "работа в команде",
    "Tashkilotchilik": "организованность", "Rejalashtirish": "планирование",
    "Mantiqiy fikrlash": "логическое мышление", "Tahliliy fikrlash": "аналитическое мышление",
    "Ijodkorlik": "креативность", "Mustaqillik": "самостоятельность",
    "Stress-bardoshlik": "стрессоустойчивость", "Sabr-toqat": "терпение",
    "Xushmuomalalik": "вежливость", "Mehnatsevarlik": "трудолюбие",
    "Faollik": "активность", "Egiluvchanlik": "гибкость", "Ozodalik": "опрятность",
    "Tashqi ko'rinish": "опрятный внешний вид", "Tushunarli nutq": "грамотная речь",
    "Tushuntira olish": "умение объяснять", "Yozish qobiliyati": "навык письма",
    "Tez yozish": "быстрая печать", "Tezkorlik": "оперативность",
    "Punktuallik": "пунктуальность", "Jismoniy chidamlilik": "физическая выносливость",
    "Kompyuterni bilish": "знание компьютера", "Boshqaruv": "управление",
    "O'rganishga tayyorlik": "готовность учиться", "O'rganishga ishtiyoq": "желание учиться",
    # interests / domain knowledge
    "Savdoga qiziqish": "интерес к продажам", "Savdo qiziqishi": "интерес к продажам",
    "Sportga qiziqish": "интерес к спорту", "Tahlilga qiziqish": "интерес к аналитике",
    "Texnikaga qiziqish": "интерес к технике",
    "Tibbiyot/kosmetologiyaga qiziqish": "интерес к медицине/косметологии",
    "Yoga/Pilatesga qiziqish": "интерес к йоге/пилатесу",
    "Marketing bilimi": "знание маркетинга", "Fan bo'yicha bilim": "знание предмета",
    "Matematika bo'yicha kuchli bilim": "сильные знания математики",
    "Sport sohasini bilish": "знание сферы спорта", "Sport tayyorgarligi": "спортивная подготовка",
    "Soliq qonunchiligini bilish": "знание налогового законодательства",
    "Shaharni bilish": "знание города", "Bolalarni yaxshi ko'rish": "любовь к детям",
    # driving / logistics
    "B toifa guvohnoma": "права категории B", "Haydovchilik guvohnomasi": "водительские права",
    "Haydovchilik guvohnomasi (afzal)": "водительские права (желательно)",
    "Velosiped/skuter (afzal)": "велосипед/скутер (желательно)", "Smartfon": "смартфон",
    "Marshrut bo'yicha harakat": "движение по маршруту",
    "Avtomobil holatini nazorat": "контроль состояния автомобиля",
    "Yukni yetkazish": "доставка груза", "Yukni kuzatish": "сопровождение груза",
    "Yuklash-tushirish": "погрузка-разгрузка", "Mahsulotni qabul qilish": "приёмка товара",
    "Qoldiqlarni hisobga olish": "учёт остатков", "Qoldiqlarni tekshirish": "проверка остатков",
    "Buyurtmalarni olish": "получение заказов", "Buyurtma yig'ish": "сбор заказов",
    "Buyurtmalarni taqsimlash": "распределение заказов", "Buyurtma taqsimlash": "распределение заказов",
    "Buyurtmalarni qayta ishlash": "обработка заказов", "Buyurtma qabul qilish": "приём заказов",
    "Mijozga yetkazish": "доставка клиенту", "Kuryerlar bilan aloqa": "связь с курьерами",
    "Haydovchilar bilan aloqa": "связь с водителями",
    # schedule / shift
    "Smenali grafik": "сменный график", "Smenali ish grafigi": "сменный график работы",
    "Yarim kunlik grafik": "график на полдня",
    # office / docs / admin
    "MS Office": "MS Office", "Hujjatlar": "документы",
    "Hujjatlar bilan ishlash": "работа с документами",
    "Hujjatlarni rasmiylashtirish": "оформление документов",
    "Hujjatlarni tayyorlash": "подготовка документов",
    "Hujjatlarni saralash": "сортировка документов", "Hujjatlashtirish": "документирование",
    "Skanerlash va saqlash": "сканирование и хранение", "Arxiv": "архив",
    "Ofis ishini tashkil qilish": "организация работы офиса", "Ofis ta'minoti": "офисное снабжение",
    "Jadval": "график", "Jadval tuzish": "составление графика",
    "Jadval boshqarish": "управление графиком", "Jadval yuritish": "ведение графика",
    "Jadvalni yangilash": "обновление графика", "Jadvallarni yangilash": "обновление таблиц",
    "Jadval va uchrashuvlar": "график и встречи", "Eslatma yuborish": "отправка напоминаний",
    "Ma'lumot kiritish": "ввод данных", "Tekshirish": "проверка",
    # phone / calls / support
    "Telefon muloqoti": "общение по телефону", "Telefon qo'ng'iroqlari": "телефонные звонки",
    "Qo'ng'iroqlar": "звонки", "Qo'ng'iroqlarga javob": "ответы на звонки",
    "Qo'ng'iroqlarni qabul qilish": "приём звонков",
    "Qo'ng'iroqlarni yo'naltirish": "переадресация звонков",
    "Arizalarni qayd etish": "регистрация заявок", "So'rovlarni hal qilish": "решение запросов",
    "Shikoyatlar bilan ishlash": "работа с жалобами", "Mijozga maslahat": "консультация клиента",
    # clients / sales
    "Mijozlar bilan muloqot": "общение с клиентами", "Mijozlar bilan ishlash": "работа с клиентами",
    "Mijoz bilan ishlash": "работа с клиентом", "Mijozlar bilan aloqa": "связь с клиентами",
    "Mijozlar bilan uchrashuv": "встречи с клиентами", "Mijozlarga xizmat": "обслуживание клиентов",
    "Mijozlarni kutib olish": "встреча клиентов", "Mehmonlarni kutib olish": "встреча гостей",
    "Mijozlarga maslahat": "консультация клиентов", "Mijozlarga ko'maklashish": "помощь клиентам",
    "Mijozlar bazasi": "клиентская база", "Mijozlar bazasi bilan ishlash": "работа с клиентской базой",
    "Mijozlar bilan uchrashuv": "встречи с клиентами", "Mijozlarni yozish": "запись клиентов",
    "Mijoz natijasini kuzatish": "отслеживание результатов клиента",
    "Savdo ko'nikmalari": "навыки продаж", "Sotuv ko'nikmalari": "навыки продаж",
    "Savdo rejasi": "план продаж", "Sotuv rejasi": "план продаж",
    "Sotuv rejasini bajarish": "выполнение плана продаж", "Savdo natijalari": "результаты продаж",
    "Savdo rejasini bajarish": "выполнение плана продаж", "Abonement sotish": "продажа абонементов",
    "Mahsulot bo'yicha maslahat": "консультация по товару", "Mahsulotni tushuntirish": "презентация товара",
    "Mahsulot vitrinasini tartiblash": "выкладка товара",
    "Mijozlar bilan uchrashuv": "встречи с клиентами", "Mijozlar bilan uchrashuv ": "встречи с клиентами",
    # retail / cashier
    "Kassada ishlash": "работа на кассе", "Kassada hisob-kitob": "расчёты на кассе",
    "Kassa hisobi": "кассовый учёт", "Kassa hisobotini yuritish": "ведение кассовой отчётности",
    "To'lovlarni qabul qilish": "приём платежей", "To'lovni qabul qilish": "приём оплаты",
    "To'lovlar": "платежи", "Naqd operatsiyalar": "наличные операции",
    "Stollarni tayyorlash": "сервировка столов",
    # finance / accounting
    "Hisobot": "отчётность", "Hisobotlar": "отчёты", "Hisobot tuzish": "составление отчётов",
    "Hisobotlarda ko'maklashish": "помощь с отчётностью", "Birlamchi hujjatlar": "первичные документы",
    "Bank operatsiyalari": "банковские операции", "Soliq hisobotlari": "налоговая отчётность",
    "To'liq hisob": "полный учёт", "Excelda ishlash": "работа в Excel", "Excel (kuchli)": "Excel (уверенно)",
    "Ma'lumot yig'ish": "сбор данных", "Tahlilda ko'maklashish": "помощь в анализе",
    # education
    "Dars tushuntirish": "объяснение уроков", "Darslar o'tish": "проведение занятий",
    "Uy vazifalarini tekshirish": "проверка домашних заданий", "Test tayyorlash": "подготовка тестов",
    "Testlar": "тесты", "Test holatlari": "тест-кейсы", "Test qilish": "тестирование",
    "O'quvchilar bilan ishlash": "работа с учениками",
    "O'quvchi natijalarini kuzatish": "отслеживание результатов учеников",
    "O'quvchilarni kuzatish": "наблюдение за учениками",
    "O'quvchilarni ro'yxatga olish": "запись учеников", "O'qituvchiga ko'maklashish": "помощь учителю",
    "Talabalar bilan aloqa": "связь со студентами", "Talabalarga maslahat": "консультация студентов",
    "Davomatni kuzatish": "контроль посещаемости", "Bolalar bilan ishlash": "работа с детьми",
    "Materiallar tayyorlash": "подготовка материалов", "Speaking mashqi": "практика Speaking",
    "Mashqlarni tekshirish": "проверка упражнений", "Mentor bilan ishlash": "работа с ментором",
    "Mentorga ko'maklashish": "помощь ментору", "Topshiriqlarni tekshirish": "проверка заданий",
    "Natijalarni tahlil qilish": "анализ результатов", "Natijalarni kuzatish": "отслеживание результатов",
    # fitness
    "Trening dasturi": "программа тренировок", "Trening dasturi tuzish": "составление программы тренировок",
    "Mashg'ulot o'tkazish": "проведение тренировок", "Mashg'ulotga tayyorlash": "подготовка к занятию",
    "Sport zali qoidalari": "правила тренажёрного зала", "Sog'lom turmush": "здоровый образ жизни",
    "Trenerga ko'maklashish": "помощь тренеру", "Jihozlarni nazorat": "контроль оборудования",
    # restaurant / service
    "Qahva tayyorlash": "приготовление кофе", "Mahsulot tayyorlash": "подготовка продуктов",
    "Oshpazga ko'maklashish": "помощь повару", "Oshxona tozaligi": "чистота кухни",
    "Tayyorlashda ishtirok": "участие в приготовлении", "Tozalik standartlari": "стандарты чистоты",
    "Tozalikni saqlash": "поддержание чистоты", "Ish joyini tozalash": "уборка рабочего места",
    "Ish joyini tayyorlash": "подготовка рабочего места", "Sanitariya talablari": "санитарные требования",
    "Joylashtirish": "размещение", "Bron qabul qilish": "приём броней", "Bron yuritish": "ведение броней",
    # marketing / smm
    "Post tayyorlash": "подготовка постов", "Post joylash": "публикация постов",
    "Kommentlar bilan ishlash": "работа с комментариями", "Direct javoblari": "ответы в Direct",
    "Sahifani yuritish": "ведение страницы", "Kontent rejasi": "контент-план",
    "Matn yozish": "написание текстов", "Sarlavhalar": "заголовки", "Tahrir qilish": "редактирование",
    "Vizual tayyorlash": "подготовка визуала", "Video montaj": "видеомонтаж",
    "Subtitr qo'shish": "добавление субтитров", "Materiallarni saralash": "сортировка материалов",
    "Reklama sozlash": "настройка рекламы", "Instagram tajribasi": "опыт в Instagram",
    "Maket tayyorlash": "подготовка макетов", "Prototip": "прототип",
    "Jamoadan fikr olish": "обратная связь от команды",
    # beauty
    "Mijozlarga maslahat": "консультация клиентов", "Ustaga ko'maklashish": "помощь мастеру",
    "Muolajaga tayyorlash": "подготовка к процедуре", "Mijozlarni yozish": "запись клиентов",
    "Qayta yozuv": "повторная запись", "Yozuvlarni qabul qilish": "приём записей",
    "Mijozlarga ko'maklashish": "помощь клиентам",
    # IT
    "UI komponentlar yaratish": "создание UI-компонентов", "Buglarni tuzatish": "исправление багов",
    "Buglarni qayd etish": "фиксация багов", "API yozish": "написание API",
    "API integratsiya": "интеграция API", "Bot funksiyalari": "функции бота",
    "Ma'lumotlar bazasi bilan ishlash": "работа с базой данных", "Testlar": "тесты",
    "Ilova ekranlari": "экраны приложения", "Texnika sozlash": "настройка техники",
    "Ma'lumot tahlili": "анализ данных", "Biznesga insight": "аналитика для бизнеса",
    "Dashboard": "дашборд",
    # management (mid/senior)
    "Jamoa": "команда", "Jamoani boshqarish": "управление командой",
    "Jarayonni boshqarish": "управление процессом", "Zalni boshqarish": "управление залом",
    "Zalni nazorat": "контроль зала", "Klubni boshqarish": "управление клубом",
    "Sifat nazorati": "контроль качества", "KPI nazorati": "контроль KPI",
    "Xodimlar jadvali": "график сотрудников", "Xodimlarga ko'maklashish": "помощь сотрудникам",
    "Smena nazorati": "контроль смены", "Strategiya": "стратегия", "Kampaniyalar": "кампании",
    "Bo'lim bilan muvofiqlashtirish": "координация с отделом", "Bo'limga ko'maklashish": "помощь отделу",
    "Student coordinator": "координатор студентов",
    # résumé labels
    "Asosiy": "Основные", "Bakalavr": "Бакалавр", "Tegishli yo'nalish": "соответствующее направление",
    "Avvalgi ish joyi": "Предыдущее место работы",
    "Kundalik vazifalarni bajardi": "Выполнял ежедневные задачи",
    "Jamoa bilan ishladi": "Работал в команде",
    "O'zbek": "Узбекский", "Rus": "Русский", "Ingliz": "Английский",
    "Ona tili": "Родной", "Yaxshi": "Хорошо", "O'rta": "Средний",
    # benefits
    "Rasmiy ish": "официальное трудоустройство", "O'qitamiz": "обучаем",
    "Do'stona jamoa": "дружная команда", "Bonuslar": "бонусы",
}


def bil(uz: str) -> str:
    """Render a short list item bilingually: 'uz · ru'. Tech tokens (no RU
    entry) render once unchanged."""
    ru = RU_TERMS.get(uz)
    if not ru or ru == uz:
        return uz
    return f"{uz}{SKILL_SEP}{ru}"


def bil_list(items: list[str]) -> list[str]:
    return [bil(x) for x in items]


def uz_part(item: str) -> str:
    """Strip the RU half back off a bilingual list item (for matching)."""
    return item.split(SKILL_SEP, 1)[0]


def days_ago(n: int) -> datetime:
    return NOW - timedelta(days=n)


# =============================================================================
# CITIES
# =============================================================================

CITY_POOL = [
    "Tashkent", "Samarkand", "Bukhara", "Andijan", "Fergana",
    "Namangan", "Nukus", "Qarshi", "Jizzakh", "Urgench",
]


def loc(city: str) -> str:
    if city in ("Remote", "Hybrid"):
        return city
    return f"{city}, Uzbekistan"


# =============================================================================
# COMPANIES (26 — IT + non-IT, mostly local SMBs)
# =============================================================================
# Fields: email, contact, name, website, city, industry_uz, industry_ru,
#         bio_uz, bio_ru, verified, founded, cats (role categories they hire)

COMPANY_DEFS = [
    # --- preserved canonical demo company ---
    dict(email="hr@epam.com", contact="EPAM HR Manager", name="EPAM Systems",
         website="https://epam.com", city="Tashkent", verified=True, founded=1993,
         industry_uz="IT / dasturiy ta'minot", industry_ru="IT / разработка ПО",
         bio_uz="Xalqaro dasturiy ta'minot va muhandislik kompaniyasi.",
         bio_ru="Международная компания по разработке ПО и инжинирингу.",
         cats={"it"}),
    # --- retail / supermarket / ecommerce ---
    dict(email="hr@freshmarket.uz", contact="Dilfuza Karimova", name="FreshMarket",
         website="https://freshmarket.uz", city="Tashkent", verified=True, founded=2016,
         industry_uz="Supermarket / chakana savdo", industry_ru="Супермаркет / розница",
         bio_uz="Toshkent bo'ylab oziq-ovqat supermarketlar tarmog'i.",
         bio_ru="Сеть продуктовых супермаркетов по Ташкенту.",
         cats={"retail", "admin", "finance", "logistics"}),
    dict(email="jobs@marketgo.uz", contact="Sardor Aliyev", name="MarketGo",
         website="https://marketgo.uz", city="Tashkent", verified=True, founded=2019,
         industry_uz="Onlayn marketpleys", industry_ru="Онлайн-маркетплейс",
         bio_uz="O'zbekistondagi tez o'sayotgan onlayn savdo platformasi.",
         bio_ru="Быстрорастущая онлайн-площадка в Узбекистане.",
         cats={"retail", "marketing", "it", "admin", "logistics"}),
    dict(email="hr@retailplus.uz", contact="Gulnoza Tosheva", name="RetailPlus",
         website="https://retailplus.uz", city="Samarkand", verified=False, founded=2018,
         industry_uz="Chakana savdo tarmog'i", industry_ru="Розничная сеть",
         bio_uz="Samarqanddagi kiyim va maishiy tovarlar do'konlari tarmog'i.",
         bio_ru="Сеть магазинов одежды и товаров для дома в Самарканде.",
         cats={"retail", "admin"}),
    dict(email="careers@megastore.uz", contact="Jasur Bekov", name="MegaStore",
         website="https://megastore.uz", city="Tashkent", verified=True, founded=2014,
         industry_uz="Gipermarket", industry_ru="Гипермаркет",
         bio_uz="Maishiy texnika va oziq-ovqat gipermarketi.",
         bio_ru="Гипермаркет бытовой техники и продуктов.",
         cats={"retail", "finance", "logistics", "admin"}),
    # --- food service ---
    dict(email="hr@coffeelab.uz", contact="Madina Yusupova", name="CoffeeLab",
         website="https://coffeelab.uz", city="Tashkent", verified=True, founded=2020,
         industry_uz="Kofejona / restoran", industry_ru="Кофейня / ресторан",
         bio_uz="Toshkentdagi zamonaviy kofejonalar tarmog'i.",
         bio_ru="Сеть современных кофеен в Ташкенте.",
         cats={"restaurant", "admin"}),
    dict(email="jobs@burgerpoint.uz", contact="Aziz Toirov", name="BurgerPoint",
         website="https://burgerpoint.uz", city="Tashkent", verified=False, founded=2021,
         industry_uz="Tez tayyor ovqat", industry_ru="Фастфуд",
         bio_uz="Tez tayyor ovqat restoranlari tarmog'i.",
         bio_ru="Сеть ресторанов быстрого питания.",
         cats={"restaurant"}),
    dict(email="hr@hotelorient.uz", contact="Bahodir Ergashev", name="Hotel Orient Tashkent",
         website="https://hotelorient.uz", city="Tashkent", verified=True, founded=2008,
         industry_uz="Mehmonxona / turizm", industry_ru="Отель / туризм",
         bio_uz="To'rt yulduzli mehmonxona, biznes va sayyohlar uchun.",
         bio_ru="Четырёхзвёздочный отель для бизнеса и туристов.",
         cats={"restaurant", "admin"}),
    # --- fitness ---
    dict(email="hr@bodyline.uz", contact="Rustam Qodirov", name="BodyLine Fitness",
         website="https://bodyline.uz", city="Tashkent", verified=True, founded=2017,
         industry_uz="Fitnes / sport", industry_ru="Фитнес / спорт",
         bio_uz="Zamonaviy fitnes klublar tarmog'i.",
         bio_ru="Сеть современных фитнес-клубов.",
         cats={"fitness", "admin", "marketing"}),
    dict(email="jobs@fitcity.uz", contact="Sevara Olimova", name="FitCity Academy",
         website="https://fitcity.uz", city="Samarkand", verified=False, founded=2019,
         industry_uz="Fitnes akademiyasi", industry_ru="Фитнес-академия",
         bio_uz="Samarqanddagi fitnes va sog'lom turmush markazi.",
         bio_ru="Центр фитнеса и здорового образа жизни в Самарканде.",
         cats={"fitness", "admin"}),
    # --- education ---
    dict(email="hr@edubridge.uz", contact="Nodira Saidova", name="EduBridge",
         website="https://edubridge.uz", city="Tashkent", verified=True, founded=2015,
         industry_uz="O'quv markazi", industry_ru="Учебный центр",
         bio_uz="IT, til va kasbiy kurslar o'quv markazi.",
         bio_ru="Учебный центр IT, языковых и профессиональных курсов.",
         cats={"education", "admin", "it", "marketing"}),
    dict(email="jobs@englishhouse.uz", contact="Kamola Rashidova", name="English House Tashkent",
         website="https://englishhouse.uz", city="Tashkent", verified=True, founded=2013,
         industry_uz="Til maktabi", industry_ru="Языковая школа",
         bio_uz="Ingliz tili va IELTS tayyorlash maktabi.",
         bio_ru="Школа английского языка и подготовки к IELTS.",
         cats={"education", "admin"}),
    dict(email="hr@smartschool.uz", contact="Feruza Mirzaeva", name="Smart School",
         website="https://smartschool.uz", city="Tashkent", verified=True, founded=2016,
         industry_uz="Xususiy maktab", industry_ru="Частная школа",
         bio_uz="Zamonaviy xususiy maktab va o'quv markazi.",
         bio_ru="Современная частная школа и учебный центр.",
         cats={"education", "admin"}),
    # --- logistics / delivery / taxi ---
    dict(email="hr@silkroadlogistics.uz", contact="Otabek Nurmatov", name="SilkRoad Logistics",
         website="https://silkroadlogistics.uz", city="Tashkent", verified=True, founded=2012,
         industry_uz="Logistika", industry_ru="Логистика",
         bio_uz="Yuk tashish va ta'minot zanjiri xizmatlari.",
         bio_ru="Грузоперевозки и услуги цепочки поставок.",
         cats={"logistics", "admin", "finance"}),
    dict(email="jobs@expresscourier.uz", contact="Shoxrux Kamolov", name="Express Courier",
         website="https://expresscourier.uz", city="Tashkent", verified=False, founded=2020,
         industry_uz="Yetkazib berish xizmati", industry_ru="Служба доставки",
         bio_uz="Shahar bo'ylab tezkor yetkazib berish xizmati.",
         bio_ru="Служба быстрой доставки по городу.",
         cats={"logistics", "admin"}),
    dict(email="hr@taxipark.uz", contact="Akmal Tursunov", name="TaxiPark Tashkent",
         website="https://taxipark.uz", city="Tashkent", verified=False, founded=2018,
         industry_uz="Taksi / transport", industry_ru="Такси / транспорт",
         bio_uz="Shahar taksi parki va transport xizmatlari.",
         bio_ru="Городской таксопарк и транспортные услуги.",
         cats={"logistics", "admin"}),
    # --- medical admin ---
    dict(email="hr@familyclinic.uz", contact="Dr. Shoira Rakhmonova", name="Family Clinic",
         website="https://familyclinic.uz", city="Tashkent", verified=True, founded=2011,
         industry_uz="Klinika / tibbiyot", industry_ru="Клиника / медицина",
         bio_uz="Oilaviy poliklinika va diagnostika markazi.",
         bio_ru="Семейная поликлиника и диагностический центр.",
         cats={"admin", "finance", "beauty"}),
    # --- banks / fintech ---
    dict(email="hr@payway.uz", contact="Bekzod Yusupov", name="PayWay Technologies",
         website="https://payway.uz", city="Tashkent", verified=True, founded=2017,
         industry_uz="Fintex / to'lovlar", industry_ru="Финтех / платежи",
         bio_uz="Raqamli to'lov va fintex yechimlari.",
         bio_ru="Цифровые платежи и финтех-решения.",
         cats={"it", "finance", "marketing", "admin"}),
    dict(email="hr@asakabank.uz", contact="Nargiza Saidova", name="Asaka Bank",
         website="https://asakabank.uz", city="Tashkent", verified=True, founded=1995,
         industry_uz="Bank", industry_ru="Банк",
         bio_uz="O'zbekistonning yirik tijorat banklaridan biri.",
         bio_ru="Один из крупных коммерческих банков Узбекистана.",
         cats={"finance", "admin", "it"}),
    # --- marketing / media ---
    dict(email="hr@medianova.uz", contact="Kamila Yakubova", name="MediaNova",
         website="https://medianova.uz", city="Tashkent", verified=True, founded=2018,
         industry_uz="Marketing agentligi", industry_ru="Маркетинговое агентство",
         bio_uz="Raqamli marketing va kreativ media agentligi.",
         bio_ru="Агентство цифрового маркетинга и креативных медиа.",
         cats={"marketing", "it", "admin"}),
    # --- HR agency ---
    dict(email="hr@hrbridge.uz", contact="Malika Abdullayeva", name="HR Bridge Uzbekistan",
         website="https://hrbridge.uz", city="Tashkent", verified=True, founded=2019,
         industry_uz="HR agentligi", industry_ru="HR-агентство",
         bio_uz="Ishga joylashtirish va HR-konsalting agentligi.",
         bio_ru="Агентство по трудоустройству и HR-консалтингу.",
         cats={"admin", "marketing", "finance"}),
    # --- beauty ---
    dict(email="jobs@beautypro.uz", contact="Zarnigor Xolmatova", name="BeautyPro Salon",
         website="https://beautypro.uz", city="Tashkent", verified=False, founded=2021,
         industry_uz="Go'zallik saloni", industry_ru="Салон красоты",
         bio_uz="Zamonaviy go'zallik va parvarish saloni.",
         bio_ru="Современный салон красоты и ухода.",
         cats={"beauty", "admin"}),
    # --- warehouse / manufacturing ---
    dict(email="hr@warehousepro.uz", contact="Ibrohim Akbarov", name="Warehouse Pro",
         website="https://warehousepro.uz", city="Tashkent", verified=False, founded=2017,
         industry_uz="Ombor / ishlab chiqarish", industry_ru="Склад / производство",
         bio_uz="Ombor logistikasi va distributsiya markazi.",
         bio_ru="Складская логистика и распределительный центр.",
         cats={"logistics", "admin"}),
    dict(email="careers@uzautoservice.uz", contact="Akmal Tursunboyev", name="UzAuto Service",
         website="https://uzautoservice.uz", city="Andijan", verified=True, founded=2010,
         industry_uz="Avto xizmat / ishlab chiqarish", industry_ru="Автосервис / производство",
         bio_uz="Avtomobil xizmat ko'rsatish va ta'mirlash markazi.",
         bio_ru="Центр обслуживания и ремонта автомобилей.",
         cats={"logistics", "admin", "finance"}),
    # --- local IT startups ---
    dict(email="hr@agrosoft.uz", contact="Jamshid Ergashev", name="AgroSoft",
         website="https://agrosoft.uz", city="Tashkent", verified=False, founded=2021,
         industry_uz="Lokal IT startap", industry_ru="Локальный IT-стартап",
         bio_uz="Qishloq xo'jaligi uchun raqamli yechimlar startapi.",
         bio_ru="Стартап цифровых решений для сельского хозяйства.",
         cats={"it", "marketing"}),
    dict(email="hr@tashkentdigital.uz", contact="Dilshod Toshmatov", name="Tashkent Digital Solutions",
         website="https://tashkentdigital.uz", city="Tashkent", verified=True, founded=2016,
         industry_uz="IT / dasturiy ta'minot", industry_ru="IT / разработка ПО",
         bio_uz="Veb va mobil ilovalar ishlab chiqaruvchi kompaniya.",
         bio_ru="Компания по разработке веб- и мобильных приложений.",
         cats={"it", "marketing", "admin"}),
]


# =============================================================================
# JOB ROLE TEMPLATES (categories A–J)
# =============================================================================
# exp: intern | junior | mid | senior  ·  jt: full_time|part_time|internship|remote|hybrid
# salary in UZS whole units. count = how many companies to place this role at.

B = ["Rasmiy ish", "O'qitamiz", "Do'stona jamoa", "Bonuslar"]            # default benefits (uz; bilingualized at insert)

ROLE_TEMPLATES = [
    # ----- A) Retail / Sales -----
    dict(key="sotuvchi", cat="retail", title="Sotuvchi-konsultant", exp="junior", jt="full_time",
         smin=2_500_000, smax=5_000_000, count=3,
         skills=["Mijozlar bilan muloqot", "Savdo ko'nikmalari", "Kassada ishlash", "Mahsulotni tushuntirish"],
         desc_uz="Do'konga sotuvchi-konsultant kerak. Mijozlarga mahsulot tanlashda yordam berasiz va savdoni yakunlaysiz.",
         desc_ru="В магазин нужен продавец-консультант. Помогаете клиентам с выбором товара и завершаете продажу.",
         resp=["Mijozlarni kutib olish", "Mahsulot bo'yicha maslahat", "Kassada hisob-kitob"],
         req=["Muloqotga ochiqlik", "Tajriba shart emas", "O'zbek/rus tili"]),
    dict(key="kassir", cat="retail", title="Kassir", exp="junior", jt="shift",
         smin=2_500_000, smax=4_500_000, count=3,
         skills=["Kassada ishlash", "Diqqatlilik", "Mijozlarga xizmat", "POS terminal"],
         desc_uz="Supermarketga kassir kerak. Naqd va plastik to'lovlarni qabul qilasiz, kassa intizomiga rioya qilasiz.",
         desc_ru="В супермаркет нужен кассир. Принимаете наличную и безналичную оплату, соблюдаете кассовую дисциплину.",
         resp=["To'lovlarni qabul qilish", "Kassa hisobotini yuritish", "Mijozlarga xizmat"],
         req=["Diqqatlilik", "Tajriba shart emas", "Smenali ish grafigi"]),
    dict(key="online-sotuv", cat="retail", title="Online sotuv menejeri", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_000_000, count=2,
         skills=["Savdo ko'nikmalari", "CRM", "Telefon muloqoti", "Instagram"],
         desc_uz="Onlayn buyurtmalarni qayta ishlovchi sotuv menejeri kerak. Mijozlar bilan telefon va chat orqali ishlaysiz.",
         desc_ru="Нужен менеджер онлайн-продаж для обработки заказов. Работаете с клиентами по телефону и в чате.",
         resp=["Buyurtmalarni qayta ishlash", "Mijozlar bazasi bilan ishlash", "Sotuv rejasini bajarish"],
         req=["Savdo qiziqishi", "Kompyuterni bilish", "O'zbek/rus tili"]),
    dict(key="savdo-vakili", cat="retail", title="Savdo vakili", exp="junior", jt="full_time",
         smin=3_500_000, smax=7_000_000, count=2,
         skills=["Savdo ko'nikmalari", "Mijozlar bilan muloqot", "CRM", "Haydovchilik guvohnomasi"],
         desc_uz="Hududiy savdo vakili kerak. Do'konlar bilan ishlaysiz va buyurtmalarni yig'asiz.",
         desc_ru="Нужен торговый представитель по региону. Работаете с магазинами и собираете заказы.",
         resp=["Mijozlar bilan uchrashuv", "Buyurtma yig'ish", "Hisobotlar"],
         req=["Haydovchilik guvohnomasi (afzal)", "Faollik", "Muloqot ko'nikmalari"]),
    dict(key="merchandiser", cat="retail", title="Merchandiser", exp="intern", jt="part_time",
         smin=1_500_000, smax=3_000_000, count=2,
         skills=["Diqqatlilik", "Mahsulotni tushuntirish", "Jamoada ishlash"],
         desc_uz="Do'konlarda mahsulot ko'rgazmasini tartibga soluvchi merchandiser kerak. Talabalar uchun qulay.",
         desc_ru="Нужен мерчендайзер для выкладки товара в магазинах. Удобно для студентов.",
         resp=["Mahsulot vitrinasini tartiblash", "Qoldiqlarni tekshirish", "Hisobot"],
         req=["Mas'uliyat", "Tajriba shart emas", "Yarim kunlik grafik"]),
    dict(key="dokon-admin-yordam", cat="retail", title="Do'kon administrator yordamchisi", exp="junior", jt="full_time",
         smin=3_000_000, smax=5_500_000, count=1,
         skills=["Rejalashtirish", "Jamoada ishlash", "MS Office", "Mijozlarga xizmat"],
         desc_uz="Do'kon administratoriga yordamchi kerak. Smena ishini tashkil qilishda ko'maklashasiz.",
         desc_ru="Нужен помощник администратора магазина. Помогаете организовать работу смены.",
         resp=["Smena nazorati", "Hujjatlar", "Xodimlarga ko'maklashish"],
         req=["Tashkilotchilik", "Mas'uliyat", "Boshlang'ich tajriba"]),
    dict(key="call-operator", cat="retail", title="Call center operator", exp="intern", jt="shift",
         smin=2_500_000, smax=4_500_000, count=3,
         skills=["Telefon muloqoti", "CRM", "Mijozlarga xizmat", "Sabr-toqat"],
         desc_uz="Call-markazga operator kerak. Mijozlarning qo'ng'iroqlariga javob berasiz va ariza qoldirasiz.",
         desc_ru="В call-центр нужен оператор. Отвечаете на звонки клиентов и оформляете заявки.",
         resp=["Qo'ng'iroqlarga javob", "Arizalarni qayd etish", "Mijozga maslahat"],
         req=["Tushunarli nutq", "Tajriba shart emas", "Smenali grafik"]),

    # ----- B) Driver / Courier / Logistics -----
    dict(key="haydovchi", cat="logistics", title="Haydovchi", exp="junior", jt="full_time",
         smin=4_000_000, smax=8_000_000, count=3,
         skills=["Haydovchilik guvohnomasi", "Shaharni bilish", "Punktuallik", "Mas'uliyat"],
         desc_uz="Kompaniyaga haydovchi kerak. Yuk va xodimlarni shahar bo'ylab tashiysiz.",
         desc_ru="Компании нужен водитель. Перевозите груз и сотрудников по городу.",
         resp=["Marshrut bo'yicha harakat", "Avtomobil holatini nazorat", "Yukni yetkazish"],
         req=["B toifa guvohnoma", "Shaharni bilish", "Mas'uliyat"]),
    dict(key="kuryer", cat="logistics", title="Kuryer", exp="intern", jt="shift",
         smin=3_000_000, smax=7_000_000, count=3,
         skills=["Shaharni bilish", "Punktuallik", "Yandex/Map usage", "Mas'uliyat"],
         desc_uz="Yetkazib berish xizmatiga kuryer kerak. Buyurtmalarni mijozlarga yetkazasiz. Talabalar uchun qulay.",
         desc_ru="В службу доставки нужен курьер. Доставляете заказы клиентам. Удобно для студентов.",
         resp=["Buyurtmalarni olish", "Mijozga yetkazish", "To'lovni qabul qilish"],
         req=["Punktuallik", "Smartfon", "Velosiped/skuter (afzal)"]),
    dict(key="yetkazish-operator", cat="logistics", title="Yetkazib berish operatori", exp="junior", jt="full_time",
         smin=3_000_000, smax=5_500_000, count=2,
         skills=["Delivery process", "CRM", "Telefon muloqoti", "Rejalashtirish"],
         desc_uz="Yetkazib berishni muvofiqlashtiruvchi operator kerak. Kuryerlar ishini nazorat qilasiz.",
         desc_ru="Нужен оператор доставки. Координируете работу курьеров и маршруты.",
         resp=["Buyurtmalarni taqsimlash", "Kuryerlar bilan aloqa", "Hisobot"],
         req=["Tashkilotchilik", "Kompyuterni bilish", "Stress-bardoshlik"]),
    dict(key="omborchi", cat="logistics", title="Omborchi", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_000_000, count=3,
         skills=["Diqqatlilik", "Jamoada ishlash", "Mas'uliyat", "1C basics"],
         desc_uz="Omborga omborchi kerak. Mahsulotlarni qabul qilish va saqlashni tashkil qilasiz.",
         desc_ru="На склад нужен кладовщик. Организуете приёмку и хранение товара.",
         resp=["Mahsulotni qabul qilish", "Qoldiqlarni hisobga olish", "Yuklash-tushirish"],
         req=["Jismoniy chidamlilik", "Mas'uliyat", "Tajriba afzal"]),
    dict(key="logistika-koord-yordam", cat="logistics", title="Logistika koordinator yordamchisi", exp="junior", jt="full_time",
         smin=3_500_000, smax=6_500_000, count=1,
         skills=["Rejalashtirish", "Excel", "Telefon muloqoti", "Diqqatlilik"],
         desc_uz="Logistika bo'limiga koordinator yordamchisi kerak. Yetkazib berish jadvalini tuzasiz.",
         desc_ru="В отдел логистики нужен помощник координатора. Составляете график доставок.",
         resp=["Jadval tuzish", "Hujjatlar", "Bo'lim bilan muvofiqlashtirish"],
         req=["Excel", "Diqqatlilik", "Boshlang'ich tajriba"]),
    dict(key="ekspeditor", cat="logistics", title="Ekspeditor", exp="junior", jt="full_time",
         smin=3_500_000, smax=6_000_000, count=1,
         skills=["Mas'uliyat", "Hujjatlar bilan ishlash", "Punktuallik", "Shaharni bilish"],
         desc_uz="Ekspeditor kerak. Yuk hujjatlarini rasmiylashtirasiz va yetkazilishini kuzatasiz.",
         desc_ru="Нужен экспедитор. Оформляете товарные документы и сопровождаете груз.",
         resp=["Hujjatlarni rasmiylashtirish", "Yukni kuzatish", "Hisobot"],
         req=["Mas'uliyat", "Diqqatlilik", "Tajriba afzal"]),
    dict(key="taxipark-operator", cat="logistics", title="Taxi park operatori", exp="intern", jt="shift",
         smin=2_500_000, smax=4_500_000, count=1,
         skills=["Telefon muloqoti", "CRM", "Shaharni bilish", "Sabr-toqat"],
         desc_uz="Taksi parkiga operator kerak. Buyurtmalarni qabul qilib, haydovchilarga taqsimlaysiz.",
         desc_ru="В таксопарк нужен оператор. Принимаете заказы и распределяете их водителям.",
         resp=["Qo'ng'iroqlarni qabul qilish", "Buyurtma taqsimlash", "Haydovchilar bilan aloqa"],
         req=["Tushunarli nutq", "Tajriba shart emas", "Smenali grafik"]),

    # ----- C) Education / Teaching -----
    dict(key="ingliz-oqituvchi", cat="education", title="Ingliz tili o'qituvchisi", exp="junior", jt="full_time",
         smin=4_000_000, smax=10_000_000, count=2,
         skills=["Dars tushuntirish", "O'quvchilar bilan ishlash", "Uzbek/Russian/English", "Test tayyorlash"],
         desc_uz="O'quv markaziga ingliz tili o'qituvchisi kerak. Guruh va individual darslar olib borasiz.",
         desc_ru="В учебный центр нужен преподаватель английского языка. Ведёте групповые и индивидуальные занятия.",
         resp=["Darslar o'tish", "Uy vazifalarini tekshirish", "O'quvchi natijalarini kuzatish"],
         req=["Ingliz tili (Upper-Intermediate+)", "Tushuntira olish", "Mas'uliyat"]),
    dict(key="matematika-oqituvchi", cat="education", title="Matematika o'qituvchisi", exp="junior", jt="full_time",
         smin=3_500_000, smax=9_000_000, count=1,
         skills=["Fan bo'yicha bilim", "Dars tushuntirish", "Test tayyorlash", "O'quvchilar bilan ishlash"],
         desc_uz="O'quv markaziga matematika o'qituvchisi kerak. Abituriyentlarni imtihonga tayyorlaysiz.",
         desc_ru="В учебный центр нужен преподаватель математики. Готовите абитуриентов к экзаменам.",
         resp=["Darslar o'tish", "Test tayyorlash", "Natijalarni tahlil qilish"],
         req=["Matematika bo'yicha kuchli bilim", "Tushuntira olish", "Sabr-toqat"]),
    dict(key="boshlangich-yordam", cat="education", title="Boshlang'ich sinf o'qituvchisi yordamchisi", exp="intern", jt="part_time",
         smin=2_000_000, smax=4_000_000, count=1,
         skills=["O'quvchilar bilan ishlash", "Sabr-toqat", "Jamoada ishlash"],
         desc_uz="Maktabga boshlang'ich sinf o'qituvchisiga yordamchi kerak. Bolalar bilan ishlashda ko'maklashasiz.",
         desc_ru="В школу нужен помощник учителя начальных классов. Помогаете в работе с детьми.",
         resp=["O'qituvchiga ko'maklashish", "Bolalar bilan ishlash", "Materiallar tayyorlash"],
         req=["Bolalarni yaxshi ko'rish", "Sabr-toqat", "Tajriba shart emas"]),
    dict(key="python-mentor-yordam", cat="education", title="Python mentor yordamchisi", exp="junior", jt="part_time",
         smin=3_000_000, smax=6_000_000, count=1,
         skills=["Python", "Dars tushuntirish", "O'quvchilar bilan ishlash", "Git"],
         desc_uz="IT o'quv markaziga Python mentor yordamchisi kerak. Talabalarning kod topshiriqlarini tekshirasiz.",
         desc_ru="В IT-центр нужен помощник Python-ментора. Проверяете задания студентов по коду.",
         resp=["Topshiriqlarni tekshirish", "Talabalarga maslahat", "Mentorga ko'maklashish"],
         req=["Python asoslari", "Tushuntira olish", "Talabalik mos keladi"]),
    dict(key="ielts-assistant", cat="education", title="IELTS tutor assistant", exp="intern", jt="part_time",
         smin=2_500_000, smax=5_000_000, count=1,
         skills=["Uzbek/Russian/English", "O'quvchilar bilan ishlash", "Test tayyorlash"],
         desc_uz="IELTS markaziga tutor assistant kerak. Speaking va writing mashqlarida yordam berasiz.",
         desc_ru="В IELTS-центр нужен ассистент тьютора. Помогаете с упражнениями Speaking и Writing.",
         resp=["Mashqlarni tekshirish", "Speaking mashqi", "O'quvchilarni kuzatish"],
         req=["Ingliz tili IELTS 6.5+", "Mas'uliyat", "Talabalik mos keladi"]),
    dict(key="oquv-markaz-admin", cat="education", title="O'quv markazi administratori", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_000_000, count=2,
         skills=["MS Office", "Telefon muloqoti", "Rejalashtirish", "Mijozlarga xizmat"],
         desc_uz="O'quv markaziga administrator kerak. O'quvchilarni ro'yxatga olasiz va jadval tuzasiz.",
         desc_ru="В учебный центр нужен администратор. Записываете студентов и составляете расписание.",
         resp=["O'quvchilarni ro'yxatga olish", "Jadval", "Telefon qo'ng'iroqlari"],
         req=["Tashkilotchilik", "Kompyuterni bilish", "Muloqot ko'nikmalari"]),
    dict(key="student-coordinator", cat="education", title="Student coordinator", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_500_000, count=1,
         skills=["Rejalashtirish", "O'quvchilar bilan ishlash", "MS Office", "Muloqot"],
         desc_uz="O'quv markaziga student coordinator kerak. Talabalar bilan ishlab, ularning jarayonini kuzatasiz.",
         desc_ru="В учебный центр нужен координатор студентов. Сопровождаете студентов и отслеживаете прогресс.",
         resp=["Talabalar bilan aloqa", "Davomatni kuzatish", "Hisobot"],
         req=["Muloqot ko'nikmalari", "Tashkilotchilik", "Boshlang'ich tajriba"]),

    # ----- D) Fitness / Sport -----
    dict(key="fitness-trener", cat="fitness", title="Fitness trener", exp="junior", jt="full_time",
         smin=3_000_000, smax=12_000_000, count=2,
         skills=["Trening dasturi", "Mijoz bilan ishlash", "Sport zali qoidalari", "Sog'lom turmush"],
         desc_uz="Fitnes klubga trener kerak. Mijozlar uchun trening dasturi tuzasiz va mashg'ulot olib borasiz.",
         desc_ru="В фитнес-клуб нужен тренер. Составляете программы тренировок и проводите занятия.",
         resp=["Trening dasturi tuzish", "Mashg'ulot o'tkazish", "Mijoz natijasini kuzatish"],
         req=["Sport tayyorgarligi", "Mijozlar bilan ishlash", "Sertifikat afzal"]),
    dict(key="personal-trener-yordam", cat="fitness", title="Personal trener yordamchisi", exp="intern", jt="part_time",
         smin=2_500_000, smax=5_000_000, count=1,
         skills=["Sport zali qoidalari", "Mijoz bilan ishlash", "Sog'lom turmush", "Jamoada ishlash"],
         desc_uz="Personal trenerga yordamchi kerak. Mashg'ulotlarda yordam berasiz va zalda tartibni saqlaysiz.",
         desc_ru="Нужен помощник персонального тренера. Помогаете на тренировках и поддерживаете порядок в зале.",
         resp=["Trenerga ko'maklashish", "Jihozlarni nazorat", "Mijozlarni kutib olish"],
         req=["Sportga qiziqish", "Mas'uliyat", "Tajriba shart emas"]),
    dict(key="gym-admin", cat="fitness", title="Gym administrator", exp="junior", jt="shift",
         smin=3_000_000, smax=6_000_000, count=2,
         skills=["Mijozlarga xizmat", "CRM", "Telefon muloqoti", "Rejalashtirish"],
         desc_uz="Sport zaliga administrator kerak. Mijozlarni kutib olasiz va abonementlarni rasmiylashtirasiz.",
         desc_ru="В фитнес-зал нужен администратор. Встречаете клиентов и оформляете абонементы.",
         resp=["Mijozlarni kutib olish", "Abonement sotish", "Jadval yuritish"],
         req=["Muloqot ko'nikmalari", "Tashkilotchilik", "Smenali grafik"]),
    dict(key="fitness-sotuv-konsultant", cat="fitness", title="Sotuv bo'yicha fitness konsultant", exp="junior", jt="full_time",
         smin=3_000_000, smax=8_000_000, count=1,
         skills=["Sales basics", "Mijoz bilan ishlash", "Savdo ko'nikmalari", "Sog'lom turmush"],
         desc_uz="Fitnes klubga sotuv konsultanti kerak. Yangi mijozlarga abonement va xizmatlarni taklif qilasiz.",
         desc_ru="В фитнес-клуб нужен консультант по продажам. Предлагаете абонементы и услуги новым клиентам.",
         resp=["Abonement sotish", "Mijozlar bazasi", "Sotuv rejasini bajarish"],
         req=["Savdoga qiziqish", "Muloqot ko'nikmalari", "Faollik"]),
    dict(key="yoga-instruktor-yordam", cat="fitness", title="Yoga/Pilates instruktor yordamchisi", exp="intern", jt="part_time",
         smin=2_500_000, smax=6_000_000, count=1,
         skills=["Sport zali qoidalari", "Mijoz bilan ishlash", "Sog'lom turmush"],
         desc_uz="Yoga/Pilates instruktoriga yordamchi kerak. Guruh mashg'ulotlarini tashkil qilishda ko'maklashasiz.",
         desc_ru="Нужен помощник инструктора Yoga/Pilates. Помогаете организовать групповые занятия.",
         resp=["Mashg'ulotga tayyorlash", "Mijozlarga ko'maklashish", "Jihozlarni nazorat"],
         req=["Yoga/Pilatesga qiziqish", "Egiluvchanlik", "Tajriba shart emas"]),

    # ----- E) Restaurant / Service -----
    dict(key="ofitsiant", cat="restaurant", title="Ofitsiant", exp="intern", jt="shift",
         smin=2_500_000, smax=5_000_000, count=3,
         skills=["Mijozlarga xizmat", "Tezkorlik", "Jamoada ishlash", "Tozalik standartlari"],
         desc_uz="Restoranga ofitsiant kerak. Mehmonlarni kutib olasiz va buyurtmalarni qabul qilasiz. Talabalar uchun qulay.",
         desc_ru="В ресторан нужен официант. Встречаете гостей и принимаете заказы. Удобно для студентов.",
         resp=["Mehmonlarni kutib olish", "Buyurtma qabul qilish", "Stollarni tayyorlash"],
         req=["Xushmuomalalik", "Tajriba shart emas", "Smenali grafik"]),
    dict(key="barista", cat="restaurant", title="Barista", exp="intern", jt="shift",
         smin=2_500_000, smax=5_500_000, count=2,
         skills=["Mijozlarga xizmat", "Tezkorlik", "POS terminal", "Tozalik standartlari"],
         desc_uz="Kofejonaga barista kerak. Qahva tayyorlaysiz va mijozlarga xizmat ko'rsatasiz. O'rgatamiz.",
         desc_ru="В кофейню нужен бариста. Готовите кофе и обслуживаете клиентов. Обучаем.",
         resp=["Qahva tayyorlash", "Mijozlarga xizmat", "Ish joyini tozalash"],
         req=["Xushmuomalalik", "Tajriba shart emas", "O'rganishga tayyorlik"]),
    dict(key="oshpaz-yordam", cat="restaurant", title="Oshpaz yordamchisi", exp="intern", jt="shift",
         smin=2_500_000, smax=5_000_000, count=2,
         skills=["Tezkorlik", "Tozalik standartlari", "Jamoada ishlash", "Mas'uliyat"],
         desc_uz="Restoran oshxonasiga oshpaz yordamchisi kerak. Mahsulotlarni tayyorlash va oshxonada tartibni saqlaysiz.",
         desc_ru="На кухню ресторана нужен помощник повара. Готовите продукты и поддерживаете порядок на кухне.",
         resp=["Mahsulot tayyorlash", "Oshpazga ko'maklashish", "Oshxona tozaligi"],
         req=["Mehnatsevarlik", "Tajriba shart emas", "Sanitariya talablari"]),
    dict(key="fastfood-operator", cat="restaurant", title="Fast food operator", exp="intern", jt="shift",
         smin=2_500_000, smax=4_500_000, count=2,
         skills=["Tezkorlik", "Mijozlarga xizmat", "POS terminal", "Jamoada ishlash"],
         desc_uz="Tez tayyor ovqat restoraniga operator kerak. Buyurtmalarni qabul qilib, tayyorlashda qatnashasiz.",
         desc_ru="В ресторан быстрого питания нужен оператор. Принимаете заказы и участвуете в приготовлении.",
         resp=["Buyurtma qabul qilish", "Tayyorlashda ishtirok", "Tozalikni saqlash"],
         req=["Tezkorlik", "Tajriba shart emas", "Smenali grafik"]),
    dict(key="restoran-admin-yordam", cat="restaurant", title="Restoran administrator yordamchisi", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_000_000, count=1,
         skills=["Mijozlarga xizmat", "Rejalashtirish", "Jamoada ishlash", "Tezkorlik"],
         desc_uz="Restoranga administrator yordamchisi kerak. Zal ishini tashkil qilib, mehmonlar bilan ishlaysiz.",
         desc_ru="В ресторан нужен помощник администратора. Организуете работу зала и работаете с гостями.",
         resp=["Zalni nazorat", "Bron qabul qilish", "Xodimlarga ko'maklashish"],
         req=["Tashkilotchilik", "Muloqot ko'nikmalari", "Boshlang'ich tajriba"]),
    dict(key="hostess", cat="restaurant", title="Hostess", exp="intern", jt="shift",
         smin=2_500_000, smax=4_500_000, count=1,
         skills=["Mijozlarga xizmat", "Muomala madaniyati", "Tashqi ko'rinish", "Tezkorlik"],
         desc_uz="Restoranga hostess kerak. Mehmonlarni kutib olib, joylashtirasiz.",
         desc_ru="В ресторан нужна хостес. Встречаете и рассаживаете гостей.",
         resp=["Mehmonlarni kutib olish", "Joylashtirish", "Bron yuritish"],
         req=["Xushmuomalalik", "Ozodalik", "Tajriba shart emas"]),

    # ----- F) Admin / Office -----
    dict(key="ofis-admin", cat="admin", title="Ofis administrator", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_000_000, count=3,
         skills=["MS Office", "Telefon muloqoti", "Rejalashtirish", "Hujjatlar bilan ishlash"],
         desc_uz="Ofisga administrator kerak. Ofis ishini tashkil qilib, qo'ng'iroq va mehmonlarni qabul qilasiz.",
         desc_ru="В офис нужен администратор. Организуете работу офиса, принимаете звонки и гостей.",
         resp=["Ofis ishini tashkil qilish", "Qo'ng'iroqlar", "Hujjatlar"],
         req=["MS Office", "Tashkilotchilik", "Muloqot ko'nikmalari"]),
    dict(key="receptionist", cat="admin", title="Receptionist", exp="intern", jt="shift",
         smin=2_500_000, smax=5_000_000, count=2,
         skills=["Mijozlarga xizmat", "Telefon muloqoti", "MS Office", "Muomala madaniyati"],
         desc_uz="Qabulxonaga receptionist kerak. Mehmonlarni kutib olib, qo'ng'iroqlarni boshqarasiz.",
         desc_ru="На ресепшн нужен ресепшионист. Встречаете гостей и управляете звонками.",
         resp=["Mehmonlarni kutib olish", "Qo'ng'iroqlarni yo'naltirish", "Hujjatlar"],
         req=["Xushmuomalalik", "O'zbek/rus tili", "Tajriba shart emas"]),
    dict(key="hujjat-yordam", cat="admin", title="Hujjatlar bilan ishlash bo'yicha yordamchi", exp="junior", jt="full_time",
         smin=3_000_000, smax=5_500_000, count=1,
         skills=["Hujjatlar bilan ishlash", "MS Office", "Diqqatlilik", "Rejalashtirish"],
         desc_uz="Ofisga hujjatlar bo'yicha yordamchi kerak. Hujjatlarni rasmiylashtirib, arxivni yuritasiz.",
         desc_ru="В офис нужен помощник по работе с документами. Оформляете документы и ведёте архив.",
         resp=["Hujjatlarni rasmiylashtirish", "Arxiv", "Skanerlash va saqlash"],
         req=["Diqqatlilik", "MS Office", "Mas'uliyat"]),
    dict(key="operator", cat="admin", title="Operator", exp="intern", jt="full_time",
         smin=2_500_000, smax=4_500_000, count=1,
         skills=["Telefon muloqoti", "Diqqatlilik", "MS Office", "Sabr-toqat"],
         desc_uz="Ofisga operator kerak. Qo'ng'iroqlarga javob berib, ma'lumotlarni kiritasiz.",
         desc_ru="В офис нужен оператор. Отвечаете на звонки и вносите данные.",
         resp=["Qo'ng'iroqlar", "Ma'lumot kiritish", "Hisobot"],
         req=["Tushunarli nutq", "Kompyuterni bilish", "Tajriba shart emas"]),
    dict(key="office-manager-assistant", cat="admin", title="Office manager assistant", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_000_000, count=1,
         skills=["MS Office", "Google Sheets", "Rejalashtirish", "Hujjatlar bilan ishlash"],
         desc_uz="Office menejerga yordamchi kerak. Kunlik ofis jarayonlarini tashkil qilasiz.",
         desc_ru="Нужен помощник офис-менеджера. Организуете ежедневные офисные процессы.",
         resp=["Ofis ta'minoti", "Jadval va uchrashuvlar", "Hujjatlar"],
         req=["Tashkilotchilik", "MS Office", "Mas'uliyat"]),
    dict(key="data-entry", cat="admin", title="Data entry operator", exp="intern", jt="part_time",
         smin=2_000_000, smax=4_000_000, count=1,
         skills=["MS Office", "Google Sheets", "Diqqatlilik", "Tezkorlik"],
         desc_uz="Ma'lumot kiritish operatori kerak. Ma'lumotlarni tizimga kiritib, tekshirasiz. Talabalar uchun qulay.",
         desc_ru="Нужен оператор ввода данных. Вносите и проверяете данные в системе. Удобно для студентов.",
         resp=["Ma'lumot kiritish", "Tekshirish", "Jadvallarni yangilash"],
         req=["Diqqatlilik", "Tez yozish", "Excel/Sheets"]),

    # ----- G) Finance / Accounting -----
    dict(key="buxgalter-yordam", cat="finance", title="Buxgalter yordamchisi", exp="junior", jt="full_time",
         smin=3_000_000, smax=7_000_000, count=2,
         skills=["Excel", "1C basics", "Hisobot", "Diqqatlilik"],
         desc_uz="Buxgalteriyaga yordamchi kerak. Hujjatlarni tayyorlab, hisobotlarda ko'maklashasiz.",
         desc_ru="В бухгалтерию нужен помощник. Готовите документы и помогаете с отчётностью.",
         resp=["Hujjatlarni tayyorlash", "Hisobotlarda ko'maklashish", "1C bilan ishlash"],
         req=["Excel", "1C asoslari", "Diqqatlilik"]),
    dict(key="junior-accountant", cat="finance", title="Junior accountant", exp="junior", jt="full_time",
         smin=3_500_000, smax=7_000_000, count=1,
         skills=["1C basics", "Excel", "Hisobot", "Hujjatlar"],
         desc_uz="Kompaniyaga junior buxgalter kerak. Birlamchi hujjatlar va hisobotlar bilan ishlaysiz.",
         desc_ru="Компании нужен junior-бухгалтер. Работаете с первичными документами и отчётами.",
         resp=["Birlamchi hujjatlar", "Hisobotlar", "Bank operatsiyalari"],
         req=["Buxgalteriya asoslari", "1C", "Diqqatlilik"]),
    dict(key="hisobot-yordam", cat="finance", title="Hisobot tayyorlash yordamchisi", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_000_000, count=1,
         skills=["Excel", "Hisobot", "Diqqatlilik", "1C basics"],
         desc_uz="Moliya bo'limiga hisobot tayyorlash yordamchisi kerak. Excelda hisobotlar tuzasiz.",
         desc_ru="В финотдел нужен помощник по подготовке отчётов. Готовите отчёты в Excel.",
         resp=["Hisobot tuzish", "Ma'lumot yig'ish", "Tahlilda ko'maklashish"],
         req=["Excel (kuchli)", "Diqqatlilik", "Boshlang'ich tajriba"]),
    dict(key="kassir-buxgalter", cat="finance", title="Kassir-buxgalter", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_000_000, count=1,
         skills=["Kassada ishlash", "1C basics", "Diqqatlilik", "Hujjatlar"],
         desc_uz="Kassir-buxgalter kerak. Naqd operatsiyalarni yuritib, kassani hisobga olasiz.",
         desc_ru="Нужен кассир-бухгалтер. Ведёте кассовые операции и учёт кассы.",
         resp=["Naqd operatsiyalar", "Kassa hisobi", "Hujjatlar"],
         req=["Diqqatlilik", "1C asoslari", "Mas'uliyat"]),
    dict(key="moliya-intern", cat="finance", title="Moliya bo'limi intern", exp="intern", jt="internship",
         smin=2_000_000, smax=4_000_000, count=1,
         skills=["Excel", "Diqqatlilik", "Hisobot", "O'rganishga tayyorlik"],
         desc_uz="Moliya bo'limiga intern kerak. Hujjatlar va hisobotlar bilan ishlashni o'rganasiz. Talabalar uchun.",
         desc_ru="В финотдел нужен стажёр. Учитесь работать с документами и отчётами. Для студентов.",
         resp=["Hujjatlarni saralash", "Excelda ishlash", "Bo'limga ko'maklashish"],
         req=["Talaba/bitiruvchi", "Excel", "O'rganishga ishtiyoq"]),

    # ----- H) Marketing / Media -----
    dict(key="smm-assistant", cat="marketing", title="SMM assistant", exp="intern", jt="part_time",
         smin=2_500_000, smax=6_000_000, count=2,
         skills=["SMM", "Instagram", "Canva", "Copywriting"],
         desc_uz="SMM yordamchisi kerak. Ijtimoiy tarmoqlar uchun post tayyorlab, jadvalga joylaysiz. Talabalar uchun.",
         desc_ru="Нужен SMM-ассистент. Готовите посты для соцсетей и публикуете по графику. Для студентов.",
         resp=["Post tayyorlash", "Stories", "Kommentlar bilan ishlash"],
         req=["Instagram/Telegram", "Canva", "Ijodkorlik"]),
    dict(key="content-manager", cat="marketing", title="Content manager", exp="junior", jt="full_time",
         smin=3_000_000, smax=8_000_000, count=2,
         skills=["Copywriting", "SMM", "Canva", "Instagram"],
         desc_uz="Kompaniyaga content menejer kerak. Brend uchun matn va vizual kontent tayyorlaysiz.",
         desc_ru="Компании нужен контент-менеджер. Готовите тексты и визуальный контент для бренда.",
         resp=["Kontent rejasi", "Matn yozish", "Vizual tayyorlash"],
         req=["Copywriting", "Ijodkorlik", "Canva/Figma asoslari"]),
    dict(key="targetolog-yordam", cat="marketing", title="Targetolog yordamchisi", exp="junior", jt="full_time",
         smin=3_000_000, smax=7_000_000, count=1,
         skills=["Ads basics", "Instagram", "SMM", "Diqqatlilik"],
         desc_uz="Marketing agentligiga targetolog yordamchisi kerak. Reklama kampaniyalarini sozlashda ko'maklashasiz.",
         desc_ru="В агентство нужен помощник таргетолога. Помогаете настраивать рекламные кампании.",
         resp=["Reklama sozlash", "Natijalarni kuzatish", "Hisobot"],
         req=["Reklama asoslari", "Tahlilga qiziqish", "O'rganishga tayyorlik"]),
    dict(key="video-montaj-yordam", cat="marketing", title="Video montaj yordamchisi", exp="intern", jt="part_time",
         smin=2_500_000, smax=6_000_000, count=1,
         skills=["Video montaj", "Canva", "Ijodkorlik", "Diqqatlilik"],
         desc_uz="Media agentligiga video montaj yordamchisi kerak. Qisqa rolik va Reels montaj qilasiz.",
         desc_ru="В медиа-агентство нужен помощник видеомонтажёра. Монтируете короткие ролики и Reels.",
         resp=["Video montaj", "Subtitr qo'shish", "Materiallarni saralash"],
         req=["Montaj dasturlari asoslari", "Ijodkorlik", "Talabalik mos keladi"]),
    dict(key="copywriter-intern", cat="marketing", title="Copywriter intern", exp="intern", jt="internship",
         smin=2_000_000, smax=5_000_000, count=1,
         skills=["Copywriting", "SMM", "O'rganishga tayyorlik", "Uzbek/Russian communication"],
         desc_uz="Copywriter intern kerak. Reklama va post matnlarini yozishni o'rganasiz. Talabalar uchun.",
         desc_ru="Нужен copywriter-стажёр. Учитесь писать рекламные и контент-тексты. Для студентов.",
         resp=["Matn yozish", "Sarlavhalar", "Tahrir qilish"],
         req=["Yozish qobiliyati", "O'zbek/rus tili", "Ijodkorlik"]),
    dict(key="instagram-admin", cat="marketing", title="Instagram administrator", exp="junior", jt="part_time",
         smin=2_500_000, smax=6_000_000, count=1,
         skills=["Instagram", "SMM", "Mijozlar bilan muloqot", "Canva"],
         desc_uz="Instagram administratori kerak. Sahifani yuritib, mijozlar bilan muloqot qilasiz.",
         desc_ru="Нужен администратор Instagram. Ведёте страницу и общаетесь с клиентами.",
         resp=["Sahifani yuritish", "Direct javoblari", "Post joylash"],
         req=["Instagram tajribasi", "Muloqot ko'nikmalari", "Ijodkorlik"]),

    # ----- I) Beauty / Service -----
    dict(key="salon-admin", cat="beauty", title="Salon administrator", exp="junior", jt="shift",
         smin=3_000_000, smax=6_000_000, count=1,
         skills=["Mijozlarga xizmat", "CRM", "Telefon muloqoti", "Rejalashtirish"],
         desc_uz="Go'zallik saloniga administrator kerak. Mijozlarni yozib, ustalar jadvalini boshqarasiz.",
         desc_ru="В салон красоты нужен администратор. Записываете клиентов и ведёте график мастеров.",
         resp=["Mijozlarni yozish", "Jadval boshqarish", "To'lovlar"],
         req=["Tashkilotchilik", "Xushmuomalalik", "Boshlang'ich tajriba"]),
    dict(key="manikur-usta-yordam", cat="beauty", title="Manikyur ustasi yordamchisi", exp="intern", jt="full_time",
         smin=2_500_000, smax=6_000_000, count=1,
         skills=["Mijoz bilan ishlash", "Diqqatlilik", "Tozalik standartlari", "Ijodkorlik"],
         desc_uz="Manikyur ustasiga yordamchi kerak. Mijozlarga xizmat ko'rsatishni o'rganasiz. O'rgatamiz.",
         desc_ru="Нужен помощник мастера маникюра. Учитесь обслуживать клиентов. Обучаем.",
         resp=["Ustaga ko'maklashish", "Ish joyini tayyorlash", "Mijozlarga xizmat"],
         req=["Aniqlik", "O'rganishga tayyorlik", "Tajriba shart emas"]),
    dict(key="kosmetolog-assistant", cat="beauty", title="Kosmetolog assistant", exp="intern", jt="full_time",
         smin=3_000_000, smax=7_000_000, count=1,
         skills=["Mijoz bilan ishlash", "Tozalik standartlari", "Diqqatlilik"],
         desc_uz="Klinikaga kosmetolog assistenti kerak. Muolajalarda yordam berib, mijozlarni tayyorlaysiz.",
         desc_ru="В клинику нужен ассистент косметолога. Помогаете на процедурах и готовите клиентов.",
         resp=["Muolajaga tayyorlash", "Mijozlarga maslahat", "Tozalikni saqlash"],
         req=["Tibbiyot/kosmetologiyaga qiziqish", "Aniqlik", "Xushmuomalalik"]),
    dict(key="mijoz-menejer", cat="beauty", title="Mijozlar bilan ishlash menejeri", exp="junior", jt="full_time",
         smin=3_000_000, smax=6_500_000, count=1,
         skills=["Mijozlar bilan muloqot", "CRM", "Sotuv ko'nikmalari", "Telefon muloqoti"],
         desc_uz="Salon/klinikaga mijozlar bilan ishlash menejeri kerak. Mijoz bazasini yuritasiz.",
         desc_ru="В салон/клинику нужен менеджер по работе с клиентами. Ведёте клиентскую базу.",
         resp=["Mijozlar bilan aloqa", "Qayta yozuv", "Shikoyatlar bilan ishlash"],
         req=["Muloqot ko'nikmalari", "CRM", "Stress-bardoshlik"]),
    dict(key="booking-operator", cat="beauty", title="Booking operator", exp="intern", jt="shift",
         smin=2_500_000, smax=4_500_000, count=1,
         skills=["Telefon muloqoti", "CRM", "Diqqatlilik", "Mijozlarga xizmat"],
         desc_uz="Booking operatori kerak. Telefon va Instagram orqali yozuvlarni qabul qilasiz.",
         desc_ru="Нужен оператор записи. Принимаете записи по телефону и в Instagram.",
         resp=["Yozuvlarni qabul qilish", "Jadvalni yangilash", "Eslatma yuborish"],
         req=["Tushunarli nutq", "Diqqatlilik", "Tajriba shart emas"]),

    # ----- J) IT / Digital (~20%) -----
    dict(key="frontend", cat="it", title="Junior Frontend Developer", exp="junior", jt="hybrid",
         smin=5_000_000, smax=12_000_000, count=4,
         skills=["HTML", "CSS", "JavaScript", "React", "Git"],
         desc_uz="Junior frontend dasturchi kerak. Veb-interfeyslarni ishlab chiqishda jamoaga qo'shilasiz.",
         desc_ru="Нужен junior frontend-разработчик. Присоединяетесь к команде по разработке веб-интерфейсов.",
         resp=["UI komponentlar yaratish", "Buglarni tuzatish", "Mentor bilan ishlash"],
         req=["HTML/CSS/JS", "React asoslari", "Git"]),
    dict(key="backend", cat="it", title="Junior Python Backend Developer", exp="junior", jt="hybrid",
         smin=5_000_000, smax=12_000_000, count=3,
         skills=["Python", "SQL", "Git", "REST API"],
         desc_uz="Junior Python backend dasturchi kerak. API va xizmatlarni ishlab chiqasiz.",
         desc_ru="Нужен junior Python backend-разработчик. Разрабатываете API и сервисы.",
         resp=["API yozish", "Testlar", "Ma'lumotlar bazasi bilan ishlash"],
         req=["Python", "SQL asoslari", "Git"]),
    dict(key="qa-intern", cat="it", title="QA Intern", exp="intern", jt="internship",
         smin=3_000_000, smax=6_000_000, count=3,
         skills=["Diqqatlilik", "SQL", "Git", "O'rganishga tayyorlik"],
         desc_uz="QA intern kerak. Mahsulotni test qilib, xatoliklarni qayd etishni o'rganasiz. Talabalar uchun.",
         desc_ru="Нужен QA-стажёр. Учитесь тестировать продукт и фиксировать баги. Для студентов.",
         resp=["Test holatlari", "Buglarni qayd etish", "Hisobot"],
         req=["Diqqatlilik", "Mantiqiy fikrlash", "O'rganishga ishtiyoq"]),
    dict(key="uiux-intern", cat="it", title="UI/UX Designer Intern", exp="intern", jt="internship",
         smin=3_000_000, smax=6_000_000, count=2,
         skills=["Figma", "UX Research", "Ijodkorlik", "Diqqatlilik"],
         desc_uz="UI/UX dizayner intern kerak. Figma'da interfeys maketlarini tayyorlashni o'rganasiz.",
         desc_ru="Нужен UI/UX-дизайнер стажёр. Учитесь готовить макеты интерфейсов в Figma.",
         resp=["Maket tayyorlash", "Prototip", "Jamoadan fikr olish"],
         req=["Figma asoslari", "Ijodkorlik", "Talabalik mos keladi"]),
    dict(key="tgbot-intern", cat="it", title="Telegram Bot Developer Intern", exp="intern", jt="remote",
         smin=3_000_000, smax=7_000_000, count=2,
         skills=["Python", "Git", "REST API", "O'rganishga tayyorlik"],
         desc_uz="Telegram bot dasturchi intern kerak. Python'da botlar yaratishni o'rganasiz. Remote.",
         desc_ru="Нужен стажёр-разработчик Telegram-ботов. Учитесь создавать ботов на Python. Удалённо.",
         resp=["Bot funksiyalari", "API integratsiya", "Test qilish"],
         req=["Python asoslari", "Git", "Mustaqillik"]),
    dict(key="data-analyst", cat="it", title="Junior Data Analyst", exp="junior", jt="full_time",
         smin=4_500_000, smax=10_000_000, count=3,
         skills=["SQL", "Excel", "Python", "Diqqatlilik"],
         desc_uz="Junior data analyst kerak. Ma'lumotlarni tahlil qilib, hisobot va dashboardlar tayyorlaysiz.",
         desc_ru="Нужен junior data analyst. Анализируете данные и готовите отчёты и дашборды.",
         resp=["Ma'lumot tahlili", "Dashboard", "Biznesga insight"],
         req=["SQL", "Excel", "Python asoslari"]),
    dict(key="it-support", cat="it", title="IT Support Specialist", exp="junior", jt="full_time",
         smin=4_000_000, smax=8_000_000, count=2,
         skills=["Diqqatlilik", "Mijozlarga xizmat", "Git", "O'rganishga tayyorlik"],
         desc_uz="IT support mutaxassisi kerak. Foydalanuvchilarning texnik muammolarini hal qilasiz.",
         desc_ru="Нужен специалист IT-поддержки. Решаете технические вопросы пользователей.",
         resp=["So'rovlarni hal qilish", "Texnika sozlash", "Hujjatlashtirish"],
         req=["Texnikaga qiziqish", "Muloqot", "Mas'uliyat"]),
    dict(key="mobile-intern", cat="it", title="Junior Mobile Developer", exp="junior", jt="hybrid",
         smin=5_000_000, smax=11_000_000, count=2,
         skills=["Git", "JavaScript", "REST API", "O'rganishga tayyorlik"],
         desc_uz="Junior mobil dasturchi kerak. Mobil ilovalar ishlab chiqishda jamoaga qo'shilasiz.",
         desc_ru="Нужен junior mobile-разработчик. Присоединяетесь к команде разработки мобильных приложений.",
         resp=["Ilova ekranlari", "API integratsiya", "Test qilish"],
         req=["Dasturlash asoslari", "Git", "O'rganishga ishtiyoq"]),

    # ----- K) Mid / senior roles (~10% — career progression) -----
    dict(key="restoran-admin", cat="restaurant", title="Restoran administratori", exp="mid", jt="full_time",
         smin=5_000_000, smax=9_000_000, count=2,
         skills=["Mijozlarga xizmat", "Rejalashtirish", "Jamoada ishlash", "CRM"],
         desc_uz="Restoranga tajribali administrator kerak. Zal va xizmat ko'rsatish jarayonini boshqarasiz.",
         desc_ru="В ресторан нужен опытный администратор. Управляете залом и процессом обслуживания.",
         resp=["Zalni boshqarish", "Xodimlar jadvali", "Sifat nazorati"],
         req=["1+ yil tajriba", "Tashkilotchilik", "Muloqot ko'nikmalari"]),
    dict(key="marketing-menejer", cat="marketing", title="Marketing menejeri", exp="mid", jt="full_time",
         smin=6_000_000, smax=12_000_000, count=2,
         skills=["SMM", "Ads basics", "Copywriting", "Rejalashtirish"],
         desc_uz="Marketing menejeri kerak. Marketing strategiyasini ishlab chiqib, kampaniyalarni boshqarasiz.",
         desc_ru="Нужен менеджер по маркетингу. Разрабатываете стратегию и управляете кампаниями.",
         resp=["Strategiya", "Kampaniyalar", "Jamoani boshqarish"],
         req=["2+ yil tajriba", "Marketing bilimi", "Tahliliy fikrlash"]),
    dict(key="logistika-menejer", cat="logistics", title="Logistika menejeri", exp="mid", jt="full_time",
         smin=6_000_000, smax=11_000_000, count=1,
         skills=["Rejalashtirish", "Excel", "1C basics", "Jamoada ishlash"],
         desc_uz="Logistika menejeri kerak. Yetkazib berish jarayonini va jamoani boshqarasiz.",
         desc_ru="Нужен менеджер по логистике. Управляете процессом доставки и командой.",
         resp=["Jarayonni boshqarish", "Jamoa", "KPI nazorati"],
         req=["2+ yil tajriba", "Tashkilotchilik", "Excel"]),
    dict(key="bosh-buxgalter", cat="finance", title="Buxgalter (tajribali)", exp="mid", jt="full_time",
         smin=6_000_000, smax=12_000_000, count=2,
         skills=["1C basics", "Excel", "Hisobot", "Hujjatlar"],
         desc_uz="Tajribali buxgalter kerak. Buxgalteriya hisobini to'liq yuritasiz.",
         desc_ru="Нужен опытный бухгалтер. Ведёте полный бухгалтерский учёт.",
         resp=["To'liq hisob", "Soliq hisobotlari", "Bank operatsiyalari"],
         req=["2+ yil tajriba", "1C", "Soliq qonunchiligini bilish"]),
    dict(key="fitnes-menejer", cat="fitness", title="Fitnes klub menejeri", exp="mid", jt="full_time",
         smin=6_000_000, smax=13_000_000, count=1,
         skills=["Mijoz bilan ishlash", "Sales basics", "Rejalashtirish", "Jamoada ishlash"],
         desc_uz="Fitnes klub menejeri kerak. Klub ishini va sotuvni boshqarasiz.",
         desc_ru="Нужен менеджер фитнес-клуба. Управляете работой клуба и продажами.",
         resp=["Klubni boshqarish", "Sotuv rejasi", "Jamoa"],
         req=["2+ yil tajriba", "Boshqaruv", "Sport sohasini bilish"]),
    dict(key="savdo-rahbar", cat="retail", title="Savdo bo'limi rahbari", exp="senior", jt="full_time",
         smin=8_000_000, smax=16_000_000, count=1,
         skills=["Savdo ko'nikmalari", "CRM", "Rejalashtirish", "Jamoada ishlash"],
         desc_uz="Savdo bo'limi rahbari kerak. Savdo jamoasini boshqarib, rejalarni bajarasiz.",
         desc_ru="Нужен руководитель отдела продаж. Управляете командой продаж и выполняете планы.",
         resp=["Jamoani boshqarish", "Savdo rejasi", "Mijozlar bilan ishlash"],
         req=["3+ yil tajriba", "Boshqaruv", "Savdo natijalari"]),
]


# =============================================================================
# JOB SEEKERS (25 — mixed fields, not only IT)
# =============================================================================
# email, name, phone, city, role(title), field(category), exp_years, skills,
# summary_uz, summary_ru, ats

SEEKER_DEFS = [
    # preserved canonical demo student
    dict(email="john@example.com", name="John Doe", phone="+998903333333", city="Tashkent",
         role="Junior Python Backend Developer", field="it", exp=1,
         skills=["Python", "SQL", "Git", "REST API", "FastAPI"],
         summary_uz="Python backend yo'nalishidagi junior dasturchi. API va ma'lumotlar bazasi bilan ishlashni biladi.",
         summary_ru="Junior-разработчик на Python backend. Умеет работать с API и базами данных.", ats=86),
    dict(email="azizbek.k@example.com", name="Azizbek Karimov", phone="+998901000001", city="Tashkent",
         role="Junior Frontend Developer", field="it", exp=1,
         skills=["HTML", "CSS", "JavaScript", "React", "Git"],
         summary_uz="Frontend yo'nalishidagi junior dasturchi, React bilan veb-ilovalar yaratadi.",
         summary_ru="Junior frontend-разработчик, создаёт веб-приложения на React.", ats=84),
    dict(email="malika.a@example.com", name="Malika Abdullayeva", phone="+998901000002", city="Tashkent",
         role="SMM Assistant", field="marketing", exp=1,
         skills=["SMM", "Instagram", "Canva", "Copywriting"],
         summary_uz="Ijtimoiy tarmoqlar uchun kontent tayyorlovchi SMM mutaxassisi.",
         summary_ru="SMM-специалист, готовит контент для социальных сетей.", ats=80),
    dict(email="diyorbek.t@example.com", name="Diyorbek Tursunov", phone="+998901000003", city="Tashkent",
         role="QA Intern", field="it", exp=0,
         skills=["Diqqatlilik", "SQL", "Git", "O'rganishga tayyorlik"],
         summary_uz="QA yo'nalishini o'rganayotgan talaba, test qilishga qiziqadi.",
         summary_ru="Студент, изучающий QA, интересуется тестированием.", ats=72),
    dict(email="shahzoda.r@example.com", name="Shahzoda Rahimova", phone="+998901000004", city="Samarkand",
         role="UI/UX Designer Intern", field="it", exp=0,
         skills=["Figma", "UX Research", "Ijodkorlik", "Canva"],
         summary_uz="UI/UX dizaynni o'rganayotgan ijodkor talaba.",
         summary_ru="Креативный студент, изучающий UI/UX-дизайн.", ats=74),
    dict(email="nilufar.s@example.com", name="Nilufar Saidova", phone="+998901000005", city="Tashkent",
         role="Customer Support / Call center operator", field="retail", exp=1,
         skills=["Telefon muloqoti", "CRM", "Mijozlarga xizmat", "Sabr-toqat"],
         summary_uz="Mijozlarga xizmat ko'rsatish tajribasiga ega operator.",
         summary_ru="Оператор с опытом обслуживания клиентов.", ats=78),
    dict(email="jamshid.e@example.com", name="Jamshid Ergashev", phone="+998901000006", city="Tashkent",
         role="Junior Data Analyst", field="it", exp=1,
         skills=["SQL", "Excel", "Python", "Diqqatlilik"],
         summary_uz="Ma'lumotlarni tahlil qilishga qiziqqan junior analitik.",
         summary_ru="Junior-аналитик, интересуется анализом данных.", ats=82),
    dict(email="madina.s@example.com", name="Madina Sobirova", phone="+998901000007", city="Tashkent",
         role="HR Assistant", field="admin", exp=1,
         skills=["MS Office", "Rejalashtirish", "Muloqot", "Hujjatlar bilan ishlash"],
         summary_uz="HR jarayonlariga qiziqqan, hujjatlar bilan ishlashni biladigan mutaxassis.",
         summary_ru="Специалист с интересом к HR, умеет работать с документами.", ats=79),
    dict(email="bekzod.i@example.com", name="Bekzod Ibragimov", phone="+998901000008", city="Tashkent",
         role="Junior Accountant", field="finance", exp=1,
         skills=["1C basics", "Excel", "Hisobot", "Diqqatlilik"],
         summary_uz="Buxgalteriya asoslarini biladigan junior buxgalter.",
         summary_ru="Junior-бухгалтер со знанием основ бухучёта.", ats=81),
    dict(email="zarnigor.x@example.com", name="Zarnigor Xolmatova", phone="+998901000009", city="Tashkent",
         role="Content Manager", field="marketing", exp=2,
         skills=["Copywriting", "SMM", "Canva", "Instagram"],
         summary_uz="Brendlar uchun kontent tayyorlash tajribasiga ega menejer.",
         summary_ru="Менеджер с опытом подготовки контента для брендов.", ats=83),
    dict(email="akmal.n@example.com", name="Akmal Nurmatov", phone="+998901000010", city="Tashkent",
         role="Logistics Coordinator Assistant", field="logistics", exp=1,
         skills=["Excel", "Rejalashtirish", "Telefon muloqoti", "Diqqatlilik"],
         summary_uz="Logistika jarayonlariga qiziqqan, jadval tuzishni biladigan mutaxassis.",
         summary_ru="Специалист по логистике, умеет составлять графики.", ats=77),
    dict(email="sevara.q@example.com", name="Sevara Qodirova", phone="+998901000011", city="Tashkent",
         role="Sales Manager Intern", field="retail", exp=0,
         skills=["Savdo ko'nikmalari", "Mijozlar bilan muloqot", "CRM", "Instagram"],
         summary_uz="Savdo sohasini o'rganayotgan faol talaba.",
         summary_ru="Активный студент, изучающий сферу продаж.", ats=73),
    dict(email="anvar.r@example.com", name="Anvar Raxmonov", phone="+998901000012", city="Tashkent",
         role="Haydovchi", field="logistics", exp=3,
         skills=["Haydovchilik guvohnomasi", "Shaharni bilish", "Punktuallik", "Mas'uliyat"],
         summary_uz="B toifa guvohnomaga ega, shaharni yaxshi biladigan haydovchi.",
         summary_ru="Водитель с правами категории B, хорошо знает город.", ats=70),
    dict(email="dilnoza.u@example.com", name="Dilnoza Usmonova", phone="+998901000013", city="Tashkent",
         role="Ingliz tili o'qituvchisi", field="education", exp=2,
         skills=["Dars tushuntirish", "Uzbek/Russian/English", "Test tayyorlash", "O'quvchilar bilan ishlash"],
         summary_uz="Ingliz tili o'qituvchisi, IELTS tayyorlash tajribasiga ega.",
         summary_ru="Преподаватель английского с опытом подготовки к IELTS.", ats=85),
    dict(email="rustam.q@example.com", name="Rustam Qodirov", phone="+998901000014", city="Tashkent",
         role="Fitness trener", field="fitness", exp=2,
         skills=["Trening dasturi", "Mijoz bilan ishlash", "Sport zali qoidalari", "Sog'lom turmush"],
         summary_uz="Sertifikatlangan fitnes trener, individual dasturlar tuzadi.",
         summary_ru="Сертифицированный фитнес-тренер, составляет индивидуальные программы.", ats=80),
    dict(email="mohira.e@example.com", name="Mohira Erkinova", phone="+998901000015", city="Samarkand",
         role="Kassir / sotuvchi", field="retail", exp=1,
         skills=["Kassada ishlash", "Mijozlarga xizmat", "POS terminal", "Diqqatlilik"],
         summary_uz="Kassa va savdo tajribasiga ega xushmuomala sotuvchi.",
         summary_ru="Вежливый продавец с опытом работы на кассе.", ats=75),
    dict(email="javohir.s@example.com", name="Javohir Saidov", phone="+998901000016", city="Tashkent",
         role="Kuryer", field="logistics", exp=0,
         skills=["Shaharni bilish", "Punktuallik", "Yandex/Map usage", "Mas'uliyat"],
         summary_uz="Tezkor va mas'uliyatli kuryer, shaharni yaxshi biladi.",
         summary_ru="Быстрый и ответственный курьер, хорошо знает город.", ats=68),
    dict(email="fotima.k@example.com", name="Fotima Karimova", phone="+998901000017", city="Tashkent",
         role="Ofis administrator", field="admin", exp=1,
         skills=["MS Office", "Telefon muloqoti", "Rejalashtirish", "Hujjatlar bilan ishlash"],
         summary_uz="Ofis ishini tashkil qilishni biladigan administrator.",
         summary_ru="Администратор, умеет организовать работу офиса.", ats=78),
    dict(email="shohruh.s@example.com", name="Shohruh Sobirov", phone="+998901000018", city="Tashkent",
         role="Barista", field="restaurant", exp=0,
         skills=["Mijozlarga xizmat", "Tezkorlik", "POS terminal", "Tozalik standartlari"],
         summary_uz="Qahva tayyorlashni o'rganayotgan, mehnatsevar talaba.",
         summary_ru="Трудолюбивый студент, учится готовить кофе.", ats=69),
    dict(email="maftuna.x@example.com", name="Maftuna Xudoyberdiyeva", phone="+998901000019", city="Tashkent",
         role="O'quv markazi administratori", field="education", exp=1,
         skills=["MS Office", "Telefon muloqoti", "Rejalashtirish", "Mijozlarga xizmat"],
         summary_uz="O'quv markazida administrator sifatida tajribaga ega mutaxassis.",
         summary_ru="Специалист с опытом администратора в учебном центре.", ats=77),
    dict(email="ibrohim.a@example.com", name="Ibrohim Akbarov", phone="+998901000020", city="Tashkent",
         role="Omborchi", field="logistics", exp=2,
         skills=["Diqqatlilik", "Mas'uliyat", "1C basics", "Jamoada ishlash"],
         summary_uz="Ombor hisobi bilan ishlagan, mas'uliyatli omborchi.",
         summary_ru="Ответственный кладовщик с опытом складского учёта.", ats=72),
    dict(email="gulnoza.m@example.com", name="Gulnoza Mirzaeva", phone="+998901000021", city="Bukhara",
         role="Salon administrator", field="beauty", exp=1,
         skills=["Mijozlarga xizmat", "CRM", "Telefon muloqoti", "Rejalashtirish"],
         summary_uz="Go'zallik salonida mijozlar bilan ishlash tajribasiga ega administrator.",
         summary_ru="Администратор с опытом работы с клиентами в салоне красоты.", ats=76),
    dict(email="sardor.b@example.com", name="Sardor Bekmurodov", phone="+998901000022", city="Andijan",
         role="Ofitsiant", field="restaurant", exp=1,
         skills=["Mijozlarga xizmat", "Tezkorlik", "Jamoada ishlash", "Tozalik standartlari"],
         summary_uz="Restoranda xizmat ko'rsatish tajribasiga ega ofitsiant.",
         summary_ru="Официант с опытом обслуживания в ресторане.", ats=71),
    dict(email="kamola.t@example.com", name="Kamola Tosheva", phone="+998901000023", city="Fergana",
         role="Buxgalter yordamchisi", field="finance", exp=1,
         skills=["Excel", "1C basics", "Hisobot", "Diqqatlilik"],
         summary_uz="Buxgalteriyada yordamchi sifatida ishlagan diqqatli mutaxassis.",
         summary_ru="Внимательный специалист с опытом помощника бухгалтера.", ats=79),
    dict(email="oybek.r@example.com", name="Oybek Rasulov", phone="+998901000024", city="Namangan",
         role="Sotuvchi-konsultant", field="retail", exp=0,
         skills=["Mijozlar bilan muloqot", "Savdo ko'nikmalari", "Mahsulotni tushuntirish", "O'rganishga tayyorlik"],
         summary_uz="Savdoni o'rganayotgan, muloqotga ochiq talaba.",
         summary_ru="Открытый к общению студент, изучающий продажи.", ats=70),
]


# =============================================================================
# NOTIFICATIONS (UZ + RU pools)
# =============================================================================

NOTIF_POOL = [
    ("Sizga mos yangi vakansiya topildi", "Найдена новая подходящая вакансия", "success"),
    ("Arizangiz ko'rib chiqildi", "Ваш отклик просмотрен", "info"),
    ("Siz suhbat bosqichiga o'tdingiz", "Вы прошли на этап собеседования", "success"),
    ("Rezyume profilingiz yangilandi", "Ваш профиль резюме обновлён", "info"),
    ("Yangi part-time ishlar qo'shildi", "Добавлены новые part-time вакансии", "info"),
]


# =============================================================================
# IDEMPOTENT UPSERT HELPERS
# =============================================================================

def upsert_admin(db) -> User:
    admin = db.query(User).filter(User.email == "admin@ishtop.uz").first()
    if admin:
        return admin
    admin = User(
        id=uuid4(), email="admin@ishtop.uz", full_name="System Admin",
        phone="+998901111111", role=UserRole.ADMIN,
        admin_role=AdminSubRole.SUPER_ADMIN.value,
        is_active_account=True, is_verified=True,
    )
    admin.set_password("Admin123!")
    db.add(admin)
    db.flush()
    return admin


def upsert_company(db, d: dict) -> User:
    user = db.query(User).filter(User.email == d["email"]).first()
    created = user is None
    if created:
        user = User(id=uuid4(), email=d["email"], role=UserRole.COMPANY)
        user.set_password("Company123!")
    user.full_name = d["contact"]
    user.company_name = d["name"]
    user.company_website = d["website"]
    user.location = loc(d["city"])
    user.bio = bi(d["bio_uz"], d["bio_ru"])
    user.company_founded_year = d["founded"]
    user.subscription_tier = "enterprise"
    user.is_active_account = True
    user.is_verified = True
    user.verification_state = "approved" if d["verified"] else "unverified"
    user.trust_badges = (["verified_business", "fast_response"] if d["verified"] else [])
    crng = rng_for("company", d["email"])
    user.employer_response_rate = round(crng.uniform(82, 97), 1) if d["verified"] else round(crng.uniform(55, 78), 1)
    user.employer_avg_response_hours = round(crng.uniform(2, 18), 1)
    user.privacy_settings = {"industry_uz": d["industry_uz"], "industry_ru": d["industry_ru"]}
    if created:
        db.add(user)
    db.flush()
    return user


def upsert_seeker(db, d: dict) -> User:
    user = db.query(User).filter(User.email == d["email"]).first()
    created = user is None
    if created:
        user = User(id=uuid4(), email=d["email"], role=UserRole.STUDENT)
        user.set_password("Student123!")
    user.full_name = d["name"]
    user.phone = d["phone"]
    user.location = loc(d["city"])
    user.bio = bi(d["summary_uz"], d["summary_ru"])
    user.is_active_account = True
    user.is_verified = True
    if created:
        db.add(user)
    db.flush()
    return user


def build_resume_content(d: dict) -> dict:
    return {
        "personal_info": {
            "name": d["name"], "email": d["email"],
            "phone": d["phone"], "location": loc(d["city"]),
        },
        "professional_summary": {"text": bi(d["summary_uz"], d["summary_ru"])},
        "work_experience": ([] if d["exp"] == 0 else [{
            "job_title": d["role"], "company_name": bil("Avvalgi ish joyi"),
            "location": d["city"], "start_date": "2023-01-01", "end_date": "present",
            "is_current": True,
            "responsibilities": [bil("Kundalik vazifalarni bajardi"), bil("Jamoa bilan ishladi")],
            "technologies_used": bil_list(d["skills"]),
        }]),
        "education": [{
            "institution_name": f"{d['city']} universiteti",
            "degree_type": bil("Bakalavr"), "field_of_study": bil("Tegishli yo'nalish"),
            "graduation_date": "2024-06-01",
        }],
        "skills": {
            "technical_skills": [{"category": bil("Asosiy"), "skills": bil_list(d["skills"])}],
            "soft_skills": bil_list(["Muloqot", "Jamoada ishlash", "Mas'uliyat", "O'rganishga tayyorlik"]),
        },
        "languages": [
            {"language": bil("O'zbek"), "level": bil("Ona tili")},
            {"language": bil("Rus"), "level": bil("Yaxshi")},
            {"language": bil("Ingliz"), "level": bil("O'rta")},
        ],
    }


def upsert_resume(db, user: User, d: dict) -> Resume:
    resume = db.query(Resume).filter(Resume.user_id == user.id, Resume.title == d["role"]).first()
    created = resume is None
    if created:
        resume = Resume(id=uuid4(), user_id=user.id, title=d["role"])
    resume.status = "published"
    resume.content = build_resume_content(d)
    resume.raw_text = f"{d['role']} | {' | '.join(d['skills'])}"
    resume.ats_score = d["ats"]
    resume.view_count = 15 + (d["ats"] % 23)
    if created:
        db.add(resume)
    db.flush()
    return resume


def upsert_job(db, company: User, role: dict, city: str) -> Job:
    title = role["title"]
    location = loc(city)
    jrng = rng_for("job", company.id, title, location)
    job = db.query(Job).filter(
        Job.company_id == company.id, Job.title == title, Job.location == location
    ).first()
    created = job is None
    if created:
        job = Job(id=uuid4(), company_id=company.id, title=title, location=location)
        # realistic created_at in the past 1..45 days
        job.created_at = days_ago(jrng.randint(1, 45))
    job.description = bi(role["desc_uz"], role["desc_ru"])
    job.requirements = bil_list(role["req"])
    job.responsibilities = bil_list(role["resp"])
    job.benefits = bil_list(B)
    job.salary_min = role["smin"]
    job.salary_max = role["smax"]
    job.salary_currency = "UZS"
    job.is_salary_visible = True
    jt = role["jt"]
    if jt == "shift":  # model has no "shift" → represent as part_time
        jt = "part_time"
    job.job_type = jt
    job.is_remote_allowed = jt in {"remote", "hybrid"}
    job.experience_level = role["exp"]
    job.status = JobStatus.ACTIVE.value
    job.views_count = jrng.randint(20, 320)
    job.trust_score = round(jrng.uniform(72, 94), 1) if company.verification_state == "approved" else round(jrng.uniform(45, 70), 1)
    job.is_featured = jrng.random() < 0.12
    job.expires_at = NOW + timedelta(days=jrng.randint(15, 45))
    job.sync_discovery_slugs(company_name=company.company_name, company_full_name=company.full_name)
    if created:
        db.add(job)
    db.flush()
    return job


def upsert_saved_job(db, user: User, job: Job) -> bool:
    exists = db.query(SavedJob).filter(SavedJob.user_id == user.id, SavedJob.job_id == job.id).first()
    if exists:
        return False
    db.add(SavedJob(id=uuid4(), user_id=user.id, job_id=job.id))
    return True


def match_breakdown(score: int, job_reqs: list, skills: list) -> dict:
    sset = {s.lower() for s in skills}
    matched = [r for r in job_reqs if r.lower() in sset]
    missing = [r for r in job_reqs if r.lower() not in sset]
    return {
        "score": float(score),
        "matched_skills": matched,
        "missing_skills": missing,
        "reasons": [
            "Ko'nikmalar vakansiya talablariga mos keladi",
            "Profil to'liqligi va tajriba hisobga olindi",
        ],
    }


STATUS_WEIGHTS = [
    (ApplicationStatus.PENDING.value, 28),
    (ApplicationStatus.REVIEWING.value, 22),
    (ApplicationStatus.SHORTLISTED.value, 16),
    (ApplicationStatus.INTERVIEW.value, 14),
    (ApplicationStatus.REJECTED.value, 12),
    (ApplicationStatus.ACCEPTED.value, 5),
    (ApplicationStatus.HIRED.value, 3),
]


def pick_status(arng: random.Random) -> str:
    r = arng.uniform(0, sum(w for _, w in STATUS_WEIGHTS))
    upto = 0
    for status, w in STATUS_WEIGHTS:
        upto += w
        if r <= upto:
            return status
    return ApplicationStatus.PENDING.value


def upsert_application(db, user: User, job: Job, resume: Resume, skills: list) -> bool:
    exists = db.query(Application).filter(
        Application.user_id == user.id, Application.job_id == job.id
    ).first()
    if exists:
        return False

    # all attributes derive from a stable per-(user,job) RNG → reproducible
    arng = rng_for("app", user.id, job.id)

    # deterministic match score from skill overlap (compare on the UZ half)
    reqs = [uz_part(r) for r in (job.requirements or [])]
    overlap = len({s.lower() for s in skills} & {r.lower() for r in reqs})
    base = 55 + overlap * 12 + arng.randint(-5, 8)
    score = max(40, min(98, base))
    status = pick_status(arng)
    applied = days_ago(arng.randint(1, 20))

    reviewed_at = interview_at = decided_at = None
    interview_type = meeting_link = None
    if status in {
        ApplicationStatus.REVIEWING.value, ApplicationStatus.SHORTLISTED.value,
        ApplicationStatus.INTERVIEW.value, ApplicationStatus.ACCEPTED.value,
        ApplicationStatus.REJECTED.value, ApplicationStatus.HIRED.value,
    }:
        reviewed_at = applied + timedelta(days=1)
    if status == ApplicationStatus.INTERVIEW.value:
        interview_at = NOW + timedelta(days=arng.randint(1, 5))
        interview_type = "video"
        meeting_link = "https://meet.google.com/ishtop-interview"
    if status in {ApplicationStatus.ACCEPTED.value, ApplicationStatus.REJECTED.value, ApplicationStatus.HIRED.value}:
        decided_at = applied + timedelta(days=3)

    db.add(Application(
        id=uuid4(), job_id=job.id, user_id=user.id, resume_id=resume.id,
        status=status,
        cover_letter=(
            f"Assalomu alaykum! Men {job.title} lavozimiga qiziqyapman. "
            f"Ko'nikmalarim va mas'uliyatim ushbu ishga mos keladi deb o'ylayman."
        ),
        notes="Demo ariza — suhbat va keyingi bosqichlar shu yerda yuritiladi.",
        match_score=f"{score}%",
        match_breakdown=match_breakdown(score, reqs, skills),
        applied_at=applied, reviewed_at=reviewed_at,
        interview_at=interview_at, interview_type=interview_type, meeting_link=meeting_link,
        decided_at=decided_at,
    ))
    return True


def upsert_notification(db, user: User, title: str, message: str, ntype: str) -> bool:
    exists = db.query(Notification).filter(
        Notification.user_id == user.id, Notification.title == title
    ).first()
    if exists:
        return False
    is_read = rng_for("notif", user.id, title).random() < 0.4
    db.add(Notification(
        id=uuid4(), user_id=user.id, title=title,
        message=message, type=ntype, link="/student/jobs", is_read=is_read,
    ))
    return True


# =============================================================================
# CATEGORY → COMPANIES MAP (for distributing jobs)
# =============================================================================

def build_category_map(companies: dict) -> dict:
    cat_map: dict = {}
    for d in COMPANY_DEFS:
        comp = companies[d["email"]]
        for c in d["cats"]:
            cat_map.setdefault(c, []).append(comp)
    return cat_map


# =============================================================================
# RESET (guarded)
# =============================================================================

def reset_all(db) -> None:
    print("⚠️  ALLOW_DEMO_SEED_RESET=true — wiping demo data...")
    db.query(Application).delete()
    db.query(SavedJob).delete()
    db.query(Notification).delete()
    db.query(Job).delete()
    db.query(Resume).delete()
    db.query(User).delete()
    db.commit()
    print("✅ Data cleared\n")


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    reset_requested = "--reset" in sys.argv
    reset_allowed = os.getenv("ALLOW_DEMO_SEED_RESET", "").strip().lower() == "true"

    print("\n" + "=" * 70)
    print("🌱 IshTop demo seed (Uzbekistan mixed market)")
    print("=" * 70 + "\n")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if reset_requested:
            if not reset_allowed:
                print("❌ --reset requires ALLOW_DEMO_SEED_RESET=true. Aborting (no changes).")
                return
            reset_all(db)

        # --- users ---
        upsert_admin(db)
        companies = {d["email"]: upsert_company(db, d) for d in COMPANY_DEFS}
        seekers = {d["email"]: upsert_seeker(db, d) for d in SEEKER_DEFS}
        db.commit()

        # --- resumes (field-matched) ---
        resumes = {}
        for d in SEEKER_DEFS:
            resumes[d["email"]] = upsert_resume(db, seekers[d["email"]], d)
        db.commit()

        # --- jobs (distributed across companies by category) ---
        cat_map = build_category_map(companies)
        all_jobs: list[Job] = []
        for idx, role in enumerate(ROLE_TEMPLATES):
            comps = cat_map.get(role["cat"], [])
            if not comps:
                continue
            for i in range(role.get("count", 1)):
                company = comps[(idx + i) % len(comps)]
                # i==0 → company's own city; later placements spread across the country
                if role["jt"] in ("remote",):
                    city = "Remote"
                elif i == 0:
                    city = company.location.split(",")[0]
                else:
                    city = CITY_POOL[(idx + i) % len(CITY_POOL)]
                all_jobs.append(upsert_job(db, company, role, city))
        db.commit()

        # --- applications (field-aware: seekers apply to jobs in their field) ---
        jobs_by_cat: dict = {}
        role_cat_by_title = {r["title"]: r["cat"] for r in ROLE_TEMPLATES}
        for job in all_jobs:
            cat = role_cat_by_title.get(job.title, "other")
            jobs_by_cat.setdefault(cat, []).append(job)

        n_apps = n_saved = n_notif = 0
        for d in SEEKER_DEFS:
            user = seekers[d["email"]]
            resume = resumes[d["email"]]
            # stable per-seeker RNG → same selections on every run (idempotent)
            srng = rng_for("seeker", d["email"])
            field_jobs = sorted(jobs_by_cat.get(d["field"], []), key=lambda j: str(j.id))
            other_jobs = sorted((j for j in all_jobs if j not in field_jobs), key=lambda j: str(j.id))
            srng.shuffle(field_jobs)
            srng.shuffle(other_jobs)
            # 2–5 applications: mostly in-field, occasionally cross-field
            targets = field_jobs[:srng.randint(2, 4)]
            if other_jobs and srng.random() < 0.4:
                targets.append(other_jobs[0])
            for job in targets:
                if upsert_application(db, user, job, resume, d["skills"]):
                    n_apps += 1
            # 1–3 saved jobs
            for job in (field_jobs[:srng.randint(1, 3)] or field_jobs[:1]):
                if upsert_saved_job(db, user, job):
                    n_saved += 1
            # 1–3 notifications
            for title, msg, nt in srng.sample(NOTIF_POOL, k=srng.randint(1, 3)):
                if upsert_notification(db, user, title, msg, nt):
                    n_notif += 1
        db.commit()

        # --- recompute applications_count ---
        counts = dict(
            db.query(Application.job_id, func.count(Application.id))
            .group_by(Application.job_id).all()
        )
        for job in all_jobs:
            job.applications_count = int(counts.get(job.id, 0))
        db.commit()

        # --- summary ---
        n_users = db.query(User).count()
        n_comp = db.query(User).filter(User.role == UserRole.COMPANY).count()
        n_stud = db.query(User).filter(User.role == UserRole.STUDENT).count()
        n_jobs = db.query(Job).count()
        n_res = db.query(Resume).count()
        n_app_total = db.query(Application).count()
        n_saved_total = db.query(SavedJob).count()
        n_notif_total = db.query(Notification).count()

        print("✅ Seed complete\n")
        print("📊 Counts:")
        print(f"   Users:         {n_users}  ({n_comp} companies, {n_stud} seekers, +admin)")
        print(f"   Jobs:          {n_jobs}")
        print(f"   Resumes:       {n_res}")
        print(f"   Applications:  {n_app_total}  (+{n_apps} this run)")
        print(f"   Saved jobs:    {n_saved_total}  (+{n_saved} this run)")
        print(f"   Notifications: {n_notif_total}  (+{n_notif} this run)")
        print("\n🔑 Demo logins:")
        print("   Admin:   admin@ishtop.uz / Admin123!")
        print("   Company: hr@epam.com     / Company123!  (and all *@*.uz companies)")
        print("   Student: john@example.com / Student123! (and all seekers)")
        print("=" * 70 + "\n")

    except Exception as exc:
        db.rollback()
        print(f"\n❌ Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
