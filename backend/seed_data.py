#!/usr/bin/env python3
"""
=============================================================================
Seed Database with Test Data
=============================================================================

Bu script test ma'lumotlari bilan DBni to'ldiradi:
- 1 Admin user
- 5 Company users
- 11 Student users
- 13 Jobs
- 11 Resumes
- 26 Applications

Company bo'limi uchun alohida boyitilgan pipeline bor:
- job statuslari: active/paused/closed
- application statuslari: pending/reviewing/shortlisted/interview/accepted/rejected
- company dashboard metrikalari to'liq chiqadi

Usage:
    python seed_data.py
"""

import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
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
from app.models.user import AdminSubRole
from app.models.base import Base

# =============================================================================
# DATABASE SETUP
# =============================================================================

engine = create_engine(str(settings.DATABASE_URL), echo=False)
SessionLocal = sessionmaker(bind=engine)


# =============================================================================
# SEED BLUEPRINTS
# =============================================================================

COMPANY_SEED = [
    {
        "email": "hr@epam.com",
        "full_name": "EPAM HR Manager",
        "phone": "+998902222222",
        "company_name": "EPAM Systems",
        "company_website": "https://epam.com",
        "password": "Company123!",
    },
    {
        "email": "careers@uzum.uz",
        "full_name": "Uzum Talent Team",
        "phone": "+998902333333",
        "company_name": "Uzum",
        "company_website": "https://uzum.uz",
        "password": "Company123!",
    },
    {
        "email": "jobs@click.uz",
        "full_name": "Click Recruitment",
        "phone": "+998902444444",
        "company_name": "Click",
        "company_website": "https://click.uz",
        "location": "Tashkent, Uzbekistan",
        "industry": "Fintech",
        "size": "501-1000",
        "description": "Digital payments and merchant solutions.",
        "password": "Company123!",
    },
    {
        "email": "careers@anormed.uz",
        "full_name": "AnorMed People Team",
        "phone": "+998902555555",
        "company_name": "AnorMed Clinic",
        "company_website": "https://anormed.uz",
        "location": "Tashkent, Uzbekistan",
        "industry": "Healthcare",
        "size": "201-500",
        "description": "Private healthcare network focused on diagnostics and outpatient services.",
        "password": "Company123!",
    },
    {
        "email": "jobs@orientlogistics.uz",
        "full_name": "Orient Logistics HR",
        "phone": "+998902666666",
        "company_name": "Orient Logistics",
        "company_website": "https://orientlogistics.uz",
        "location": "Tashkent, Uzbekistan",
        "industry": "Logistics",
        "size": "1001-5000",
        "description": "Freight and supply chain solutions across Uzbekistan and CIS.",
        "password": "Company123!",
    },
]

