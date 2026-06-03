#!/usr/bin/env python3
"""
Rich Seed Data — broad-industry coverage (HeadHunter-style).

Populates the database with diverse companies, candidates and jobs across:
- Tech / IT
- Banking / Finance / Accounting
- Sales / Marketing / PR
- Retail / FMCG
- Healthcare / Pharmacy
- Hospitality / F&B
- Education / Tutoring
- Logistics / Delivery / Driving
- Customer Service / Call Center
- HR / Admin / Office
- Legal / Translation
- Construction / Engineering
- Beauty / Personal Care

Each application is scored with the real `job_matching` service so
`match_score` + `match_breakdown` are populated end-to-end.

Usage:
    python seed_data_rich.py                 # confirm before wiping
    python seed_data_rich.py --force         # non-interactive wipe & reseed
"""

from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import create_engine
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
from app.models.user import AdminSubRole
from app.services import job_matching


engine = create_engine(str(settings.DATABASE_URL), echo=False)
SessionLocal = sessionmaker(bind=engine)

random.seed(42)
NOW = datetime.now(timezone.utc)


# =============================================================================
# USERS — companies span 12 industries, candidates span 20+ professions
# =============================================================================


def _student(email, full_name, phone, location, bio):
    u = User(
        id=uuid4(),
        email=email,
        full_name=full_name,
        phone=phone,
        location=location,
        bio=bio,
        role=UserRole.STUDENT,
        is_active_account=True,
        is_verified=True,
    )
    u.set_password("Student123!")
    return u


def _company(email, full_name, company_name, website):
    u = User(
        id=uuid4(),
        email=email,
        full_name=full_name,
        company_name=company_name,
        company_website=website,
        role=UserRole.COMPANY,
        is_active_account=True,
        is_verified=True,
    )
    u.set_password("Company123!")
    return u


COMPANY_DEFS = [
    # (email, contact_name, company_name, website, industry-hint)
    ("hr@epam.com",           "EPAM HR Manager",            "EPAM Systems",            "https://epam.com",        "tech"),
    ("careers@uzcard.uz",     "Aziza Karimova",             "Uzcard",                  "https://uzcard.uz",       "fintech"),
    ("jobs@click.uz",         "Bekzod Yusupov",             "Click",                   "https://click.uz",        "fintech"),
    ("hr@mohirdev.uz",        "Dilshod Toshmatov",          "Mohirdev",                "https://mohirdev.uz",     "edtech"),
    ("hr@asakabank.uz",       "Nargiza Saidova",            "Asaka Bank",              "https://asakabank.uz",    "banking"),
    ("careers@korzinka.uz",   "Otabek Nurmatov",            "Korzinka",                "https://korzinka.uz",     "retail"),
    ("hr@inson.uz",           "Dr. Shoira Rakhmonova",      "Inson Medical Center",    "https://inson.uz",        "healthcare"),
    ("hr@hyatt-tashkent.uz",  "Bahodir Ergashev",           "Hyatt Regency Tashkent",  "https://hyatt.com",       "hospitality"),
    ("hr@beeline.uz",         "Madina Karimova",            "Beeline Uzbekistan",      "https://beeline.uz",      "telecom"),
    ("careers@coca-cola.uz",  "Sherzod Tursunov",           "Coca-Cola Uzbekistan",    "https://coca-cola.uz",    "fmcg"),
    ("hr@havas.uz",           "Kamila Yakubova",            "Havas Group Tashkent",    "https://havasgroup.com",  "marketing-agency"),
    ("careers@uzauto.uz",     "Akmal Tursunboyev",          "UzAuto Motors",           "https://uzautomotors.com","automotive"),
]


