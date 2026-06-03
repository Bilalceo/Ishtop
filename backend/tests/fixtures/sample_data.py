"""
=============================================================================
SAMPLE TEST DATA
=============================================================================

Reusable test data for unit and integration tests.
"""

from datetime import datetime, timedelta
from uuid import uuid4


# =============================================================================
# USER DATA
# =============================================================================

def get_valid_user_data():
    """Get valid user registration data."""
    return {
        "email": f"test_{uuid4().hex[:8]}@example.com",
        "password": "SecureP@ssw0rd123",
        "full_name": "Test User",
        "phone": "+998901234567",
        "role": "student"
    }


def get_company_user_data():
    """Get valid company user registration data."""
    return {
        "email": f"company_{uuid4().hex[:8]}@example.com",
        "password": "CompanyP@ss123!",
        "full_name": "Tech Corp HR",
        "phone": "+998907654321",
        "role": "company",
        "company_name": "Tech Corp Inc."
    }


EXISTING_USER = {
    "id": "user-test-123",
    "email": "existing@example.com",
    "full_name": "Existing User",
    "phone": "+998901111111",
    "role": "student",
    "is_active": True,
    "is_verified": True,
    "created_at": datetime.utcnow().isoformat()
}


INVALID_USERS = [
    {
        "email": "invalid-email",
        "password": "test123",
        "full_name": "Test"
    },
    {
        "email": "test@example.com",
        "password": "123",  # Too short
        "full_name": "Test"
    },
    {
        "email": "",
        "password": "SecureP@ssw0rd123",
        "full_name": "Test"
    }
]


# =============================================================================
# RESUME DATA
# =============================================================================

def get_valid_resume_content():
    """Get valid resume content structure."""
    return {
        "personal_info": {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+998901234567",
            "location": "Tashkent, Uzbekistan",
            "professional_title": "Senior Software Engineer",
            "linkedin_url": "https://linkedin.com/in/johndoe",
            "portfolio_url": "https://johndoe.dev"
        },
        "summary": "Experienced software engineer with 5+ years of experience in building scalable web applications. Proficient in Python, JavaScript, and cloud technologies.",
        "experience": [
            {
                "company": "Tech Corp",
                "position": "Senior Software Engineer",
                "start_date": "2021-01",
                "end_date": None,
                "is_current": True,
                "description": "Leading backend development for core platform.",
                "achievements": [
                    "Reduced API response time by 40%",
                    "Implemented microservices architecture",
                    "Mentored 3 junior developers"
                ]
            },
            {
                "company": "Startup Inc",
                "position": "Software Engineer",
                "start_date": "2019-03",
                "end_date": "2020-12",
                "is_current": False,
                "description": "Full-stack development for e-commerce platform.",
                "achievements": [
                    "Built payment integration system",
                    "Increased test coverage to 85%"
                ]
            }
        ],
        "education": [
            {
                "institution": "National University",
                "degree": "Bachelor's",
                "field": "Computer Science",
                "year": "2019",
                "gpa": "3.8"
            }
        ],
        "skills": {
            "technical": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "React", "TypeScript"],
            "soft": ["Leadership", "Communication", "Problem Solving", "Team Collaboration"]
        },
        "languages": [
            {"name": "English", "proficiency": "Fluent"},
            {"name": "Uzbek", "proficiency": "Native"},
            {"name": "Russian", "proficiency": "Intermediate"}
        ],
        "certifications": [
            {
                "name": "AWS Solutions Architect",
                "issuer": "Amazon",
                "date": "2023-06"
            }
        ]
    }


def get_minimal_resume_content():
    """Get minimal valid resume content."""
    return {
        "personal_info": {
            "name": "Jane Smith",
            "email": "jane@example.com"
        },
        "skills": {
            "technical": ["Python", "SQL"]
        }
    }


def get_invalid_resume_contents():
    """Get list of invalid resume contents for testing validation."""
    return [
        # Missing personal_info
        {
            "skills": {"technical": ["Python"]}
        },
        # Empty personal_info
        {
            "personal_info": {},
            "skills": {"technical": ["Python"]}
        },
        # Invalid email
        {
            "personal_info": {
                "name": "Test",
                "email": "not-an-email"
            }
        }
    ]


SAMPLE_RESUME = {
    "id": "resume-test-123",
    "user_id": "user-test-123",
    "title": "Software Engineer Resume",
    "content": get_valid_resume_content(),
    "ai_generated": False,
    "status": "published",
    "view_count": 25,
    "ats_score": 85,
    "created_at": datetime.utcnow().isoformat(),
    "updated_at": datetime.utcnow().isoformat()
}


# =============================================================================
# JOB DATA
# =============================================================================

