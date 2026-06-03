"""
=============================================================================
TEST ROUTER - Endpoints for Testing AI Resume Generation
=============================================================================

PURPOSE:
    Provides test endpoints to verify the AI service is working correctly.
    These endpoints are designed for development and testing, not production.

WHY SEPARATE TEST ROUTES?
    - Isolates test code from production code
    - Easy to disable in production (just don't include the router)
    - Clear documentation of expected input/output formats
    - Includes extensive logging for debugging

ENDPOINTS:
    POST /api/test/ai-resume     - Test resume generation with sample data
    GET  /api/test/ai-health     - Check AI service health
    GET  /api/test/ai-usage      - Get token usage statistics

AUTHOR: IshTop Team
VERSION: 1.0.0
"""

# =============================================================================
# IMPORTS
# =============================================================================

# FastAPI imports
from fastapi import APIRouter, HTTPException, status, Body

# Pydantic for request/response models
from pydantic import BaseModel, Field, EmailStr

# Type hints
from typing import List, Optional, Dict, Any

# Standard library
import logging
from datetime import datetime

# Local imports
from app.services.ai_service import (
    AIService,
    AIServiceError,
    AIGenerationError,
    AIRateLimitError,
    AIValidationError,
    AIConfigurationError,
)


# =============================================================================
# LOGGING SETUP
# =============================================================================
# WHY configure logging here too?
# - Each module can have its own log level if needed
# - Helps trace which module generated log entries

logger = logging.getLogger(__name__)

# Set up console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter(
    '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
console_handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(console_handler)
    logger.setLevel(logging.DEBUG)


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================
# WHY Pydantic models?
# - Automatic validation (no manual checking needed)
# - Auto-generated documentation in /docs
# - Type hints for IDE support
# - Clear contract between client and server

class ExperienceInput(BaseModel):
    """
    Single work experience entry.
    
    WHY nested model?
    - Validates each experience entry individually
    - Clear structure for API documentation
    - Reusable in other endpoints
    """
    company: str = Field(
        ...,  # Required field
        min_length=1,
        max_length=100,
        description="Company name",
        examples=["Tech Corp", "Startup Inc"]
    )
    position: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Job title/position",
        examples=["Backend Developer", "Software Engineer"]
    )
    duration: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Employment duration",
        examples=["2022-2024", "Jan 2020 - Present"]
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Brief description of responsibilities and achievements",
        examples=["Built REST APIs using Python and FastAPI"]
    )


class EducationInput(BaseModel):
    """
    Single education entry.
    """
    institution: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="School/University name",
        examples=["MIT", "Stanford University", "TATU"]
    )
    degree: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Degree or field of study",
        examples=["Computer Science", "Bachelor's in Engineering"]
    )
    year: str = Field(
        ...,
        min_length=4,
        max_length=20,
        description="Graduation year",
        examples=["2022", "2020-2024"]
    )


class ResumeGenerationRequest(BaseModel):
    """
    Complete request model for resume generation.
    
    This model defines the EXACT structure expected by the API.
    All validation happens automatically before the endpoint code runs.
    
    VALIDATION RULES:
    - name: 2-100 characters
    - email: Must be valid email format
    - phone: 5-20 characters
    - skills: At least 1 skill, max 50
    - experience: At least 1 entry, max 20
    - education: At least 1 entry, max 10
    """
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Full name of the candidate",
        examples=["John Doe", "Jane Smith"]
    )
    email: EmailStr = Field(
        ...,
        description="Email address (must be valid format)",
        examples=["john@example.com"]
    )
    phone: str = Field(
        ...,
        min_length=5,
        max_length=20,
        description="Phone number",
        examples=["+998901234567", "+1-555-123-4567"]
    )
    skills: List[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="List of skills (technical and soft skills)",
        examples=[["Python", "FastAPI", "PostgreSQL", "Docker"]]
    )
    experience: List[ExperienceInput] = Field(
        ...,
        min_length=1,
        max_length=20,
        description="List of work experience entries"
    )
    education: List[EducationInput] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="List of education entries"
    )
    
    # Optional fields
    target_job: Optional[str] = Field(
        None,
        max_length=100,
        description="Target job title for tailoring the resume",
        examples=["Senior Backend Developer"]
    )
    
    class Config:
        """Pydantic configuration."""
        # Provide example for documentation
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+998901234567",
                "skills": ["Python", "FastAPI", "PostgreSQL"],
                "experience": [
                    {
                        "company": "Tech Corp",
                        "position": "Backend Developer",
                        "duration": "2022-2024",
                        "description": "Built REST APIs"
                    }
                ],
                "education": [
                    {
                        "institution": "TATU",
                        "degree": "Computer Science",
                        "year": "2022"
                    }
                ]
            }
        }