STUDENT_DEFS = [
    # (email, full_name, phone, location, short bio)
    ("john@example.com",     "John Doe",            "+998903333333", "Tashkent",   "Senior Python backend developer · FastAPI · PostgreSQL · 5+ years"),
    ("jane@example.com",     "Jane Smith",          "+998904444444", "Tashkent",   "Full-stack React + Node.js developer"),
    ("aziz@example.com",     "Aziz Rakhimov",       "+998905555555", "Tashkent",   "Go backend engineer · microservices"),
    ("dilnoza@example.com",  "Dilnoza Yusupova",    "+998906666666", "Samarkand",  "Frontend (Vue/TypeScript) · design systems"),
    ("rustam@example.com",   "Rustam Khasanov",     "+998907777777", "Tashkent",   "Flutter mobile developer"),
    ("madina@example.com",   "Madina Sodikova",     "+998908888888", "Tashkent",   "DevOps engineer · Kubernetes · AWS"),
    # Non-tech professionals
    ("zafar@example.com",    "Zafar Mamatkulov",    "+998909000001", "Tashkent",   "B2B sales manager · 4 years FMCG · enterprise accounts"),
    ("nilufar@example.com",  "Nilufar Yuldosheva",  "+998909000002", "Tashkent",   "Digital marketing specialist · SMM · paid ads · content"),
    ("kamol@example.com",    "Kamol Ergashev",      "+998909000003", "Tashkent",   "Chief accountant · 1C · IFRS · 6 years experience"),
    ("shoira@example.com",   "Shoira Rakhmonova",   "+998909000004", "Tashkent",   "Registered nurse · 5 years hospital · pediatric ward"),
    ("aziza@example.com",    "Aziza Tashpulatova",  "+998909000005", "Tashkent",   "English teacher · IELTS 8.0 · TEFL certified · 7 years"),
    ("bekzod@example.com",   "Bekzod Mansurov",     "+998909000006", "Tashkent",   "HR business partner · recruiting · L&D · 5 years"),
    ("malika@example.com",   "Malika Tashkenbayeva","+998901000003", "Tashkent",   "Product designer · Figma · user research · B2B SaaS"),
    ("rasul@example.com",    "Rasul Karimov",       "+998909000008", "Tashkent",   "Professional driver · 10 years · personal & corporate"),
    ("gulnoza@example.com",  "Gulnoza Saidova",     "+998909000009", "Tashkent",   "Translator · English/Russian/Uzbek · legal & technical"),
    ("oybek@example.com",    "Oybek Norboyev",      "+998909000010", "Tashkent",   "Logistics coordinator · supply chain · WMS systems"),
    ("dilfuza@example.com",  "Dilfuza Akhmedova",   "+998909000011", "Tashkent",   "Customer service supervisor · call center · 4 years"),
    ("javlon@example.com",   "Javlon Ismoilov",     "+998909000012", "Tashkent",   "Chef · 8 years European & Asian cuisine · hotel kitchens"),
    ("sevara@example.com",   "Sevara Khamidova",    "+998909000013", "Samarkand",  "Retail store manager · fashion · team of 12"),
    ("ulugbek@example.com",  "Ulug'bek Salimov",    "+998909000014", "Tashkent",   "Mechanical engineer · automotive · CAD · 5 years"),
    ("kamila@example.com",   "Kamila Yakubova",     "+998909000015", "Tashkent",   "Lawyer · corporate law · contracts · banking & fintech"),
    ("nodira@example.com",   "Nodira Babayeva",     "+998909000016", "Tashkent",   "Graphic designer · branding · Adobe Suite · 6 years"),
    ("rashid@example.com",   "Rashid Tursunboyev",  "+998909000017", "Tashkent",   "Construction site supervisor · 8 years · residential & commercial"),
    ("malohat@example.com",  "Malohat Yusupova",    "+998909000018", "Tashkent",   "Hairdresser & beauty stylist · 6 years · own salon experience"),
]


def seed_users(db):
    print("Creating users…")
    admin = User(
        id=uuid4(),
        email="admin@ishtop.uz",
        full_name="System Admin",
        phone="+998901111111",
        role=UserRole.ADMIN,
        admin_role=AdminSubRole.SUPER_ADMIN.value,
        is_active_account=True,
        is_verified=True,
    )
    admin.set_password("Admin123!")

    companies = [_company(e, n, c, w) for (e, n, c, w, _) in COMPANY_DEFS]
    students = [_student(e, n, p, l, b) for (e, n, p, l, b) in STUDENT_DEFS]

    db.add_all([admin, *companies, *students])
    db.commit()
    print(f"  ✅ {1 + len(companies) + len(students)} users "
          f"(1 admin, {len(companies)} companies, {len(students)} candidates)")
    return {"admin": admin, "companies": companies, "students": students}