STUDENT_SEED = [
    {
        "email": "john@example.com",
        "full_name": "John Doe",
        "phone": "+998903333333",
        "password": "Student123!",
        "title": "Senior Python Developer",
        "summary": "Backend engineer with FastAPI, PostgreSQL, Redis and Docker.",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "AWS"],
        "ats": 92,
    },
    {
        "email": "jane@example.com",
        "full_name": "Jane Smith",
        "phone": "+998904444444",
        "password": "Student123!",
        "title": "Full Stack Developer",
        "summary": "Full-stack developer focused on React/Node.js applications.",
        "skills": ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "MongoDB"],
        "ats": 85,
    },
    {
        "email": "aziz@example.com",
        "full_name": "Aziz Rakhimov",
        "phone": "+998905555555",
        "password": "Student123!",
        "title": "QA Automation Engineer",
        "summary": "QA specialist with API/UI automation and CI pipelines.",
        "skills": ["Python", "Pytest", "Playwright", "Postman", "SQL", "GitHub Actions"],
        "ats": 88,
    },
    {
        "email": "dilnoza@example.com",
        "full_name": "Dilnoza Yusupova",
        "phone": "+998906666666",
        "password": "Student123!",
        "title": "Product Designer",
        "summary": "UX/UI designer building user-centered product interfaces.",
        "skills": ["Figma", "UX Research", "Design Systems", "Wireframing", "Prototyping"],
        "ats": 84,
    },
    {
        "email": "kamol@example.com",
        "full_name": "Kamol Ergashev",
        "phone": "+998907777777",
        "password": "Student123!",
        "title": "Data Analyst",
        "summary": "Data analyst with SQL, BI dashboards, and business reporting.",
        "skills": ["SQL", "Python", "Power BI", "Excel", "A/B Testing", "Statistics"],
        "ats": 87,
    },
    {
        "email": "nilufar@example.com",
        "full_name": "Nilufar Yuldosheva",
        "phone": "+998908888888",
        "password": "Student123!",
        "title": "Digital Marketing Specialist",
        "summary": "Growth marketer for social ads, content, and analytics.",
        "skills": ["SMM", "Google Ads", "Meta Ads", "SEO", "Content Marketing", "Analytics"],
        "ats": 81,
    },
    {
        "email": "zafar@example.com",
        "full_name": "Zafar Mamatkulov",
        "phone": "+998909999999",
        "password": "Student123!",
        "title": "Sales Manager",
        "summary": "B2B sales manager experienced in account growth and negotiation.",
        "skills": ["B2B Sales", "Negotiation", "CRM", "Pipeline Management", "Cold Outreach"],
        "ats": 79,
    },
    {
        "email": "sevara@example.com",
        "full_name": "Sevara Khamidova",
        "phone": "+998901010101",
        "password": "Student123!",
        "title": "HR Specialist",
        "summary": "HR specialist in recruiting, onboarding, and HR operations.",
        "skills": ["Recruiting", "Interviewing", "Onboarding", "People Ops", "HR Docs"],
        "ats": 83,
    },
    {
        "email": "malika@example.com",
        "full_name": "Malika Karimova",
        "phone": "+998901111212",
        "password": "Student123!",
        "title": "Accountant",
        "summary": "Accountant with strong reporting, reconciliation and payroll handling.",
        "skills": ["Financial Reporting", "General Ledger", "Payroll", "Excel", "1C", "Tax Accounting"],
        "ats": 84,
    },
    {
        "email": "shahzod@example.com",
        "full_name": "Shahzod Nurmatov",
        "phone": "+998901212323",
        "password": "Student123!",
        "title": "Logistics Coordinator",
        "summary": "Supply chain specialist managing dispatch, routing and warehouse workflows.",
        "skills": ["Supply Chain", "Dispatch Planning", "Inventory", "Excel", "ERP", "Communication"],
        "ats": 82,
    },
    {
        "email": "feruza@example.com",
        "full_name": "Feruza Saidova",
        "phone": "+998901313434",
        "password": "Student123!",
        "title": "Customer Support Specialist",
        "summary": "Customer support professional for omni-channel service and retention.",
        "skills": ["CRM", "Customer Support", "Call Handling", "Problem Solving", "Documentation"],
        "ats": 80,
    },
]

