"""
=============================================================================
AI Router - API Endpoints for AI Features
=============================================================================

This file defines all the API endpoints (routes) for AI-powered features.
These endpoints call the AI service to generate resumes, analyze content, etc.

ENDPOINTS:
    POST /api/ai/generate-resume     - Generate a new resume with AI
    POST /api/ai/analyze-resume      - Analyze an existing resume
    POST /api/ai/generate-cover-letter - Generate a cover letter
    POST /api/ai/match-job           - Match resume to job description
    GET  /api/ai/usage               - Get API usage statistics
    GET  /api/ai/health              - Check AI service health
"""


from fastapi import APIRouter, HTTPException, status, Body, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import re

from app.config import settings
from app.core.dependencies import get_current_active_user, rate_limit

# Try to import AI services
try:
    from app.services.ai_service import (
        AIService, 
        AIServiceError, 
        AIGenerationError, 
        AIRateLimitError,
        AIConfigurationError
    )
    OPENAI_AVAILABLE = True
except Exception as e:
    OPENAI_AVAILABLE = False
    AIService = None

try:
    from app.services.gemini_service import gemini_service
    GEMINI_AVAILABLE = gemini_service.is_available
except Exception as e:
    GEMINI_AVAILABLE = False
    gemini_service = None

# Set up logging
logger = logging.getLogger(__name__)

# Create the router with a prefix and tags for documentation
router = APIRouter()

# Determine which AI provider to use
AI_PROVIDER = getattr(settings, 'AI_PROVIDER', 'gemini')
logger.info(f"🤖 AI Provider: {AI_PROVIDER}")
logger.info(f"   Gemini available: {GEMINI_AVAILABLE}")
logger.info(f"   OpenAI available: {OPENAI_AVAILABLE}")

# Create OpenAI service instance if needed
ai_service = None
if AI_PROVIDER == 'openai' and OPENAI_AVAILABLE:
    try:
        ai_service = AIService()
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI service: {e}")
        ai_service = None


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================
# These Pydantic models define the expected request body and response format

class ResumeGenerateRequest(BaseModel):
    """Request model for resume generation."""
    
    job_title: str = Field(
        ...,  # ... means required
        min_length=2,
        max_length=100,
        description="Target job title (e.g., 'Software Engineer')",
        examples=["Software Engineer", "Product Manager", "Data Scientist"]
    )
    
    years_experience: int = Field(
        ...,
        ge=0,  # greater than or equal to 0
        le=50,  # less than or equal to 50
        description="Years of professional experience"
    )
    
    skills: List[str] = Field(
        ...,
        min_length=1,
        max_length=20,
        description="List of key skills to highlight",
        examples=[["Python", "React", "AWS", "Docker"]]
    )
    
    education_level: str = Field(
        default="Bachelor's",
        description="Highest education level",
        examples=["High School", "Bachelor's", "Master's", "PhD"]
    )
    
    field_of_study: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Field of study or major"
    )
    
    target_company: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Company you're applying to (for tailored content)"
    )
    
    job_description: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Full job description to tailor resume to"
    )
    
    include_projects: bool = Field(
        default=True,
        description="Whether to include a projects section"
    )
    
    tone: str = Field(
        default="professional",
        description="Writing tone for the resume",
        examples=["professional", "creative", "technical"]
    )
    
    additional_info: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Any additional context or requirements"
    )


class ResumeAnalyzeRequest(BaseModel):
    """Request model for resume analysis."""
    
    resume_text: str = Field(
        ...,
        min_length=100,
        max_length=20000,
        description="Plain text content of the resume to analyze"
    )


class CoverLetterRequest(BaseModel):
    """Request model for cover letter generation."""
    
    resume_text: str = Field(
        ...,
        min_length=100,
        max_length=20000,
        description="The candidate's resume text"
    )
    
    job_description: str = Field(
        ...,
        min_length=50,
        max_length=10000,
        description="The job posting description"
    )
    
    company_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the company"
    )
    
    hiring_manager: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Name of the hiring manager (if known)"
    )
    
    tone: str = Field(
        default="professional",
        description="Writing tone",
        examples=["professional", "enthusiastic", "creative"]
    )