# =============================================================================
# RESUMES — one per candidate, matching their stated profile
# =============================================================================


def _resume_content(name, summary, role_title, skills, years=3):
    return {
        "personal_info": {"name": name, "location": "Tashkent, Uzbekistan"},
        "professional_summary": {"text": summary},
        "work_experience": [
            {
                "job_title": role_title,
                "company_name": "Previous Company",
                "location": "Tashkent",
                "start_date": "2021-01-01",
                "end_date": "present",
                "is_current": True,
                "responsibilities": [
                    f"Drove {role_title.lower()} initiatives",
                    f"Hands-on with {', '.join(skills[:3])}",
                ],
                "technologies_used": skills,
            }
        ]
        * max(1, years // 2),
        "education": [
            {
                "institution_name": "Tashkent State University",
                "degree_type": "Bachelor",
                "field_of_study": "Relevant Field",
                "graduation_date": "2020-06-01",
            }
        ],
        "skills": {
            "technical_skills": [{"category": "Core", "skills": skills}],
            "soft_skills": ["Communication", "Teamwork"],
        },
    }


# Index of this list aligns with STUDENT_DEFS above.
RESUME_BLUEPRINTS = [
    # ---------- TECH ----------
    ("Senior Python Developer",  "Backend engineer with 5+ yrs FastAPI/Django, PostgreSQL, Docker, AWS.",
        ["Python", "FastAPI", "Django", "PostgreSQL", "Redis", "Docker", "AWS", "Git", "Linux"]),
    ("Full Stack Developer",     "React + Node.js full-stack developer building modern web apps.",
        ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "MongoDB", "PostgreSQL"]),
    ("Senior Go Backend Engineer","Go backend engineer with PostgreSQL & microservices.",
        ["Go", "PostgreSQL", "Redis", "gRPC", "Docker", "Kubernetes", "REST APIs"]),
    ("Frontend Developer",       "Vue/TypeScript engineer focused on design systems & accessibility.",
        ["Vue", "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind CSS", "Storybook"]),
    ("Mobile Developer (Flutter)","Cross-platform mobile engineer shipping Flutter apps.",
        ["Flutter", "Dart", "Firebase", "REST APIs", "Riverpod", "Android", "iOS"]),
    ("DevOps Engineer",          "Cloud + Kubernetes engineer building CI/CD pipelines.",
        ["Kubernetes", "Docker", "AWS", "Terraform", "GitHub Actions", "Linux", "Bash", "CI/CD"]),
    # ---------- SALES ----------
    ("B2B Sales Manager",        "Senior sales manager with 4 years in FMCG, enterprise account growth.",
        ["B2B Sales", "Account Management", "Negotiation", "CRM", "Lead Generation",
         "Cold Calling", "Russian", "Uzbek", "English"]),
    # ---------- MARKETING ----------
    ("Digital Marketing Specialist","SMM + paid ads + content strategy for consumer brands.",
        ["Social Media Marketing", "Facebook Ads", "Google Ads", "Instagram",
         "Content Marketing", "Copywriting", "Analytics", "SEO", "Photoshop"]),
    # ---------- FINANCE ----------
    ("Chief Accountant",         "Chief accountant · 1C · IFRS · tax reporting · 6 years.",
        ["1C", "IFRS", "Tax Reporting", "Excel", "Bookkeeping", "Audit",
         "Financial Reporting", "Russian", "Uzbek"]),
    # ---------- HEALTHCARE ----------
    ("Registered Nurse",         "Pediatric-ward nurse with 5 years hospital experience.",
        ["Patient Care", "Pediatric Care", "Medical Records", "First Aid",
         "Vital Signs Monitoring", "Russian", "Uzbek"]),
    # ---------- EDUCATION ----------
    ("English Teacher",          "TEFL-certified English teacher · IELTS 8.0 · 7 years.",
        ["English Teaching", "IELTS Preparation", "TEFL", "Curriculum Design",
         "Classroom Management", "Speaking Coach", "Russian", "Uzbek"]),
    # ---------- HR ----------
    ("HR Business Partner",      "HRBP · recruiting · L&D · 5 years scaling teams.",
        ["Recruiting", "Talent Acquisition", "Onboarding", "L&D",
         "HR Strategy", "1C ZUP", "Russian", "Uzbek", "English"]),
    # ---------- DESIGN (UX) ----------
    ("Product Designer",         "Product designer focused on B2B SaaS and user research.",
        ["Figma", "Sketch", "Design Systems", "Prototyping",
         "User Research", "Usability Testing", "HTML", "CSS"]),
    # ---------- DRIVER ----------
    ("Professional Driver",      "10 years personal + corporate driving · clean record.",
        ["Driving", "Vehicle Maintenance", "Route Planning", "Defensive Driving",
         "Russian", "Uzbek", "Customer Service"]),
    # ---------- TRANSLATOR ----------
    ("Translator",               "English / Russian / Uzbek translator · legal & technical.",
        ["Translation", "English", "Russian", "Uzbek",
         "Legal Documents", "Technical Translation", "Interpretation", "MS Word"]),
    # ---------- LOGISTICS ----------
    ("Logistics Coordinator",    "Supply chain coordinator with WMS and customs experience.",
        ["Logistics", "Supply Chain", "Warehouse Management", "Inventory",
         "Customs Clearance", "WMS Systems", "Excel", "Russian", "Uzbek"]),
    # ---------- CUSTOMER SERVICE ----------
    ("Customer Service Supervisor","Call-center supervisor · 4 years · team of 15.",
        ["Customer Service", "Call Center", "Team Leadership", "CRM",
         "Conflict Resolution", "Russian", "Uzbek", "English"]),
    # ---------- HOSPITALITY ----------
    ("Chef",                     "European + Asian cuisine chef · 8 years hotel kitchens.",
        ["Cooking", "Menu Planning", "Food Safety", "Kitchen Management",
         "European Cuisine", "Asian Cuisine", "Inventory Management"]),
    # ---------- RETAIL ----------
    ("Retail Store Manager",     "Fashion retail manager · team of 12 · KPI ownership.",
        ["Retail Management", "Team Leadership", "Visual Merchandising",
         "Inventory Management", "Sales", "Customer Service", "Russian", "Uzbek"]),
    # ---------- ENGINEERING ----------
    ("Mechanical Engineer",      "Automotive mechanical engineer · CAD · 5 years.",
        ["Mechanical Engineering", "AutoCAD", "SolidWorks", "Automotive",
         "Quality Control", "Russian", "Uzbek"]),
    # ---------- LEGAL ----------
    ("Corporate Lawyer",         "Corporate lawyer · contracts · banking & fintech focus.",
        ["Corporate Law", "Contract Law", "Banking Law", "Legal Research",
         "Compliance", "Negotiation", "Russian", "Uzbek", "English"]),
    # ---------- DESIGN (Graphic) ----------
    ("Graphic Designer",         "Branding & print designer · Adobe Suite · 6 years.",
        ["Graphic Design", "Branding", "Adobe Photoshop", "Illustrator",
         "InDesign", "Typography", "Print Design", "Russian"]),
    # ---------- CONSTRUCTION ----------
    ("Construction Site Supervisor","8 years residential & commercial construction.",
        ["Construction Management", "Site Supervision", "AutoCAD",
         "Safety Standards", "Quality Control", "Russian", "Uzbek"]),
    # ---------- BEAUTY ----------
    ("Beauty Stylist & Hairdresser","6 years salon experience · own salon background.",
        ["Hairdressing", "Hair Coloring", "Styling", "Customer Service",
         "Salon Management", "Russian", "Uzbek"]),
]