JOB_SEED = [
    {
        "company_email": "hr@epam.com",
        "title": "Senior Backend Developer",
        "description": "Lead backend architecture for fintech products.",
        "requirements": ["Python", "FastAPI", "PostgreSQL", "Microservices"],
        "responsibilities": ["API design", "Code review", "Mentoring", "System optimization"],
        "salary_min": 3000,
        "salary_max": 5000,
        "location": "Tashkent, Uzbekistan",
        "job_type": "hybrid",
        "experience_level": "senior",
        "status": JobStatus.ACTIVE.value,
        "views_count": 210,
        "expires_days": 30,
    },
    {
        "company_email": "hr@epam.com",
        "title": "Full Stack Developer",
        "description": "Build web platform features across frontend and backend.",
        "requirements": ["React", "Node.js", "TypeScript", "REST APIs"],
        "responsibilities": ["Feature delivery", "Cross-team collaboration", "Testing"],
        "salary_min": 2000,
        "salary_max": 3500,
        "location": "Tashkent, Uzbekistan",
        "job_type": "full_time",
        "experience_level": "mid",
        "status": JobStatus.ACTIVE.value,
        "views_count": 175,
        "expires_days": 24,
    },
    {
        "company_email": "hr@epam.com",
        "title": "DevOps Engineer",
        "description": "Improve deployment reliability and observability.",
        "requirements": ["Docker", "Kubernetes", "Linux", "CI/CD"],
        "responsibilities": ["Infra ops", "Monitoring", "Automation"],
        "salary_min": 2500,
        "salary_max": 4000,
        "location": "Remote",
        "job_type": "remote",
        "experience_level": "mid",
        "status": JobStatus.ACTIVE.value,
        "views_count": 142,
        "expires_days": 35,
    },
    {
        "company_email": "careers@uzum.uz",
        "title": "Product Designer",
        "description": "Design high-conversion e-commerce user journeys.",
        "requirements": ["Figma", "UX", "Design Systems", "Research"],
        "responsibilities": ["Wireframes", "Prototypes", "Usability testing"],
        "salary_min": 1500,
        "salary_max": 2800,
        "location": "Tashkent, Uzbekistan",
        "job_type": "hybrid",
        "experience_level": "mid",
        "status": JobStatus.ACTIVE.value,
        "views_count": 120,
        "expires_days": 26,
    },
    {
        "company_email": "careers@uzum.uz",
        "title": "Data Analyst",
        "description": "Analyze product metrics and customer funnels.",
        "requirements": ["SQL", "Power BI", "Python", "Statistics"],
        "responsibilities": ["Dashboards", "Reporting", "Insights"],
        "salary_min": 1300,
        "salary_max": 2300,
        "location": "Tashkent, Uzbekistan",
        "job_type": "full_time",
        "experience_level": "mid",
        "status": JobStatus.PAUSED.value,
        "views_count": 98,
        "expires_days": 20,
    },
    {
        "company_email": "careers@uzum.uz",
        "title": "Marketing Specialist",
        "description": "Run acquisition and retention campaigns.",
        "requirements": ["SMM", "Paid Ads", "SEO", "Analytics"],
        "responsibilities": ["Campaign management", "Reporting", "Creative testing"],
        "salary_min": 1000,
        "salary_max": 1800,
        "location": "Tashkent, Uzbekistan",
        "job_type": "full_time",
        "experience_level": "junior",
        "status": JobStatus.CLOSED.value,
        "views_count": 83,
        "expires_days": 7,
    },
    {
        "company_email": "jobs@click.uz",
        "title": "QA Automation Engineer",
        "description": "Automate critical payment flow tests.",
        "requirements": ["Pytest", "Playwright", "API testing", "CI"],
        "responsibilities": ["Automation", "Regression control", "Test strategy"],
        "salary_min": 1800,
        "salary_max": 3000,
        "location": "Tashkent, Uzbekistan",
        "job_type": "full_time",
        "experience_level": "mid",
        "status": JobStatus.ACTIVE.value,
        "views_count": 132,
        "expires_days": 32,
    },
    {
        "company_email": "jobs@click.uz",
        "title": "Sales Manager",
        "description": "Scale merchant partnerships and key accounts.",
        "requirements": ["B2B Sales", "Negotiation", "CRM"],
        "responsibilities": ["Pipeline growth", "Client meetings", "Closing"],
        "salary_min": 1200,
        "salary_max": 2200,
        "location": "Samarkand, Uzbekistan",
        "job_type": "hybrid",
        "experience_level": "mid",
        "status": JobStatus.ACTIVE.value,
        "views_count": 76,
        "expires_days": 40,
    },
    {
        "company_email": "jobs@click.uz",
        "title": "HR Specialist",
        "description": "Support recruitment and onboarding operations.",
        "requirements": ["Recruiting", "Interviewing", "People Ops"],
        "responsibilities": ["Candidate screening", "Onboarding", "HR admin"],
        "salary_min": 900,
        "salary_max": 1500,
        "location": "Tashkent, Uzbekistan",
        "job_type": "full_time",
        "experience_level": "junior",
        "status": JobStatus.ACTIVE.value,
        "views_count": 64,
        "expires_days": 28,
    },
    {
        "company_email": "careers@anormed.uz",
        "title": "Accountant",
        "description": "Manage accounting operations, reporting and compliance.",
        "requirements": ["General Ledger", "Tax Accounting", "Excel", "1C"],
        "responsibilities": ["Monthly closing", "Financial reporting", "Tax documentation"],
        "salary_min": 1000,
        "salary_max": 1800,
        "location": "Tashkent, Uzbekistan",
        "job_type": "full_time",
        "experience_level": "mid",
        "status": JobStatus.ACTIVE.value,
        "views_count": 74,
        "expires_days": 30,
    },
    {
        "company_email": "careers@anormed.uz",
        "title": "Reception Administrator",
        "description": "Coordinate patient flow, appointments and front-desk operations.",
        "requirements": ["Customer Service", "Communication", "MS Office"],
        "responsibilities": ["Patient reception", "Scheduling", "Call center coordination"],
        "salary_min": 700,
        "salary_max": 1200,
        "location": "Tashkent, Uzbekistan",
        "job_type": "full_time",
        "experience_level": "junior",
        "status": JobStatus.ACTIVE.value,
        "views_count": 66,
        "expires_days": 21,
    },
    {
        "company_email": "jobs@orientlogistics.uz",
        "title": "Logistics Coordinator",
        "description": "Coordinate daily dispatches and optimize delivery routes.",
        "requirements": ["Supply Chain", "Routing", "Excel", "ERP"],
        "responsibilities": ["Shipment planning", "Carrier communication", "KPI tracking"],
        "salary_min": 1100,
        "salary_max": 1900,
        "location": "Tashkent, Uzbekistan",
        "job_type": "hybrid",
        "experience_level": "mid",
        "status": JobStatus.ACTIVE.value,
        "views_count": 88,
        "expires_days": 33,
    },
    {
        "company_email": "jobs@orientlogistics.uz",
        "title": "Warehouse Supervisor",
        "description": "Lead warehouse operations and safety controls.",
        "requirements": ["Warehouse Ops", "Leadership", "Inventory Control"],
        "responsibilities": ["Shift management", "Stock integrity", "Team coordination"],
        "salary_min": 1200,
        "salary_max": 2100,
        "location": "Samarkand, Uzbekistan",
        "job_type": "full_time",
        "experience_level": "senior",
        "status": JobStatus.PAUSED.value,
        "views_count": 57,
        "expires_days": 27,
    },
]