class JobMatchRequest(BaseModel):
    """Request model for job matching."""
    
    resume_text: str = Field(
        ...,
        min_length=100,
        max_length=20000,
        description="The candidate's resume text"
    )
    
    job_description: str = Field(
        ...,
        min_length=50,
        max_length=10000,
        description="The job posting description"
    )

# =============================================================================
# STUDENT HELP ASSISTANT
# =============================================================================

class HelpAssistantRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=3,
        max_length=1200,
        description="User question about the platform",
    )
    locale: str = Field(default="uz", description="uz | ru")
    context_page: Optional[str] = Field(default=None, max_length=120)

def _condense_help_answer(answer: str, locale: str) -> str:
    """
    Keep helper replies short and actionable for chat-like UX.
    - Max 3 meaningful lines
    - Max 420 chars
    """
    cleaned = re.sub(r"\n{3,}", "\n\n", (answer or "").strip())
    lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    short_lines = lines[:3]
    short = "\n".join(short_lines).strip()

    if len(short) <= 420:
        return short

    clipped = short[:417].rstrip(" ,.;:-")
    return f"{clipped}..."


@router.post(
    "/help-assistant",
    response_model=Dict[str, Any],
    summary="Student help assistant",
    description="Answer user questions about how to use IshTop platform features.",
)
async def help_assistant(
    request: HelpAssistantRequest,
    _user=Depends(get_current_active_user),
    _rl: None = Depends(rate_limit(max_requests=10, window_seconds=60)),
):
    """
    AI helper for student dashboard questions.
    Returns a concise practical answer in Uzbek or Russian.
    """
    service = get_ai_service()
    locale = (request.locale or "uz").strip().lower()
    # Keep assistant replies constrained to supported UI locales.
    if locale not in {"uz", "ru"}:
        locale = "uz"

    context = (
        "You are IshTop Assistant for students. "
        "IshTop includes: AI resume builder, job search filters, quick apply, "
        "applications tracking, saved jobs, notifications, and profile settings. "
        "Never fabricate credentials, secrets, API keys, or admin-only actions. "
        "Give practical step-by-step instructions."
    )
    lang_rule = (
        "Answer only in Russian (Cyrillic)." if locale == "ru" else
        "Javobni faqat o'zbek tilida (lotin) bering."
    )
    page_hint = (
        f"User current page: {request.context_page}." if request.context_page else ""
    )
    prompt = (
        f"{context}\n{lang_rule}\n{page_hint}\n\n"
        f"User question:\n{request.question}\n\n"
        "Rules:\n"
        "1) Keep answer very short and clear.\n"
        "2) Use at most 3 short lines.\n"
        "3) Mention relevant section names in the app (Resumes, Jobs, Applications, Settings).\n"
        "4) If problem may be network-related, suggest refresh + relogin + support contact.\n"
        "5) Avoid long explanations and avoid repeating the question.\n"
    )

    try:
        answer_text: Optional[str] = None
        if hasattr(service, "generate"):
            answer_text = await service.generate(prompt, response_format="text")
        elif hasattr(service, "_call_openai_api"):
            answer_text = await service._call_openai_api(  # type: ignore[attr-defined]
                system_message=context,
                prompt=f"{lang_rule}\n{page_hint}\n\n{request.question}",
                operation="help_assistant",
                response_format_json=False,
                temperature=0.3,
                max_tokens=500,
            )
        else:
            raise Exception("No supported generation method for current AI provider")

        answer_text = (answer_text or "").strip()
        if not answer_text:
            raise Exception("Empty AI response")

        answer_text = _condense_help_answer(answer_text, locale)

        return {
            "success": True,
            "data": {
                "answer": answer_text,
                "locale": locale,
            },
            "message": "Help answer generated",
        }
    except Exception as exc:
        logger.exception("Help assistant generation failed: %s", exc)
        fallback = (
            "Hozir AI yordamchi vaqtincha band. Iltimos, sahifani yangilang va savolni qayta yuboring. "
            "Muammo davom etsa Sozlamalar > Yordam orqali support bilan bog'laning."
            if locale == "uz"
            else "AI-помощник временно недоступен. Обновите страницу и отправьте вопрос снова. "
                 "Если проблема останется, откройте Настройки > Помощь и свяжитесь с поддержкой."
        )
        return {
            "success": True,
            "data": {
                "answer": fallback,
                "locale": locale,
                "fallback": True,
            },
            "message": "Fallback help answer returned",
        }