def seed_resumes(db, students):
    print("Creating resumes…")
    resumes = []
    for student, (title, summary, skills) in zip(students, RESUME_BLUEPRINTS):
        r = Resume(
            id=uuid4(),
            user_id=student.id,
            title=title,
            status="published",
            content=_resume_content(student.full_name, summary, title, skills),
            raw_text=f"{title} | {' | '.join(skills)}",
            ats_score=random.randint(70, 95),
            view_count=random.randint(10, 80),
        )
        resumes.append(r)
    db.add_all(resumes)
    db.commit()
    print(f"  ✅ {len(resumes)} resumes (all published, all industries)")
    return resumes


# =============================================================================
# JOBS — 30+ across the 12 companies & their industries
# =============================================================================


# (company_idx, title, description, requirements, exp_level, job_type, remote,
#  salary_min, salary_max, days_to_expire)
JOB_DEFS = [
    # ---------- EPAM (0) — tech ----------
    (0, "Senior Backend Developer",     "Lead backend work on a fintech platform.",
        ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "microservices"],
        "senior", "hybrid", True, 3500, 5500, 28),
    (0, "Full Stack Developer",         "Build customer-facing dashboards end-to-end.",
        ["JavaScript", "TypeScript", "React", "Node.js", "REST APIs"],
        "mid", "full_time", False, 2200, 3800, 21),
    (0, "DevOps Engineer",              "Own Kubernetes clusters and CI/CD pipelines.",
        ["Kubernetes", "Docker", "AWS", "Terraform", "CI/CD", "Linux"],
        "mid", "remote", True, 2800, 4500, 35),

    # ---------- Uzcard (1) — fintech ----------
    (1, "Go Backend Engineer",          "Payment-processing microservices in Go.",
        ["Go", "PostgreSQL", "Redis", "gRPC", "Kubernetes"],
        "senior", "hybrid", False, 3000, 5000, 40),
    (1, "Mobile Engineer (Flutter)",    "Ship Uzcard's mobile wallet to millions of users.",
        ["Flutter", "Dart", "REST APIs", "Firebase"],
        "mid", "full_time", False, 2400, 3800, 30),
    (1, "QA Automation Engineer",       "End-to-end tests for the wallet app.",
        ["Cypress", "Playwright", "JavaScript", "TypeScript", "CI/CD"],
        "mid", "hybrid", True, 1800, 3000, 25),

    # ---------- Click (2) ----------
    (2, "Senior Frontend Developer",    "Lead the merchant dashboard rebuild.",
        ["TypeScript", "React", "Next.js", "Tailwind CSS", "Design Systems"],
        "senior", "hybrid", True, 2800, 4500, 22),

    # ---------- Mohirdev (3) ----------
    (3, "Junior Frontend Developer",    "Help build Mohirdev's learner experience.",
        ["JavaScript", "React", "HTML", "CSS", "Git"],
        "junior", "full_time", False, 800, 1500, 60),
    (3, "Product Designer",             "Design the next generation of online courses.",
        ["Figma", "Design Systems", "User Research", "Prototyping"],
        "mid", "hybrid", True, 1800, 3000, 30),

    # ---------- Asaka Bank (4) ----------
    (4, "Chief Accountant",             "Lead accounting team. IFRS reporting and tax.",
        ["1C", "IFRS", "Tax Reporting", "Excel", "Bookkeeping", "Russian"],
        "senior", "full_time", False, 1800, 2800, 45),
    (4, "Corporate Lawyer",             "In-house lawyer for corporate banking products.",
        ["Corporate Law", "Contract Law", "Banking Law", "Compliance",
         "Russian", "Uzbek"],
        "mid", "full_time", False, 1500, 2500, 40),
    (4, "Bank Teller",                  "Front-desk teller for the Tashkent branch.",
        ["Customer Service", "Cash Handling", "Banking",
         "Russian", "Uzbek"],
        "junior", "full_time", False, 400, 700, 35),

    # ---------- Korzinka (5) — retail/FMCG ----------
    (5, "Retail Store Manager",         "Run a flagship Korzinka location.",
        ["Retail Management", "Team Leadership", "Inventory Management",
         "Sales", "Customer Service", "Russian", "Uzbek"],
        "mid", "full_time", False, 800, 1400, 30),
    (5, "Cashier",                      "Front-line cashier at Korzinka outlets.",
        ["Cash Handling", "Customer Service", "POS Systems",
         "Russian", "Uzbek"],
        "junior", "full_time", False, 250, 400, 30),
    (5, "Logistics Coordinator",        "Coordinate inbound shipments and warehouse ops.",
        ["Logistics", "Supply Chain", "Warehouse Management",
         "Inventory", "Excel", "Russian", "Uzbek"],
        "mid", "full_time", False, 900, 1600, 35),

    # ---------- Inson Medical Center (6) — healthcare ----------
    (6, "Registered Nurse",             "Pediatric & adult care nurse, day shift.",
        ["Patient Care", "Medical Records", "First Aid",
         "Vital Signs Monitoring", "Russian", "Uzbek"],
        "mid", "full_time", False, 500, 900, 45),
    (6, "Medical Receptionist",         "Front-desk operations for the clinic.",
        ["Customer Service", "Scheduling", "Medical Records",
         "Russian", "Uzbek"],
        "junior", "full_time", False, 350, 600, 30),

    # ---------- Hyatt Regency (7) — hospitality ----------
    (7, "Chef de Partie",               "Hot-section chef for our signature restaurant.",
        ["Cooking", "European Cuisine", "Food Safety",
         "Kitchen Management"],
        "mid", "full_time", False, 800, 1400, 40),
    (7, "Front Desk Agent",             "5★ front-desk service.",
        ["Customer Service", "Hospitality", "English",
         "Russian", "Uzbek"],
        "junior", "full_time", False, 450, 700, 30),
    (7, "Waiter / Waitress",            "F&B service in the hotel restaurant.",
        ["Customer Service", "F&B Service", "English", "Russian"],
        "junior", "full_time", False, 300, 500, 25),

    # ---------- Beeline (8) — telecom ----------
    (8, "Customer Service Supervisor",  "Lead a call-center shift of 15 agents.",
        ["Customer Service", "Call Center", "Team Leadership",
         "CRM", "Russian", "Uzbek"],
        "mid", "full_time", False, 700, 1200, 30),
    (8, "Call Center Operator",         "Inbound + outbound customer support.",
        ["Customer Service", "Call Center", "CRM",
         "Russian", "Uzbek"],
        "junior", "hybrid", False, 300, 500, 25),

    # ---------- Coca-Cola (9) — FMCG ----------
    (9, "B2B Sales Manager",            "Grow horeca and traditional-trade accounts.",
        ["B2B Sales", "Account Management", "Negotiation",
         "CRM", "Russian", "Uzbek"],
        "mid", "full_time", False, 1200, 2200, 35),
    (9, "Field Sales Representative",   "On-route sales for FMCG distribution.",
        ["Sales", "Field Sales", "Customer Service",
         "Russian", "Uzbek", "Driving"],
        "junior", "full_time", False, 500, 900, 30),
    (9, "HR Business Partner",          "Recruiting + L&D for commercial functions.",
        ["Recruiting", "Talent Acquisition", "HR Strategy",
         "L&D", "Russian", "Uzbek", "English"],
        "mid", "hybrid", True, 1500, 2400, 40),

    # ---------- Havas Group (10) — marketing agency ----------
    (10, "Digital Marketing Specialist","Plan and run integrated campaigns for clients.",
        ["Social Media Marketing", "Facebook Ads", "Google Ads",
         "Content Marketing", "Analytics", "SEO"],
        "mid", "hybrid", True, 800, 1500, 30),
    (10, "Graphic Designer",            "Brand & campaign design for clients.",
        ["Graphic Design", "Branding", "Adobe Photoshop",
         "Illustrator", "InDesign", "Typography"],
        "mid", "hybrid", True, 700, 1300, 30),
    (10, "English Teacher (PT)",        "Run weekly English-language workshops for staff.",
        ["English Teaching", "Curriculum Design", "Speaking Coach",
         "TEFL"],
        "junior", "part_time", True, 500, 900, 35),

    # ---------- UzAuto Motors (11) — automotive ----------
    (11, "Mechanical Engineer",         "Quality engineering on the production line.",
        ["Mechanical Engineering", "AutoCAD", "SolidWorks",
         "Automotive", "Quality Control"],
        "mid", "full_time", False, 1000, 1800, 35),
    (11, "Construction Site Supervisor","Plant-expansion site supervisor.",
        ["Construction Management", "Site Supervision",
         "AutoCAD", "Safety Standards", "Quality Control"],
        "senior", "full_time", False, 1100, 1900, 40),
    (11, "Professional Driver",         "Executive driver for corporate management.",
        ["Driving", "Vehicle Maintenance", "Route Planning",
         "Defensive Driving", "Russian", "Uzbek"],
        "junior", "full_time", False, 400, 700, 30),

    # ---------- Beauty (one extra) ----------
    (10, "Beauty Stylist (Salon)",      "Hairstylist & coloring specialist for our partner salon.",
        ["Hairdressing", "Hair Coloring", "Styling",
         "Customer Service"],
        "mid", "full_time", False, 400, 800, 30),
]