class ResumeGenerationResponse(BaseModel):
    """
    Response model for successful resume generation.
    
    WHY a response model?
    - Documents what the client will receive
    - Automatic serialization
    - Type safety for response data
    """
    success: bool = Field(
        ...,
        description="Whether the operation was successful"
    )
    message: str = Field(
        ...,
        description="Human-readable message about the result"
    )
    data: Dict[str, Any] = Field(
        ...,
        description="Generated resume data"
    )
    metadata: Dict[str, Any] = Field(
        ...,
        description="Generation metadata (timing, tokens, etc.)"
    )


class ErrorResponse(BaseModel):
    """
    Standard error response format.
    
    WHY standardize errors?
    - Consistent error handling on frontend
    - Easy to parse programmatically
    - Includes debugging information
    """
    success: bool = False
    error: str = Field(
        ...,
        description="Error type/code"
    )
    message: str = Field(
        ...,
        description="Human-readable error message"
    )
    details: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional error details (for debugging)"
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="When the error occurred"
    )


# =============================================================================
# ROUTER SETUP
# =============================================================================

router = APIRouter(
    prefix="/test",  # All routes will be /api/test/...
    tags=["Testing"],  # Group in documentation
    responses={
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
        503: {"model": ErrorResponse, "description": "Service Unavailable"},
    }
)