# =============================================================================
# HELPER FUNCTION - Check if AI service is available
# =============================================================================

def get_ai_service():
    """
    Get the appropriate AI service based on configuration.
    Supports both Gemini (free!) and OpenAI.
    """
    # First try Gemini (it's free!)
    if AI_PROVIDER == 'gemini' and GEMINI_AVAILABLE:
        return gemini_service
    
    # Fall back to OpenAI
    if ai_service is not None:
        return ai_service
    
    # No AI service available
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "error": "AI Service Unavailable",
            "message": "No AI service is configured. Please set either "
                      "GEMINI_API_KEY (free!) or OPENAI_API_KEY in .env file. "
                      "Get free Gemini key at: https://ai.google.dev/",
            "code": "AI_SERVICE_UNAVAILABLE"
        }
    )


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post(
    "/generate-resume",
    response_model=Dict[str, Any],
    summary="Generate a Resume with AI",
    description="Generate a complete professional resume using AI (Gemini - FREE or OpenAI)."
)
async def generate_resume(
    request: ResumeGenerateRequest,
    _user=Depends(get_current_active_user),
    _rl: None = Depends(rate_limit(max_requests=5, window_seconds=60)),
):
    """
    Generate a professional resume using AI.
    
    Supports both:
    - 🌟 Google Gemini (FREE!)
    - 💎 OpenAI GPT-4 (paid)
    
    **Request Body:**
    - `job_title`: Target position (required)
    - `years_experience`: Years of experience (required)
    - `skills`: List of skills (required)
    - `education_level`: Highest education (optional)
    - `target_company`: Company name for tailoring (optional)
    - `job_description`: Full JD for better tailoring (optional)
    """
    service = get_ai_service()
    
    try:
        # Prepare user data for AI
        user_data = {
            "job_title": request.job_title,
            "years_experience": request.years_experience,
            "skills": request.skills,
            "education_level": request.education_level,
            "field_of_study": request.field_of_study,
            "target_company": request.target_company,
            "job_description": request.job_description,
            "include_projects": request.include_projects,
            "tone": request.tone,
            "additional_info": request.additional_info
        }
        
        # Check if using Gemini or OpenAI
        if hasattr(service, 'generate_resume') and AI_PROVIDER == 'gemini':
            # Use Gemini service
            result = await service.generate_resume(user_data)
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "error": "Generation Failed",
                        "message": result.get("error", "Unknown error"),
                        "code": "GENERATION_ERROR"
                    }
                )
            
            return {
                "success": True,
                "data": result.get("resume"),
                "message": "Resume generated successfully with Gemini (FREE!)",
                "provider": "gemini"
            }
        else:
            # Use OpenAI service
            result = await service.generate_resume(
                job_title=request.job_title,
                years_experience=request.years_experience,
                skills=request.skills,
                education_level=request.education_level,
                field_of_study=request.field_of_study,
                target_company=request.target_company,
                job_description=request.job_description,
                include_projects=request.include_projects,
                tone=request.tone,
                additional_info=request.additional_info
            )
            
            return {
                "success": True,
                "data": result,
                "message": "Resume generated successfully",
                "provider": "openai"
            }
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.exception(f"Unexpected error in resume generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal Error",
                "message": str(e),
                "code": "INTERNAL_ERROR"
            }
        )