def seed_jobs(db, companies):
    print("Creating jobs…")
    jobs = []
    for (idx, title, desc, skills, lvl, jt, remote, smin, smax, days) in JOB_DEFS:
        job = Job(
            id=uuid4(),
            company_id=companies[idx].id,
            title=title,
            description=desc,
            requirements=skills,
            responsibilities=[
                f"Drive {title.lower()} initiatives",
                "Collaborate cross-functionally",
                "Deliver against business outcomes",
            ],
            salary_min=smin,
            salary_max=smax,
            salary_currency="USD",
            location="Tashkent, Uzbekistan" if jt != "remote" else "Remote",
            is_remote_allowed=remote,
            job_type=jt,
            experience_level=lvl,
            benefits=["Health insurance", "Professional development", "Flexible schedule"],
            status=JobStatus.ACTIVE.value,
            views_count=random.randint(40, 700),
            applications_count=0,
            expires_at=NOW + timedelta(days=days),
        )
        jobs.append(job)
    db.add_all(jobs)
    db.commit()
    print(f"  ✅ {len(jobs)} jobs across {len(companies)} companies")
    return jobs


# =============================================================================
# APPLICATIONS — each scored with the real job_matching service
# =============================================================================


STATUS_WEIGHTS = [
    (ApplicationStatus.PENDING.value,     0.30),
    (ApplicationStatus.REVIEWING.value,   0.22),
    (ApplicationStatus.SHORTLISTED.value, 0.13),
    (ApplicationStatus.INTERVIEW.value,   0.12),
    (ApplicationStatus.ACCEPTED.value,    0.08),
    (ApplicationStatus.REJECTED.value,    0.13),
    (ApplicationStatus.WITHDRAWN.value,   0.02),
]