APPLICATION_SEED = [
    # EPAM jobs
    {"student_email": "john@example.com", "job_title": "Senior Backend Developer", "status": ApplicationStatus.INTERVIEW.value, "match_score": "92%", "days_ago": 8, "interview_in_days": 2},
    {"student_email": "aziz@example.com", "job_title": "Senior Backend Developer", "status": ApplicationStatus.REVIEWING.value, "match_score": "86%", "days_ago": 5},
    {"student_email": "kamol@example.com", "job_title": "Senior Backend Developer", "status": ApplicationStatus.SHORTLISTED.value, "match_score": "80%", "days_ago": 4},
    {"student_email": "jane@example.com", "job_title": "Full Stack Developer", "status": ApplicationStatus.PENDING.value, "match_score": "89%", "days_ago": 2},
    {"student_email": "dilnoza@example.com", "job_title": "Full Stack Developer", "status": ApplicationStatus.ACCEPTED.value, "match_score": "84%", "days_ago": 13},
    {"student_email": "nilufar@example.com", "job_title": "DevOps Engineer", "status": ApplicationStatus.REJECTED.value, "match_score": "61%", "days_ago": 9},

    # UZUM jobs
    {"student_email": "dilnoza@example.com", "job_title": "Product Designer", "status": ApplicationStatus.INTERVIEW.value, "match_score": "95%", "days_ago": 6, "interview_in_days": 1},
    {"student_email": "jane@example.com", "job_title": "Product Designer", "status": ApplicationStatus.SHORTLISTED.value, "match_score": "82%", "days_ago": 5},
    {"student_email": "kamol@example.com", "job_title": "Data Analyst", "status": ApplicationStatus.REVIEWING.value, "match_score": "91%", "days_ago": 7},
    {"student_email": "john@example.com", "job_title": "Data Analyst", "status": ApplicationStatus.PENDING.value, "match_score": "74%", "days_ago": 1},
    {"student_email": "nilufar@example.com", "job_title": "Marketing Specialist", "status": ApplicationStatus.REJECTED.value, "match_score": "78%", "days_ago": 14},

    # CLICK jobs
    {"student_email": "aziz@example.com", "job_title": "QA Automation Engineer", "status": ApplicationStatus.INTERVIEW.value, "match_score": "93%", "days_ago": 3, "interview_in_days": 4},
    {"student_email": "john@example.com", "job_title": "QA Automation Engineer", "status": ApplicationStatus.SHORTLISTED.value, "match_score": "88%", "days_ago": 6},
    {"student_email": "kamol@example.com", "job_title": "QA Automation Engineer", "status": ApplicationStatus.REVIEWING.value, "match_score": "77%", "days_ago": 4},
    {"student_email": "zafar@example.com", "job_title": "Sales Manager", "status": ApplicationStatus.PENDING.value, "match_score": "90%", "days_ago": 2},
    {"student_email": "nilufar@example.com", "job_title": "Sales Manager", "status": ApplicationStatus.ACCEPTED.value, "match_score": "83%", "days_ago": 10},
    {"student_email": "sevara@example.com", "job_title": "HR Specialist", "status": ApplicationStatus.REVIEWING.value, "match_score": "87%", "days_ago": 3},
    {"student_email": "zafar@example.com", "job_title": "HR Specialist", "status": ApplicationStatus.REJECTED.value, "match_score": "65%", "days_ago": 11},

    # ANORMED jobs
    {"student_email": "malika@example.com", "job_title": "Accountant", "status": ApplicationStatus.INTERVIEW.value, "match_score": "94%", "days_ago": 4, "interview_in_days": 2},
    {"student_email": "kamol@example.com", "job_title": "Accountant", "status": ApplicationStatus.SHORTLISTED.value, "match_score": "81%", "days_ago": 6},
    {"student_email": "feruza@example.com", "job_title": "Reception Administrator", "status": ApplicationStatus.REVIEWING.value, "match_score": "88%", "days_ago": 3},
    {"student_email": "sevara@example.com", "job_title": "Reception Administrator", "status": ApplicationStatus.PENDING.value, "match_score": "79%", "days_ago": 1},

    # ORIENT LOGISTICS jobs
    {"student_email": "shahzod@example.com", "job_title": "Logistics Coordinator", "status": ApplicationStatus.INTERVIEW.value, "match_score": "93%", "days_ago": 5, "interview_in_days": 3},
    {"student_email": "zafar@example.com", "job_title": "Logistics Coordinator", "status": ApplicationStatus.SHORTLISTED.value, "match_score": "84%", "days_ago": 4},
    {"student_email": "john@example.com", "job_title": "Warehouse Supervisor", "status": ApplicationStatus.REVIEWING.value, "match_score": "72%", "days_ago": 7},
    {"student_email": "aziz@example.com", "job_title": "Warehouse Supervisor", "status": ApplicationStatus.REJECTED.value, "match_score": "58%", "days_ago": 9},
]