@router.post(
    "/analyze-resume",
    response_model=Dict[str, Any],
    summary="Analyze a Resume",
    description="Analyze an existing resume for ATS compatibility, skills, and improvements."
)
async def analyze_resume(
    request: ResumeAnalyzeRequest,
    _user=Depends(get_current_active_user),
    _rl: None = Depends(rate_limit(max_requests=5, window_seconds=60)),
):
    """
    Analyze a resume and provide detailed feedback.
    
    This endpoint evaluates a resume and returns:
    - ATS compatibility score (0-100)
    - Extracted skills
    - Strengths and weaknesses
    - Specific improvement suggestions
    
    **Example Response:**
    ```json
    {
        "success": true,
        "data": {
            "ats_score": 75,
            "skills_extracted": ["Python", "React", "AWS"],
            "strengths": ["Strong technical skills", "Good metrics"],
            "improvement_suggestions": ["Add more quantifiable achievements"]
        }
    }
    ```
    """
    service = get_ai_service()
    
    try:
        result = await service.analyze_resume(request.resume_text)
        
        return {
            "success": True,
            "data": result,
            "message": "Resume analyzed successfully"
        }
        
    except AIGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Analysis Failed", "message": str(e)}
        )


@router.post(
    "/generate-cover-letter",
    response_model=Dict[str, Any],
    summary="Generate a Cover Letter",
    description="Generate a tailored cover letter based on resume and job description."
)
async def generate_cover_letter(
    request: CoverLetterRequest,
    _user=Depends(get_current_active_user),
    _rl: None = Depends(rate_limit(max_requests=5, window_seconds=60)),
):
    """
    Generate a personalized cover letter.
    
    Creates a compelling cover letter that:
    - Matches the candidate's experience to the job requirements
    - Uses appropriate tone and style
    - Includes specific achievements from the resume
    """
    service = get_ai_service()
    
    try:
        cover_letter = await service.generate_cover_letter(
            resume_text=request.resume_text,
            job_description=request.job_description,
            company_name=request.company_name,
            hiring_manager=request.hiring_manager,
            tone=request.tone
        )
        
        return {
            "success": True,
            "data": {"cover_letter": cover_letter},
            "message": "Cover letter generated successfully"
        }
        
    except AIGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Generation Failed", "message": str(e)}
        )


@router.post(
    "/match-job",
    response_model=Dict[str, Any],
    summary="Match Resume to Job",
    description="Analyze how well a resume matches a specific job description."
)
async def match_job(
    request: JobMatchRequest,
    _user=Depends(get_current_active_user),
    _rl: None = Depends(rate_limit(max_requests=10, window_seconds=60)),
):
    """
    Analyze resume-job fit.
    
    Returns:
    - Match score (0-100)
    - Matching skills
    - Missing skills
    - Recommendations for improving match
    """
    service = get_ai_service()
    
    try:
        result = await service.match_resume_to_job(
            resume_text=request.resume_text,
            job_description=request.job_description
        )
        
        return {
            "success": True,
            "data": result,
            "message": "Match analysis complete"
        }
        
    except AIGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Analysis Failed", "message": str(e)}
        )


@router.get(
    "/usage",
    response_model=Dict[str, Any],
    summary="Get API Usage Statistics",
    description="Get token usage and cost estimates for the current session."
)
async def get_usage(_user=Depends(get_current_active_user)):
    """
    Get AI API usage statistics.
    
    Returns information about:
    - Total tokens used
    - Number of requests made
    - Estimated costs
    - Recent request history
    """
    service = get_ai_service()
    
    return {
        "success": True,
        "data": service.get_usage_summary(),
        "message": "Usage statistics retrieved"
    }


@router.get(
    "/health",
    response_model=Dict[str, Any],
    summary="Health Check",
    description="Check if the AI service is properly configured and operational."
)
async def health_check():
    """
    Check AI service health.
    
    Shows status of:
    - 🌟 Gemini (FREE!)
    - 💎 OpenAI
    """
    return {
        "status": "healthy" if (GEMINI_AVAILABLE or ai_service) else "unhealthy",
        "provider": AI_PROVIDER,
        "gemini": {
            "available": GEMINI_AVAILABLE,
            "model": getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-flash') if GEMINI_AVAILABLE else None,
            "free": True
        },
        "openai": {
            "available": ai_service is not None,
            "model": getattr(settings, 'OPENAI_MODEL', None) if ai_service else None,
            "free": False
        },
        "help": "Get free Gemini API key at: https://ai.google.dev/" if not GEMINI_AVAILABLE else None
    }















# =============================================================================
# AI HR — recruiter-facing helpers (job desc, candidate summary, questions, email)
# =============================================================================