def get_valid_job_data():
    """Get valid job posting data."""
    return {
        "title": "Senior Backend Developer",
        "description": """
        We are looking for an experienced Backend Developer to join our team.
        
        Responsibilities:
        - Design and implement scalable APIs
        - Work with databases and optimize queries
        - Collaborate with frontend team
        - Write clean, maintainable code
        
        We offer competitive salary, remote work options, and great benefits.
        """,
        "requirements": ["Python", "FastAPI", "PostgreSQL", "Docker", "Git"],
        "salary_min": 2000,
        "salary_max": 4000,
        "location": "Tashkent",
        "job_type": "full_time",
        "experience_level": "senior",
        "is_remote_allowed": True
    }


def get_minimal_job_data():
    """Get minimal valid job data."""
    return {
        "title": "Junior Developer",
        "description": "Entry-level position for recent graduates who want to learn backend development and ship production features.",
        "location": "Tashkent",
        "job_type": "full_time"
    }


SAMPLE_JOBS = [
    {
        "id": "job-1",
        "company_id": "company-1",
        "title": "Senior Backend Developer",
        "description": "Looking for experienced Python developer...",
        "requirements": ["Python", "FastAPI", "PostgreSQL"],
        "salary_min": 3000,
        "salary_max": 5000,
        "location": "Tashkent",
        "job_type": "full_time",
        "experience_level": "senior",
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    },
    {
        "id": "job-2",
        "company_id": "company-1",
        "title": "Frontend Developer",
        "description": "React developer needed...",
        "requirements": ["React", "TypeScript", "CSS"],
        "salary_min": 2000,
        "salary_max": 3500,
        "location": "Remote",
        "job_type": "full_time",
        "experience_level": "mid",
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    },
    {
        "id": "job-3",
        "company_id": "company-2",
        "title": "DevOps Engineer",
        "description": "Cloud infrastructure specialist...",
        "requirements": ["AWS", "Docker", "Kubernetes", "Terraform"],
        "salary_min": 3500,
        "salary_max": 6000,
        "location": "Tashkent",
        "job_type": "full_time",
        "experience_level": "senior",
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    }
]


# =============================================================================
# APPLICATION DATA
# =============================================================================

def get_valid_application_data(job_id: str, resume_id: str):
    """Get valid application data."""
    return {
        "job_id": job_id,
        "resume_id": resume_id,
        "cover_letter": """
        Dear Hiring Manager,
        
        I am writing to express my strong interest in the position at your company.
        With my background in software development and passion for building great products,
        I believe I would be a valuable addition to your team.
        
        Thank you for considering my application.
        
        Best regards,
        John Doe
        """
    }


SAMPLE_APPLICATIONS = [
    {
        "id": "app-1",
        "job_id": "job-1",
        "user_id": "user-1",
        "resume_id": "resume-1",
        "status": "pending",
        "applied_at": datetime.utcnow().isoformat()
    },
    {
        "id": "app-2",
        "job_id": "job-2",
        "user_id": "user-1",
        "resume_id": "resume-1",
        "status": "reviewing",
        "applied_at": (datetime.utcnow() - timedelta(days=3)).isoformat()
    }
]


# =============================================================================
# AI SERVICE DATA
# =============================================================================

AI_RESUME_INPUT = {
    "user_data": {
        "personal_info": {
            "name": "Alex Johnson",
            "email": "alex@example.com",
            "phone": "+998909999999"
        },
        "experience": [
            {
                "company": "Tech Startup",
                "position": "Software Developer",
                "years": 3,
                "description": "Built web applications"
            }
        ],
        "education": [
            {
                "institution": "State University",
                "degree": "Bachelor's",
                "field": "Computer Science"
            }
        ],
        "skills": ["Python", "JavaScript", "React", "Node.js"]
    },
    "template": "modern",
    "tone": "professional"
}


AI_COVER_LETTER_INPUT = {
    "job_title": "Senior Software Engineer",
    "company_name": "Tech Corp",
    "job_description": "Looking for experienced developer...",
    "resume_summary": "5 years experience in Python and web development",
    "tone": "enthusiastic"
}


# =============================================================================
# TOKEN DATA
# =============================================================================

EXPIRED_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTYwMDAwMDAwMH0.invalid"

INVALID_TOKEN = "invalid.token.here"

MALFORMED_TOKEN = "not-even-a-jwt"


# =============================================================================
# COMPANY DATA
# =============================================================================

SAMPLE_COMPANIES = [
    {
        "id": "company-1",
        "name": "EPAM Systems",
        "description": "Global technology company",
        "industry": "Technology",
        "size": "10000+",
        "location": "Tashkent",
        "logo_url": "/logos/epam.png",
        "website": "https://epam.com"
    },
    {
        "id": "company-2",
        "name": "Uzum",
        "description": "Leading e-commerce platform",
        "industry": "E-commerce",
        "size": "500-1000",
        "location": "Tashkent",
        "logo_url": "/logos/uzum.png",
        "website": "https://uzum.uz"
    }
]
