# =============================================================================
# SEED DATA FUNCTIONS
# =============================================================================


def _build_resume_content(student: dict) -> dict:
    return {
        "personal_info": {
            "name": student["full_name"],
            "email": student["email"],
            "phone": student["phone"],
            "location": "Tashkent, Uzbekistan",
        },
        "professional_summary": {"text": student["summary"]},
        "work_experience": [
            {
                "job_title": student["title"],
                "company_name": "Previous Company",
                "location": "Tashkent",
                "start_date": "2021-01-01",
                "end_date": "present",
                "is_current": True,
                "responsibilities": [
                    "Delivered measurable business impact",
                    "Collaborated with cross-functional teams",
                ],
                "technologies_used": student["skills"],
            }
        ],
        "education": [
            {
                "institution_name": "Tashkent State University",
                "degree_type": "Bachelor",
                "field_of_study": "Relevant Field",
                "graduation_date": "2020-06-01",
            }
        ],
        "skills": {
            "technical_skills": [{"category": "Core", "skills": student["skills"]}],
            "soft_skills": ["Muloqot", "Jamoada ishlash", "Muammo yechish"],
        },
        "languages": [
            {"language": "Uzbek", "level": "Native"},
            {"language": "Russian", "level": "Fluent"},
            {"language": "English", "level": "Intermediate"},
        ],
    }