from app.core.dependencies import get_db, get_current_company
from app.services import ai_hr as ai_hr_service
from app.models import Application, Job, Resume, User as _User, UserRole as _UserRole
from sqlalchemy.orm import Session
from uuid import UUID


class JobDescriptionRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    seniority: str = Field("mid", description="intern | junior | mid | senior | lead")
    tone: str = Field("professional", description="professional | friendly | startup")
    industry: Optional[str] = None
    location: Optional[str] = None
    must_have: List[str] = Field(default_factory=list)
    locale: str = Field("uz", description="uz | ru | en")


@router.post(
    "/hr/job-description",
    summary="AI job description generator (HR)",
    description="Draft a complete job description from a short brief.",
)
async def ai_hr_job_description(
    request: JobDescriptionRequest,
    company: _User = Depends(get_current_company),
    _rl: None = Depends(rate_limit(max_requests=5, window_seconds=60)),
):
    data = await ai_hr_service.generate_job_description(
        title=request.title,
        seniority=request.seniority,
        tone=request.tone,
        industry=request.industry,
        location=request.location,
        must_have=request.must_have,
        locale=request.locale,
    )
    return {"success": True, "data": data}


def _resume_payload(resume: Optional[Resume]) -> Dict[str, Any]:
    if not resume:
        return {"title": None, "skills": []}
    content = resume.content or {}
    skills_section = content.get("skills") or {}
    flat_skills: List[str] = []
    if isinstance(skills_section, dict):
        for entry in skills_section.get("technical_skills", []) or []:
            if isinstance(entry, dict):
                flat_skills.extend(entry.get("skills", []) or [])
        for s in skills_section.get("soft_skills", []) or []:
            flat_skills.append(s)
    elif isinstance(skills_section, list):
        flat_skills.extend([str(s) for s in skills_section])
    return {"title": resume.title, "skills": flat_skills[:30]}


def _job_payload(job: Optional[Job]) -> Dict[str, Any]:
    if not job:
        return {}
    reqs = job.requirements
    if isinstance(reqs, dict):
        flat = []
        for v in reqs.values():
            if isinstance(v, list):
                flat.extend([str(x) for x in v])
            elif isinstance(v, str):
                flat.append(v)
        reqs = flat
    return {
        "title": job.title,
        "location": job.location,
        "experience_level": job.experience_level,
        "requirements": reqs if isinstance(reqs, list) else [],
    }


def _load_application_for_company(
    application_id: UUID, company: _User, db: Session
) -> Application:
    application = (
        db.query(Application)
        .filter(Application.id == application_id, Application.is_deleted == False)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if not application.job or application.job.company_id != company.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return application


@router.post(
    "/hr/applications/{application_id}/summary",
    summary="AI candidate summary (HR)",
)
async def ai_hr_candidate_summary(
    application_id: UUID,
    locale: str = "uz",
    company: _User = Depends(get_current_company),
    db: Session = Depends(get_db),
    _rl: None = Depends(rate_limit(max_requests=10, window_seconds=60)),
):
    application = _load_application_for_company(application_id, company, db)
    data = await ai_hr_service.generate_candidate_summary(
        job=_job_payload(application.job),
        resume=_resume_payload(application.resume),
        match_breakdown=application.match_breakdown,
        locale=locale,
    )
    return {"success": True, "data": data}


@router.post(
    "/hr/applications/{application_id}/questions",
    summary="AI interview questions (HR)",
)
async def ai_hr_interview_questions(
    application_id: UUID,
    count: int = 8,
    locale: str = "uz",
    company: _User = Depends(get_current_company),
    _rl: None = Depends(rate_limit(max_requests=10, window_seconds=60)),
    db: Session = Depends(get_db),
):
    application = _load_application_for_company(application_id, company, db)
    data = await ai_hr_service.generate_interview_questions(
        job=_job_payload(application.job),
        resume=_resume_payload(application.resume),
        count=max(3, min(15, count)),
        locale=locale,
    )
    return {"success": True, "data": data}


class EmailTemplateRequest(BaseModel):
    action: str = Field(..., description="interview | reject | offer | shortlist | follow_up")
    interview_at: Optional[str] = None
    meeting_link: Optional[str] = None
    locale: str = "uz"


@router.post(
    "/hr/applications/{application_id}/email",
    summary="AI recruiter email template (HR)",
)
async def ai_hr_email_template(
    application_id: UUID,
    request: EmailTemplateRequest,
    company: _User = Depends(get_current_company),
    db: Session = Depends(get_db),
    _rl: None = Depends(rate_limit(max_requests=10, window_seconds=60)),
):
    application = _load_application_for_company(application_id, company, db)
    applicant_name = (application.user.full_name if application.user else "—") or "—"
    job_title = (application.job.title if application.job else "—") or "—"
    company_name = (company.company_name or company.full_name or "Company")

    data = await ai_hr_service.generate_email_template(
        action=request.action,
        applicant_name=applicant_name,
        job_title=job_title,
        company_name=company_name,
        interview_at=request.interview_at,
        meeting_link=request.meeting_link,
        locale=request.locale,
    )
    return {"success": True, "data": data}


class SendEmailRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=300)
    body: str = Field(..., min_length=1, max_length=10000)