def _pick_status():
    r = random.random()
    cum = 0.0
    for status, w in STATUS_WEIGHTS:
        cum += w
        if r <= cum:
            return status
    return ApplicationStatus.PENDING.value


def seed_applications(db, students, resumes, jobs):
    print("Creating applications (computing real match scores)…")

    pairs = list(zip(students, resumes))
    seen = set()
    applications = []

    for job in jobs:
        # Score every candidate against this job; pick top-N where match > threshold
        # to keep applications realistic (people apply where they roughly fit).
        scored = []
        for (student, resume) in pairs:
            breakdown = job_matching.score_resume_against_job(resume.content, job)
            if breakdown["score"] >= 12:
                scored.append((student, resume, breakdown))

        # Take a random subset weighted toward better matches.
        scored.sort(key=lambda x: x[2]["score"], reverse=True)
        # 60% of applications from the top half (good fits), 40% from the rest.
        top_half = scored[: max(1, len(scored) // 2)]
        bottom_half = scored[max(1, len(scored) // 2):]
        n_apps = random.randint(2, 6)
        from_top = random.sample(top_half, k=min(n_apps - 1, len(top_half))) if top_half else []
        from_bottom = (
            random.sample(bottom_half, k=min(1, len(bottom_half))) if bottom_half else []
        )
        picks = (from_top + from_bottom)[:n_apps]

        for (student, resume, breakdown) in picks:
            key = (job.id, student.id)
            if key in seen:
                continue
            seen.add(key)

            score = breakdown["score"]
            status = _pick_status()
            applied_at = NOW - timedelta(
                days=random.randint(0, 25),
                hours=random.randint(0, 23),
            )

            reviewed_at = None
            decided_at = None
            interview_at = None
            interview_type = None
            meeting_link = None

            if status != ApplicationStatus.PENDING.value:
                reviewed_at = applied_at + timedelta(days=random.randint(1, 4))

            if status == ApplicationStatus.INTERVIEW.value:
                interview_at = NOW + timedelta(
                    days=random.randint(1, 7),
                    hours=random.randint(9, 17),
                )
                interview_type = random.choice(["video", "phone", "in-person"])
                if interview_type == "video":
                    meeting_link = "https://meet.google.com/abc-defg-hij"

            if status in (ApplicationStatus.ACCEPTED.value, ApplicationStatus.REJECTED.value):
                decided_at = reviewed_at + timedelta(days=random.randint(1, 5))

            app = Application(
                id=uuid4(),
                job_id=job.id,
                user_id=student.id,
                resume_id=resume.id,
                status=status,
                cover_letter=(
                    f"I'm excited to apply for the {job.title} role. "
                    f"My background as a {resume.title} aligns with your needs."
                ),
                match_score=f"{score:.0f}%",
                match_breakdown=breakdown,
                applied_at=applied_at,
                reviewed_at=reviewed_at,
                interview_at=interview_at,
                interview_type=interview_type,
                meeting_link=meeting_link,
                decided_at=decided_at,
            )
            applications.append(app)
            job.applications_count = (job.applications_count or 0) + 1

    db.add_all(applications)
    db.commit()

    counts = {}
    for a in applications:
        counts[a.status] = counts.get(a.status, 0) + 1
    print(f"  ✅ {len(applications)} applications")
    for s, c in sorted(counts.items()):
        print(f"     · {s:<12}{c}")
    return applications


# =============================================================================
# MAIN
# =============================================================================


def main():
    force = "--force" in sys.argv

    print("\n" + "=" * 70)
    print("🌱 RICH SEED — multi-industry (HeadHunter-style)")
    print("=" * 70 + "\n")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing = db.query(User).count()
        if existing > 0:
            if not force:
                ans = input(f"⚠️  Database already has {existing} users. Wipe and reseed? (y/N): ")
                if ans.lower() != "y":
                    print("Aborted.")
                    return
            print("Clearing existing data…")
            db.query(Application).delete()
            db.query(Job).delete()
            db.query(Resume).delete()
            db.query(User).delete()
            db.commit()
            print("  ✅ cleared\n")

        roles = seed_users(db)
        resumes = seed_resumes(db, roles["students"])
        jobs = seed_jobs(db, roles["companies"])
        seed_applications(db, roles["students"], resumes, jobs)

        print("\n" + "=" * 70)
        print("✅ DATABASE SEEDED")
        print("=" * 70)
        print("\n📝 Test accounts:")
        print("   Admin:     admin@ishtop.uz    / Admin123!")
        print("   Companies (any):  hr@epam.com, careers@uzcard.uz, hr@asakabank.uz,")
        print("                     careers@korzinka.uz, hr@inson.uz, hr@hyatt-tashkent.uz,")
        print("                     hr@beeline.uz, careers@coca-cola.uz, hr@havas.uz, ...")
        print("                     password: Company123!")
        print("   Candidates (any): john@example.com (Python dev), zafar@example.com (Sales),")
        print("                     shoira@example.com (Nurse), aziza@example.com (Teacher),")
        print("                     kamol@example.com (Accountant), javlon@example.com (Chef), ...")
        print("                     password: Student123!")
        print()

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