def _build_match_breakdown(match_score: str, job_requirements: list[str], student_skills: list[str]) -> dict:
    """Build deterministic and UI-friendly match breakdown for company/student detail screens."""
    score_num = int(str(match_score).replace("%", "").strip()) if str(match_score).strip() else 0
    student_set = {skill.lower() for skill in student_skills}
    matched = [skill for skill in job_requirements if skill.lower() in student_set]
    missing = [skill for skill in job_requirements if skill.lower() not in student_set]
    return {
        "score": float(score_num),
        "matched_skills": matched,
        "missing_skills": missing,
        "reasons": [
            "Ko'nikmalar vakansiya talablariga mos keladi",
            "Tajriba va profil to'liqligi hisobga olindi",
        ],
    }


def seed_users(db):
    """Create admin, companies and students."""
    print("Creating users...")

    users = []

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
    users.append(admin)

    company_users = []
    for item in COMPANY_SEED:
        user = User(
            id=uuid4(),
            email=item["email"],
            full_name=item["full_name"],
            phone=item["phone"],
            role=UserRole.COMPANY,
            company_name=item["company_name"],
            company_website=item["company_website"],
            location=item.get("location"),
            subscription_tier="enterprise",
            notification_preferences={
                "new_applications": True,
                "application_updates": True,
                "weekly_report": True,
            },
            privacy_settings={
                "industry": item.get("industry"),
                "company_size": item.get("size"),
                "description": item.get("description"),
            },
            is_active_account=True,
            is_verified=True,
        )
        user.set_password(item["password"])
        users.append(user)
        company_users.append(user)

    student_users = []
    for item in STUDENT_SEED:
        user = User(
            id=uuid4(),
            email=item["email"],
            full_name=item["full_name"],
            phone=item["phone"],
            role=UserRole.STUDENT,
            location="Tashkent, Uzbekistan",
            is_active_account=True,
            is_verified=True,
        )
        user.set_password(item["password"])
        users.append(user)
        student_users.append(user)

    db.add_all(users)
    db.commit()

    print(f"✅ Created {len(users)} users")
    return {
        "admin": admin,
        "companies": company_users,
        "students": student_users,
    }


def seed_resumes(db, students):
    """Create one resume for each student."""
    print("Creating resumes...")

    students_by_email = {student.email: student for student in students}
    resumes = []

    for item in STUDENT_SEED:
        user = students_by_email[item["email"]]
        resume = Resume(
            id=uuid4(),
            user_id=user.id,
            title=item["title"],
            status="published",
            content=_build_resume_content(item),
            raw_text=f"{item['title']} | {' | '.join(item['skills'])}",
            ats_score=item["ats"],
            view_count=20 + (item["ats"] % 17),
        )
        resumes.append(resume)

    db.add_all(resumes)
    db.commit()

    print(f"✅ Created {len(resumes)} resumes")
    return resumes


def seed_jobs(db, companies):
    """Create jobs for company dashboard testing."""
    print("Creating jobs...")

    company_by_email = {company.email: company for company in companies}
    jobs = []

    for item in JOB_SEED:
        company = company_by_email[item["company_email"]]
        job = Job(
            id=uuid4(),
            company_id=company.id,
            title=item["title"],
            description=item["description"],
            requirements=item["requirements"],
            responsibilities=item["responsibilities"],
            benefits=["Health insurance", "Flexible schedule", "Career growth"],
            salary_min=item["salary_min"],
            salary_max=item["salary_max"],
            salary_currency="USD",
            location=item["location"],
            is_remote_allowed=item["job_type"] in {"remote", "hybrid"},
            job_type=item["job_type"],
            experience_level=item["experience_level"],
            status=item["status"],
            views_count=item["views_count"],
            applications_count=0,
            expires_at=datetime.now(timezone.utc) + timedelta(days=item["expires_days"]),
        )
        jobs.append(job)

    db.add_all(jobs)
    db.commit()

    print(f"✅ Created {len(jobs)} jobs")
    return jobs