@router.post(
    "/hr/applications/{application_id}/email/send",
    summary="Send an AI-drafted recruiter email to the candidate",
    description=(
        "Sends the provided subject + body to the applicant's email via the "
        "configured email provider. The frontend typically uses this right "
        "after generating the draft with /hr/applications/{id}/email."
    ),
)
async def ai_hr_email_send(
    application_id: UUID,
    request: SendEmailRequest,
    company: _User = Depends(get_current_company),
    db: Session = Depends(get_db),
    _rl: None = Depends(rate_limit(max_requests=20, window_seconds=60)),
):
    application = _load_application_for_company(application_id, company, db)
    applicant = application.user
    if not applicant or not applicant.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Candidate has no email on file")

    from app.services.email_service import email_service

    ok = await email_service.send_raw_email(
        to_email=applicant.email,
        to_name=applicant.full_name or None,
        subject=request.subject,
        body=request.body,
    )

    if not ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is not configured. Configure SMTP or SendGrid in .env to send emails."
        )

    return {
        "success": True,
        "data": {
            "sent_to": applicant.email,
            "subject": request.subject,
        },
        "message": "Email sent successfully",
    }


# =============================================================================
# AI INTERVIEW COACH — Gemini-powered mock interview for students
# =============================================================================
import json as _json


class InterviewQuestionsRequest(BaseModel):
    role: str = Field(..., min_length=2, max_length=160, description="Target role / job title")
    skills: List[str] = Field(default_factory=list, description="Candidate skills (optional)")
    level: str = Field(default="junior", max_length=40, description="intern | junior | mid")
    locale: str = Field(default="uz", description="uz | ru")
    count: int = Field(default=5, ge=3, le=8)


class InterviewEvaluateRequest(BaseModel):
    role: str = Field(..., min_length=2, max_length=160)
    question: str = Field(..., min_length=3, max_length=600)
    answer: str = Field(..., min_length=1, max_length=4000)
    locale: str = Field(default="uz", description="uz | ru")


def _parse_ai_json(text: str) -> Any:
    """Best-effort JSON extraction from an AI text response."""
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
    try:
        return _json.loads(raw)
    except Exception:
        start = raw.find("{")
        arr = raw.find("[")
        if arr != -1 and (start == -1 or arr < start):
            start = arr
        end = max(raw.rfind("}"), raw.rfind("]"))
        if start != -1 and end != -1 and end > start:
            return _json.loads(raw[start : end + 1])
        raise


async def _ai_generate(system: str, prompt: str, operation: str) -> str:
    service = get_ai_service()
    if hasattr(service, "generate"):
        return await service.generate(f"{system}\n\n{prompt}", response_format="json")
    if hasattr(service, "generate_text"):
        return await service.generate_text(
            system_message=system, prompt=prompt, operation=operation,
            temperature=0.4, max_tokens=1200,
        )
    if hasattr(service, "_call_openai_api"):
        return await service._call_openai_api(  # type: ignore[attr-defined]
            system_message=system, prompt=prompt, operation=operation,
            response_format_json=True, temperature=0.4, max_tokens=1200,
        )
    raise Exception("No AI generation method available")