# =============================================================================
# GLOBAL AI SERVICE INSTANCE
# =============================================================================
# WHY global?
# - Reuses the same client/tokenizer across requests
# - Maintains usage tracking across all calls
# - Avoids recreation overhead

ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """
    Get or create the AI service instance.
    
    WHY this pattern?
    - Lazy initialization (only create when first needed)
    - Singleton pattern (one instance per process)
    - Easy error handling for configuration issues
    
    Returns:
        AIService instance
        
    Raises:
        HTTPException: If service cannot be initialized
    """
    global ai_service
    
    if ai_service is None:
        logger.info("Creating new AI service instance...")
        try:
            ai_service = AIService()
        except AIConfigurationError as e:
            logger.error(f"Failed to initialize AI service: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "error": "AI_SERVICE_UNAVAILABLE",
                    "message": str(e),
                    "help": "Check your OPENAI_API_KEY in .env file"
                }
            )
    
    return ai_service


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post(
    "/ai-resume",
    response_model=ResumeGenerationResponse,
    status_code=status.HTTP_200_OK,
    summary="Test AI Resume Generation",
    description="""
    Test endpoint for AI-powered resume generation.
    
    **What it does:**
    - Takes candidate information (name, skills, experience, education)
    - Sends to GPT-4 for enhancement and formatting
    - Returns a professionally formatted resume
    
    **Use this to:**
    - Verify your OpenAI API key is working
    - Test the resume generation prompt
    - See the expected input/output format
    
    **Sample request body:**
    ```json
    {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+998901234567",
        "skills": ["Python", "FastAPI", "PostgreSQL"],
        "experience": [{
            "company": "Tech Corp",
            "position": "Backend Developer",
            "duration": "2022-2024",
            "description": "Built REST APIs"
        }],
        "education": [{
            "institution": "TATU",
            "degree": "Computer Science",
            "year": "2022"
        }]
    }
    ```
    """,
    responses={
        200: {
            "description": "Resume generated successfully",
            "model": ResumeGenerationResponse
        },
        422: {
            "description": "Validation error - check your input data"
        },
        429: {
            "description": "Rate limit exceeded - wait and try again"
        },
        500: {
            "description": "Generation failed - check server logs"
        },
        503: {
            "description": "AI service unavailable - check API key"
        }
    }
)
async def test_ai_resume(
    request: ResumeGenerationRequest = Body(
        ...,
        description="Resume generation request with candidate data"
    )
) -> ResumeGenerationResponse:
    """
    Test AI resume generation with provided data.
    
    PROCESS:
    1. Log incoming request
    2. Validate request data (automatic via Pydantic)
    3. Get AI service instance
    4. Generate resume
    5. Return formatted response
    
    LOGGING:
    Every step is logged to console for debugging.
    """
    request_id = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    
    logger.info("=" * 70)
    logger.info(f"📨 NEW REQUEST | ID: {request_id}")
    logger.info("=" * 70)
    
    # Log request details (but not sensitive data)
    logger.info(f"   Name: {request.name}")
    logger.info(f"   Email: {request.email[:3]}***@***")  # Partial for privacy
    logger.info(f"   Skills: {len(request.skills)} skills")
    logger.info(f"   Experience: {len(request.experience)} entries")
    logger.info(f"   Education: {len(request.education)} entries")
    
    # Get AI service
    logger.info("Step 1: Getting AI service...")
    service = get_ai_service()
    logger.info("   ✅ AI service ready")
    
    # Convert Pydantic models to dictionaries for the AI service
    # WHY? The AI service expects plain dictionaries, not Pydantic models
    logger.info("Step 2: Preparing input data...")
    
    input_data = {
        "name": request.name,
        "email": request.email,
        "phone": request.phone,
        "skills": request.skills,
        "experience": [
            {
                "company": exp.company,
                "position": exp.position,
                "duration": exp.duration,
                "description": exp.description
            }
            for exp in request.experience
        ],
        "education": [
            {
                "institution": edu.institution,
                "degree": edu.degree,
                "year": edu.year
            }
            for edu in request.education
        ],
        "target_job": request.target_job
    }
    
    logger.info("   ✅ Input data prepared")
    
    # Generate resume
    logger.info("Step 3: Calling AI service...")
    
    try:
        result = await service.generate_resume_from_data(input_data)
        
        # Extract metadata from result
        metadata = result.pop("_metadata", {})
        
        logger.info("=" * 70)
        logger.info(f"✅ REQUEST COMPLETE | ID: {request_id}")
        logger.info("=" * 70)
        
        return ResumeGenerationResponse(
            success=True,
            message="Resume generated successfully",
            data=result,
            metadata=metadata
        )
        
    except AIValidationError as e:
        # Input data validation failed
        logger.error(f"❌ Validation error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "VALIDATION_ERROR",
                "message": e.message,
                "details": e.details
            }
        )
        
    except AIRateLimitError as e:
        # OpenAI rate limit hit
        logger.error(f"❌ Rate limit error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "RATE_LIMIT_EXCEEDED",
                "message": e.message,
                "help": "Wait a moment and try again, or upgrade your OpenAI plan"
            }
        )
        
    except AIGenerationError as e:
        # Generation failed for some reason
        logger.error(f"❌ Generation error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "GENERATION_FAILED",
                "message": e.message,
                "details": e.details
            }
        )
        
    except AIConfigurationError as e:
        # Configuration issue (shouldn't happen after startup)
        logger.error(f"❌ Configuration error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "AI_SERVICE_UNAVAILABLE",
                "message": e.message,
                "help": "Check your OpenAI API key configuration"
            }
        )
        
    except Exception as e:
        # Unexpected error - log full details
        logger.exception(f"❌ Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again.",
                "request_id": request_id
            }
        )


@router.get(
    "/ai-health",
    summary="Check AI Service Health",
    description="Verify that the AI service is properly configured and can reach OpenAI.",
    responses={
        200: {"description": "AI service is healthy"},
        503: {"description": "AI service is unavailable"}
    }
)
async def check_ai_health() -> Dict[str, Any]:
    """
    Check if the AI service is operational.
    
    This endpoint:
    1. Gets the AI service instance
    2. Makes a minimal API call to OpenAI
    3. Returns the result
    
    Use this to verify your configuration before testing resume generation.
    """
    logger.info("🏥 AI Health Check requested")
    
    try:
        service = get_ai_service()
        health = await service.health_check()
        
        if health["status"] == "healthy":
            logger.info("✅ AI service is healthy")
        else:
            logger.warning(f"⚠️ AI service unhealthy: {health.get('error')}")
        
        return health
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get(
    "/ai-usage",
    summary="Get AI Usage Statistics",
    description="Get token usage and cost estimates for the current session."
)
async def get_ai_usage() -> Dict[str, Any]:
    """
    Get API usage statistics.
    
    Returns:
    - Total tokens used
    - Number of requests
    - Recent request history
    - Estimated costs
    """
    logger.info("📊 Usage statistics requested")
    
    try:
        service = get_ai_service()
        usage = service.get_usage_summary()
        
        logger.info(f"   Total requests: {usage['total_requests']}")
        logger.info(f"   Total tokens: {usage['total_tokens']}")
        
        return {
            "success": True,
            "data": usage,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get usage: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
