def seed_applications(db, jobs, students, resumes):
    """Create cross-company applications with full pipeline statuses."""
    print("Creating applications...")

    jobs_by_title = {job.title: job for job in jobs}
    students_by_email = {student.email: student for student in students}
    resumes_by_user_id = {resume.user_id: resume for resume in resumes}

    applications = []

    for item in APPLICATION_SEED:
        student = students_by_email[item["student_email"]]
        job = jobs_by_title[item["job_title"]]
        resume = resumes_by_user_id[student.id]
        student_seed = next(seed for seed in STUDENT_SEED if seed["email"] == item["student_email"])

        applied_at = datetime.now(timezone.utc) - timedelta(days=item["days_ago"])
        interview_at = None
        interview_type = None
        meeting_link = None
        reviewed_at = None
        decided_at = None

        if item["status"] in {
            ApplicationStatus.REVIEWING.value,
            ApplicationStatus.SHORTLISTED.value,
            ApplicationStatus.INTERVIEW.value,
            ApplicationStatus.ACCEPTED.value,
            ApplicationStatus.REJECTED.value,
        }:
            reviewed_at = applied_at + timedelta(days=1)

        if item["status"] == ApplicationStatus.INTERVIEW.value:
            interview_at = datetime.now(timezone.utc) + timedelta(days=item.get("interview_in_days", 2))
            interview_type = "video"
            meeting_link = "https://meet.google.com/smartcareer-interview"

        if item["status"] in {ApplicationStatus.ACCEPTED.value, ApplicationStatus.REJECTED.value}:
            decided_at = applied_at + timedelta(days=3)

        app = Application(
            id=uuid4(),
            job_id=job.id,
            user_id=student.id,
            resume_id=resume.id,
            status=item["status"],
            cover_letter=(
                f"Assalomu alaykum, men {job.title} lavozimiga ariza yubormoqchiman. "
                f"Mening tajribam va ko'nikmalarim ushbu rolga mos keladi."
            ),
            notes="Intervyu jadvali va keyingi bosqichlar shu yerda yuritiladi.",
            match_score=item["match_score"],
            match_breakdown=_build_match_breakdown(item["match_score"], job.requirements or [], student_seed["skills"]),
            applied_at=applied_at,
            reviewed_at=reviewed_at,
            interview_at=interview_at,
            interview_type=interview_type,
            meeting_link=meeting_link,
            decided_at=decided_at,
        )
        applications.append(app)

    db.add_all(applications)
    db.commit()

    # Recalculate applications_count from actual rows
    counts = dict(
        db.query(Application.job_id, func.count(Application.id))
        .group_by(Application.job_id)
        .all()
    )
    for job in jobs:
        job.applications_count = int(counts.get(job.id, 0))
    db.commit()

    print(f"✅ Created {len(applications)} applications")
    return applications


def main():
    """Run all seed functions."""
    print("\n" + "=" * 70)
    print("🌱 SEEDING DATABASE")
    print("=" * 70 + "\n")

    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created\n")

    db = SessionLocal()

    try:
        existing_users = db.query(User).count()
        if existing_users > 0:
            response = input(f"⚠️  Database already has {existing_users} users. Continue? (y/N): ")
            if response.lower() != "y":
                print("Aborted.")
                return

            print("\nClearing existing data...")
            db.query(Application).delete()
            db.query(Job).delete()
            db.query(Resume).delete()
            db.query(User).delete()
            db.commit()
            print("✅ Data cleared\n")

        users = seed_users(db)
        resumes = seed_resumes(db, users["students"])
        jobs = seed_jobs(db, users["companies"])
        applications = seed_applications(db, jobs, users["students"], resumes)

        print("\n" + "=" * 70)
        print("✅ DATABASE SEEDED SUCCESSFULLY!")
        print("=" * 70)
        print("\n📝 Test Accounts:")
        print("   Admin:    admin@ishtop.uz / Admin123!")
        print("   Company1: hr@epam.com / Company123!")
        print("   Company2: careers@uzum.uz / Company123!")
        print("   Company3: jobs@click.uz / Company123!")
        print("   Company4: careers@anormed.uz / Company123!")
        print("   Company5: jobs@orientlogistics.uz / Company123!")
        print("   Student:  john@example.com / Student123! (va boshqalar ham Student123!)")
        print("\n📊 Seed Summary:")
        print(f"   Users:        {db.query(User).count()}")
        print(f"   Companies:    {db.query(User).filter(User.role == UserRole.COMPANY).count()}")
        print(f"   Jobs:         {db.query(Job).count()}")
        print(f"   Applications: {db.query(Application).count()}")
        print("\n🚀 Start the server: uvicorn app.main:app --reload")
        print("=" * 70 + "\n")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