@router.post(
    "/interview/questions",
    response_model=Dict[str, Any],
    summary="Generate mock interview questions",
    description="Role- and resume-aware interview questions for a practice session.",
)
async def interview_questions(
    request: InterviewQuestionsRequest,
    _user=Depends(get_current_active_user),
    _rl: None = Depends(rate_limit(max_requests=12, window_seconds=60)),
):
    locale = (request.locale or "uz").strip().lower()
    if locale not in {"uz", "ru"}:
        locale = "uz"
    lang = "Russian (Cyrillic)" if locale == "ru" else "Uzbek (Latin script)"
    skills = ", ".join([s for s in request.skills if s][:12]) or "—"

    system = (
        "You are IshTop Interview Coach, an experienced technical recruiter who "
        "prepares junior candidates in Uzbekistan for real interviews."
    )
    prompt = (
        f"Generate exactly {request.count} interview questions for the role "
        f'"{request.role}" at {request.level} level. Candidate skills: {skills}.\n'
        f"Write every question in {lang}. Mix the types: behavioral, technical "
        "and situational, appropriate for a junior. Keep each question one "
        "sentence, realistic and specific.\n"
        'Return ONLY JSON: {"questions":[{"q":"...","type":"behavioral|technical|situational"}]}'
    )
    try:
        text = await _ai_generate(system, prompt, "interview_questions")
        data = _parse_ai_json(text)
        items = data.get("questions") if isinstance(data, dict) else data
        questions = []
        for it in (items or []):
            if isinstance(it, dict) and it.get("q"):
                questions.append({"q": str(it["q"]).strip(), "type": str(it.get("type", "general")).strip()})
            elif isinstance(it, str) and it.strip():
                questions.append({"q": it.strip(), "type": "general"})
        if not questions:
            raise Exception("empty questions")
        return {"success": True, "data": {"questions": questions[: request.count], "locale": locale}}
    except Exception as exc:
        logger.exception("interview_questions failed: %s", exc)
        raise HTTPException(status_code=503, detail="AI is busy, please try again.")


@router.post(
    "/interview/evaluate",
    response_model=Dict[str, Any],
    summary="Evaluate an interview answer",
    description="Scores a candidate answer with strengths, improvements and a model answer.",
)
async def interview_evaluate(
    request: InterviewEvaluateRequest,
    _user=Depends(get_current_active_user),
    _rl: None = Depends(rate_limit(max_requests=20, window_seconds=60)),
):
    locale = (request.locale or "uz").strip().lower()
    if locale not in {"uz", "ru"}:
        locale = "uz"
    lang = "Russian (Cyrillic)" if locale == "ru" else "Uzbek (Latin script)"

    system = (
        "You are IshTop Interview Coach. Evaluate the candidate's answer fairly "
        "and constructively, at a junior level. Be encouraging but honest."
    )
    prompt = (
        f'Role: "{request.role}".\nQuestion: "{request.question}".\n'
        f'Candidate answer: "{request.answer}".\n\n'
        f"Write all text fields in {lang}. Give a score 0-100, 1-3 concrete "
        "strengths, 1-3 concrete improvements, and a short model answer (3-5 "
        "sentences) the candidate could learn from.\n"
        'Return ONLY JSON: {"score":<int>,"strengths":["..."],'
        '"improvements":["..."],"model_answer":"..."}'
    )
    try:
        text = await _ai_generate(system, prompt, "interview_evaluate")
        data = _parse_ai_json(text)
        if not isinstance(data, dict):
            raise Exception("bad shape")
        try:
            score = max(0, min(100, int(round(float(data.get("score", 0))))))
        except Exception:
            score = 0
        def _lst(v):
            return [str(x).strip() for x in (v or []) if str(x).strip()][:3]
        return {
            "success": True,
            "data": {
                "score": score,
                "strengths": _lst(data.get("strengths")),
                "improvements": _lst(data.get("improvements")),
                "model_answer": str(data.get("model_answer", "")).strip(),
                "locale": locale,
            },
        }
    except Exception as exc:
        logger.exception("interview_evaluate failed: %s", exc)
        raise HTTPException(status_code=503, detail="AI is busy, please try again.")
