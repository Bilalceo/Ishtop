"""
Safe startup seed helpers.

This module is intentionally idempotent:
- never wipes tables
- never mutates existing jobs
- only appends missing active jobs when below a configured minimum
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import Job, JobStatus, User, UserRole

logger = logging.getLogger(__name__)
_AUTO_SEED_ADVISORY_LOCK_KEY = 91924517


# Mixed Uzbekistan job market (NOT IT-only): retail, delivery, food service,
# education, fitness, admin, finance, marketing + a slice of entry-level IT.
# Salaries in UZS; descriptions carry Uzbek + Russian (single text field).
_SEP = "\n\n———\n\n"


def _bi(uz: str, ru: str) -> str:
    return f"{uz}{_SEP}{ru}"


_SEED_JOB_BLUEPRINTS = [
    {
        "title": "Sotuvchi-konsultant",
        "description": _bi(
            "Do'konga sotuvchi-konsultant kerak. Mijozlarga mahsulot tanlashda yordam berasiz.",
            "В магазин нужен продавец-консультант. Помогаете клиентам с выбором товара.",
        ),
        "requirements": ["Mijozlar bilan muloqot", "Savdo ko'nikmalari", "Tajriba shart emas"],
        "responsibilities": ["Mijozlarni kutib olish", "Mahsulot bo'yicha maslahat", "Kassada hisob-kitob"],
        "salary_min": 2_500_000, "salary_max": 5_000_000,
        "location": "Tashkent, Uzbekistan", "job_type": "full_time", "experience_level": "junior",
    },
    {
        "title": "Kuryer",
        "description": _bi(
            "Yetkazib berish xizmatiga kuryer kerak. Buyurtmalarni mijozlarga yetkazasiz. Talabalar uchun qulay.",
            "В службу доставки нужен курьер. Доставляете заказы клиентам. Удобно для студентов.",
        ),
        "requirements": ["Punktuallik", "Shaharni bilish", "Smartfon"],
        "responsibilities": ["Buyurtmalarni olish", "Mijozga yetkazish", "To'lovni qabul qilish"],
        "salary_min": 3_000_000, "salary_max": 7_000_000,
        "location": "Tashkent, Uzbekistan", "job_type": "part_time", "experience_level": "intern",
    },
    {
        "title": "Kassir",
        "description": _bi(
            "Supermarketga kassir kerak. To'lovlarni qabul qilib, kassa intizomiga rioya qilasiz.",
            "В супермаркет нужен кассир. Принимаете оплату и соблюдаете кассовую дисциплину.",
        ),
        "requirements": ["Diqqatlilik", "Kassada ishlash", "Tajriba shart emas"],
        "responsibilities": ["To'lovlarni qabul qilish", "Kassa hisoboti", "Mijozlarga xizmat"],
        "salary_min": 2_500_000, "salary_max": 4_500_000,
        "location": "Tashkent, Uzbekistan", "job_type": "part_time", "experience_level": "junior",
    },
    {
        "title": "Call center operator",
        "description": _bi(
            "Call-markazga operator kerak. Mijozlarning qo'ng'iroqlariga javob berasiz.",
            "В call-центр нужен оператор. Отвечаете на звонки клиентов.",
        ),
        "requirements": ["Tushunarli nutq", "O'zbek/rus tili", "Tajriba shart emas"],
        "responsibilities": ["Qo'ng'iroqlarga javob", "Arizalarni qayd etish", "Mijozga maslahat"],
        "salary_min": 2_500_000, "salary_max": 4_500_000,
        "location": "Tashkent, Uzbekistan", "job_type": "full_time", "experience_level": "intern",
    },
    {
        "title": "Ofitsiant",
        "description": _bi(
            "Restoranga ofitsiant kerak. Mehmonlarni kutib olib, buyurtmalarni qabul qilasiz.",
            "В ресторан нужен официант. Встречаете гостей и принимаете заказы.",
        ),
        "requirements": ["Xushmuomalalik", "Tezkorlik", "Tajriba shart emas"],
        "responsibilities": ["Mehmonlarni kutib olish", "Buyurtma qabul qilish", "Stollarni tayyorlash"],
        "salary_min": 2_500_000, "salary_max": 5_000_000,
        "location": "Tashkent, Uzbekistan", "job_type": "part_time", "experience_level": "intern",
    },
    {
        "title": "Ingliz tili o'qituvchisi",
        "description": _bi(
            "O'quv markaziga ingliz tili o'qituvchisi kerak. Guruh va individual darslar olib borasiz.",
            "В учебный центр нужен преподаватель английского. Ведёте групповые и индивидуальные занятия.",
        ),
        "requirements": ["Ingliz tili (Upper-Intermediate+)", "Dars tushuntirish", "Mas'uliyat"],
        "responsibilities": ["Darslar o'tish", "Uy vazifasini tekshirish", "Natijalarni kuzatish"],
        "salary_min": 4_000_000, "salary_max": 10_000_000,
        "location": "Tashkent, Uzbekistan", "job_type": "full_time", "experience_level": "junior",
    },
    {
        "title": "Fitness trener",
        "description": _bi(
            "Fitnes klubga trener kerak. Mijozlar uchun trening dasturi tuzasiz.",
            "В фитнес-клуб нужен тренер. Составляете программы тренировок для клиентов.",
        ),
        "requirements": ["Sport tayyorgarligi", "Mijozlar bilan ishlash", "Sertifikat afzal"],
        "responsibilities": ["Trening dasturi", "Mashg'ulot o'tkazish", "Natijani kuzatish"],
        "salary_min": 3_000_000, "salary_max": 12_000_000,
        "location": "Tashkent, Uzbekistan", "job_type": "full_time", "experience_level": "junior",
    },
    {
        "title": "Ofis administrator",
        "description": _bi(
            "Ofisga administrator kerak. Ofis ishini tashkil qilib, qo'ng'iroq va mehmonlarni qabul qilasiz.",
            "В офис нужен администратор. Организуете работу офиса, принимаете звонки и гостей.",
        ),
        "requirements": ["MS Office", "Tashkilotchilik", "Muloqot ko'nikmalari"],
        "responsibilities": ["Ofis ishini tashkil qilish", "Qo'ng'iroqlar", "Hujjatlar"],
        "salary_min": 3_000_000, "salary_max": 6_000_000,
        "location": "Tashkent, Uzbekistan", "job_type": "full_time", "experience_level": "junior",
    },
    {
        "title": "Buxgalter yordamchisi",
        "description": _bi(
            "Buxgalteriyaga yordamchi kerak. Hujjatlarni tayyorlab, hisobotlarda ko'maklashasiz.",
            "В бухгалтерию нужен помощник. Готовите документы и помогаете с отчётностью.",
        ),
        "requirements": ["Excel", "1C asoslari", "Diqqatlilik"],
        "responsibilities": ["Hujjatlar tayyorlash", "Hisobotda ko'maklashish", "1C bilan ishlash"],
        "salary_min": 3_000_000, "salary_max": 7_000_000,
        "location": "Tashkent, Uzbekistan", "job_type": "full_time", "experience_level": "junior",
    },
    {
        "title": "SMM assistant",
        "description": _bi(
            "SMM yordamchisi kerak. Ijtimoiy tarmoqlar uchun post tayyorlaysiz. Talabalar uchun qulay.",
            "Нужен SMM-ассистент. Готовите посты для соцсетей. Удобно для студентов.",
        ),
        "requirements": ["Instagram/Telegram", "Canva", "Ijodkorlik"],
        "responsibilities": ["Post tayyorlash", "Stories", "Kommentlar bilan ishlash"],
        "salary_min": 2_500_000, "salary_max": 6_000_000,
        "location": "Tashkent, Uzbekistan", "job_type": "part_time", "experience_level": "intern",
    },
    {
        "title": "Haydovchi",
        "description": _bi(
            "Kompaniyaga haydovchi kerak. Yuk va xodimlarni shahar bo'ylab tashiysiz.",
            "Компании нужен водитель. Перевозите груз и сотрудников по городу.",
        ),
        "requirements": ["B toifa guvohnoma", "Shaharni bilish", "Mas'uliyat"],
        "responsibilities": ["Marshrut bo'yicha harakat", "Avtomobil holatini nazorat", "Yukni yetkazish"],
        "salary_min": 4_000_000, "salary_max": 8_000_000,
        "location": "Samarkand, Uzbekistan", "job_type": "full_time", "experience_level": "junior",
    },
    {
        "title": "Junior Frontend Developer",
        "description": _bi(
            "Junior frontend dasturchi kerak. Veb-interfeyslarni ishlab chiqishda jamoaga qo'shilasiz.",
            "Нужен junior frontend-разработчик. Разрабатываете веб-интерфейсы в команде.",
        ),
        "requirements": ["HTML/CSS", "JavaScript", "React asoslari"],
        "responsibilities": ["UI komponentlar", "Buglarni tuzatish", "Mentor bilan ishlash"],
        "salary_min": 5_000_000, "salary_max": 12_000_000,
        "location": "Tashkent, Uzbekistan", "job_type": "hybrid", "experience_level": "junior",
    },
]


def _get_or_create_seed_company(db: Session) -> User:
    seed_email = settings.AUTO_SEED_COMPANY_EMAIL.strip().lower()
    company = db.query(User).filter(User.email == seed_email).first()
    if company:
        if company.role != UserRole.COMPANY:
            raise RuntimeError(
                f"AUTO_SEED_COMPANY_EMAIL belongs to non-company user: {seed_email}"
            )
        return company

    company = User(
        id=uuid4(),
        email=seed_email,
        full_name=settings.AUTO_SEED_COMPANY_MANAGER_NAME,
        role=UserRole.COMPANY,
        company_name=settings.AUTO_SEED_COMPANY_NAME,
        company_website=settings.AUTO_SEED_COMPANY_WEBSITE,
        is_active_account=True,
        is_verified=True,
    )
    company.set_password(settings.AUTO_SEED_COMPANY_PASSWORD)
    db.add(company)
    db.commit()
    db.refresh(company)
    logger.info("Auto-seed company created: %s", company.email)
    return company


def _try_acquire_seed_lock(db: Session) -> bool:
    bind = db.get_bind()
    dialect = getattr(getattr(bind, "dialect", None), "name", "")
    if dialect != "postgresql":
        return True
    acquired = db.execute(
        text("SELECT pg_try_advisory_lock(:key)"),
        {"key": _AUTO_SEED_ADVISORY_LOCK_KEY},
    ).scalar()
    return bool(acquired)


def _release_seed_lock(db: Session) -> None:
    bind = db.get_bind()
    dialect = getattr(getattr(bind, "dialect", None), "name", "")
    if dialect != "postgresql":
        return
    db.execute(
        text("SELECT pg_advisory_unlock(:key)"),
        {"key": _AUTO_SEED_ADVISORY_LOCK_KEY},
    )


def ensure_minimum_active_jobs(db: Session, min_active_jobs: int) -> int:
    if min_active_jobs <= 0:
        return 0

    active_jobs = (
        db.query(Job)
        .filter(Job.status == JobStatus.ACTIVE.value, Job.is_deleted.is_(False))
        .count()
    )
    if active_jobs >= min_active_jobs:
        logger.info(
            "Auto-seed skipped: active jobs already satisfy minimum (%s >= %s)",
            active_jobs,
            min_active_jobs,
        )
        return 0

    company = _get_or_create_seed_company(db)
    created = 0

    for item in _SEED_JOB_BLUEPRINTS:
        if active_jobs + created >= min_active_jobs:
            break

        exists = (
            db.query(Job)
            .filter(
                Job.company_id == company.id,
                Job.title == item["title"],
                Job.location == item["location"],
                Job.status == JobStatus.ACTIVE.value,
                Job.is_deleted.is_(False),
            )
            .first()
        )
        if exists:
            continue

        job = Job(
            id=uuid4(),
            company_id=company.id,
            title=item["title"],
            description=item["description"],
            requirements=item["requirements"],
            responsibilities=item["responsibilities"],
            benefits=["Rasmiy ish", "Moslashuvchan grafik", "O'sish imkoniyatlari"],
            salary_min=item["salary_min"],
            salary_max=item["salary_max"],
            salary_currency="UZS",
            location=item["location"],
            is_remote_allowed=item["job_type"] in {"remote", "hybrid"},
            job_type=item["job_type"],
            experience_level=item["experience_level"],
            status=JobStatus.ACTIVE.value,
            views_count=0,
            applications_count=0,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(job)
        created += 1

    if created > 0:
        db.commit()
    logger.info("Auto-seed jobs created: %s", created)
    return created


def cleanup_seed_company_duplicates(db: Session) -> int:
    seed_email = settings.AUTO_SEED_COMPANY_EMAIL.strip().lower()
    company = (
        db.query(User)
        .filter(User.email == seed_email, User.role == UserRole.COMPANY)
        .first()
    )
    if not company:
        return 0

    duplicates = db.execute(
        text(
            """
            WITH ranked AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY company_id, title, location
                        ORDER BY created_at ASC, id ASC
                    ) AS rn
                FROM jobs
                WHERE company_id = :company_id
                  AND is_deleted = false
                  AND status = 'active'
            )
            SELECT id FROM ranked WHERE rn > 1
            """
        ),
        {"company_id": company.id},
    ).fetchall()

    if not duplicates:
        return 0

    duplicate_ids = [row[0] for row in duplicates]
    now_utc = datetime.now(timezone.utc)
    jobs = db.query(Job).filter(Job.id.in_(duplicate_ids), Job.is_deleted.is_(False)).all()
    for job in jobs:
        job.is_deleted = True
        job.deleted_at = now_utc
        job.status = JobStatus.CLOSED.value

    db.commit()
    logger.info("Auto-seed duplicate jobs cleaned up: %s", len(jobs))
    return len(jobs)


def run_startup_auto_seed() -> None:
    if not settings.AUTO_SEED_ENABLED:
        return

    db = SessionLocal()
    lock_acquired = False
    try:
        lock_acquired = _try_acquire_seed_lock(db)
        if not lock_acquired:
            logger.info("Auto-seed skipped: lock held by another process")
            return
        cleanup_seed_company_duplicates(db)
        ensure_minimum_active_jobs(db, settings.AUTO_SEED_MIN_ACTIVE_JOBS)
    except Exception as exc:
        db.rollback()
        logger.error("Auto-seed failed: %s", exc)
    finally:
        if lock_acquired:
            try:
                _release_seed_lock(db)
            except Exception as unlock_exc:
                logger.warning("Auto-seed lock release warning: %s", unlock_exc)
        db.close()
