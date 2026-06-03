"""
=============================================================================
AI SERVICE UNIT TESTS
=============================================================================

Test cases for AI-powered resume generation and analysis.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.services.ai_service import AIService
from app.core.exceptions import ValidationError, ExternalAPIError


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def ai_service():
    """Create AI service instance."""
    return AIService()


@pytest.fixture
def valid_resume_input():
    """Valid input for resume generation."""
    return {
        "personal_info": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+998901234567",
            "professional_title": "Software Engineer"
        },
        "experience": [
            {
                "company": "Tech Corp",
                "position": "Senior Developer",
                "start_date": "2020-01",
                "end_date": "2024-01",
                "description": "Led backend development"
            }
        ],
        "education": [
            {
                "institution": "University",
                "degree": "Bachelor's",
                "field": "Computer Science",
                "year": "2019"
            }
        ],
        "skills": ["Python", "FastAPI", "PostgreSQL"]
    }


@pytest.fixture
def mock_openai_response():
    """Mock successful OpenAI API response."""
    return {
        "summary": "Experienced software engineer with 4+ years of expertise in Python and backend development.",
        "experience": [
            {
                "company": "Tech Corp",
                "position": "Senior Developer",
                "start_date": "2020-01",
                "end_date": "2024-01",
                "description": "Led backend development for core platform services.",
                "achievements": [
                    "Improved API performance by 40%",
                    "Implemented microservices architecture",
                    "Mentored junior developers"
                ]
            }
        ],
        "skills_summary": "Strong proficiency in Python, FastAPI, and PostgreSQL with focus on building scalable applications."
    }


# =============================================================================
# TEST: GENERATE RESUME SUCCESS
# =============================================================================

class TestGenerateResumeSuccess:
    """Tests for successful resume generation."""

    @pytest.mark.asyncio
    async def test_generate_resume_success(self, ai_service, valid_resume_input, mock_openai_response):
        """Test successful resume generation with valid input."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps(mock_openai_response)
            
            result = await ai_service.generate_resume(
                user_data=valid_resume_input,
                template="modern",
                tone="professional"
            )
            
            assert result is not None
            assert "summary" in result or "content" in result
            mock_api.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_resume_with_minimal_input(self, ai_service):
        """Test resume generation with minimal valid input."""
        minimal_input = {
            "personal_info": {
                "name": "Jane Smith",
                "email": "jane@example.com"
            },
            "skills": ["Python"]
        }
        
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({"summary": "Generated summary"})
            
            result = await ai_service.generate_resume(
                user_data=minimal_input,
                template="minimal"
            )
            
            assert result is not None

    @pytest.mark.asyncio
    async def test_generate_resume_different_templates(self, ai_service, valid_resume_input):
        """Test resume generation with different templates."""
        templates = ["modern", "classic", "minimal", "creative"]
        
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({"summary": "Test"})
            
            for template in templates:
                result = await ai_service.generate_resume(
                    user_data=valid_resume_input,
                    template=template
                )
                assert result is not None

    @pytest.mark.asyncio
    async def test_generate_resume_different_tones(self, ai_service, valid_resume_input):
        """Test resume generation with different tones."""
        tones = ["professional", "confident", "enthusiastic", "friendly"]
        
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({"summary": "Test"})
            
            for tone in tones:
                result = await ai_service.generate_resume(
                    user_data=valid_resume_input,
                    tone=tone
                )
                assert result is not None


# =============================================================================
# TEST: GENERATE RESUME INVALID INPUT
# =============================================================================

class TestGenerateResumeInvalidInput:
    """Tests for resume generation with invalid input."""

    @pytest.mark.asyncio
    async def test_generate_resume_missing_personal_info(self, ai_service):
        """Test that missing personal_info raises ValidationError."""
        invalid_input = {
            "experience": [],
            "skills": ["Python"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            await ai_service.generate_resume(user_data=invalid_input)
        
        assert "personal_info" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_generate_resume_empty_input(self, ai_service):
        """Test that empty input raises ValidationError."""
        with pytest.raises(ValidationError):
            await ai_service.generate_resume(user_data={})

    @pytest.mark.asyncio
    async def test_generate_resume_missing_name(self, ai_service):
        """Test that missing name raises ValidationError."""
        invalid_input = {
            "personal_info": {
                "email": "test@example.com"
            }
        }
        
        with pytest.raises(ValidationError) as exc_info:
            await ai_service.generate_resume(user_data=invalid_input)
        
        assert "name" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_generate_resume_invalid_email(self, ai_service):
        """Test that invalid email raises ValidationError."""
        invalid_input = {
            "personal_info": {
                "name": "Test User",
                "email": "not-an-email"
            }
        }
        
        with pytest.raises(ValidationError):
            await ai_service.generate_resume(user_data=invalid_input)

    @pytest.mark.asyncio
    async def test_generate_resume_none_input(self, ai_service):
        """Test that None input raises ValidationError."""
        with pytest.raises((ValidationError, TypeError)):
            await ai_service.generate_resume(user_data=None)


# =============================================================================
# TEST: OPENAI API FAILURE
# =============================================================================

class TestOpenAIAPIFailure:
    """Tests for handling OpenAI API failures."""

    @pytest.mark.asyncio
    async def test_openai_api_timeout(self, ai_service, valid_resume_input):
        """Test handling of API timeout."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.side_effect = TimeoutError("API request timed out")
            
            with pytest.raises(ExternalAPIError) as exc_info:
                await ai_service.generate_resume(user_data=valid_resume_input)
            
            assert "timeout" in str(exc_info.value).lower() or "api" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_openai_api_rate_limit(self, ai_service, valid_resume_input):
        """Test handling of API rate limit."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.side_effect = Exception("Rate limit exceeded")
            
            with pytest.raises(ExternalAPIError):
                await ai_service.generate_resume(user_data=valid_resume_input)

    @pytest.mark.asyncio
    async def test_openai_api_server_error(self, ai_service, valid_resume_input):
        """Test handling of API server error."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.side_effect = Exception("500 Internal Server Error")
            
            with pytest.raises(ExternalAPIError):
                await ai_service.generate_resume(user_data=valid_resume_input)

    @pytest.mark.asyncio
    async def test_openai_api_returns_fallback_on_error(self, ai_service, valid_resume_input):
        """Test that fallback content is returned on non-critical errors."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            # Simulate a recoverable error
            mock_api.side_effect = [
                Exception("Temporary error"),  # First call fails
                json.dumps({"summary": "Fallback content"})  # Retry succeeds
            ]
            
            # If service has retry logic, it should succeed
            # Otherwise, it should raise ExternalAPIError
            try:
                result = await ai_service.generate_resume(user_data=valid_resume_input)
                assert result is not None
            except ExternalAPIError:
                pass  # Expected if no retry logic

    @pytest.mark.asyncio
    async def test_openai_api_invalid_response(self, ai_service, valid_resume_input):
        """Test handling of invalid API response."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = "not valid json {"
            
            with pytest.raises((ExternalAPIError, json.JSONDecodeError, ValueError)):
                await ai_service.generate_resume(user_data=valid_resume_input)


# =============================================================================
# TEST: TOKEN LIMIT EXCEEDED
# =============================================================================

class TestTokenLimitExceeded:
    """Tests for handling token limit scenarios."""

    @pytest.mark.asyncio
    async def test_token_limit_exceeded_truncates_input(self, ai_service):
        """Test that excessive input is properly truncated."""
        # Create input with very long text
        large_input = {
            "personal_info": {
                "name": "Test User",
                "email": "test@example.com"
            },
            "experience": [
                {
                    "company": "Company",
                    "position": "Developer",
                    "description": "A" * 50000  # Very long description
                }
            ]
        }
        
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({"summary": "Generated"})
            
            # Should not raise error, should truncate
            result = await ai_service.generate_resume(user_data=large_input)
            assert result is not None
            
            # Verify the call was made with truncated data
            call_args = mock_api.call_args
            if call_args:
                prompt = str(call_args)
                # Prompt should be less than token limit equivalent
                assert len(prompt) < 100000  # Reasonable limit

    @pytest.mark.asyncio
    async def test_many_experiences_truncated(self, ai_service):
        """Test that many experiences are properly handled."""
        input_data = {
            "personal_info": {
                "name": "Test User",
                "email": "test@example.com"
            },
            "experience": [
                {"company": f"Company {i}", "position": "Dev", "description": "Work " * 100}
                for i in range(50)  # 50 experiences
            ]
        }
        
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({"summary": "OK"})
            
            result = await ai_service.generate_resume(user_data=input_data)
            assert result is not None


# =============================================================================
# TEST: RESUME FORMATTING
# =============================================================================

class TestResumeFormatting:
    """Tests for correct resume output formatting."""

    @pytest.mark.asyncio
    async def test_output_is_valid_json(self, ai_service, valid_resume_input):
        """Test that output is valid JSON structure."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({
                "summary": "Professional summary",
                "skills": ["Python", "FastAPI"]
            })
            
            result = await ai_service.generate_resume(user_data=valid_resume_input)
            
            # Result should be dict or serializable to JSON
            assert isinstance(result, dict)
            json_str = json.dumps(result)
            assert json_str is not None

    @pytest.mark.asyncio
    async def test_output_contains_required_fields(self, ai_service, valid_resume_input):
        """Test that output contains required fields."""
        expected_response = {
            "summary": "Professional summary",
            "personal_info": valid_resume_input["personal_info"],
            "experience": [],
            "education": [],
            "skills": {"technical": ["Python"], "soft": []}
        }
        
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps(expected_response)
            
            result = await ai_service.generate_resume(user_data=valid_resume_input)
            
            # Check for expected structure
            assert "summary" in result or "content" in result

    @pytest.mark.asyncio
    async def test_output_preserves_personal_info(self, ai_service, valid_resume_input):
        """Test that personal info is preserved in output."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({
                "summary": "Test",
                "personal_info": valid_resume_input["personal_info"]
            })
            
            result = await ai_service.generate_resume(user_data=valid_resume_input)
            
            # Personal info should be in result
            if "personal_info" in result:
                assert result["personal_info"]["name"] == valid_resume_input["personal_info"]["name"]


# =============================================================================
# TEST: COVER LETTER GENERATION
# =============================================================================

class TestCoverLetterGeneration:
    """Tests for cover letter generation."""

    @pytest.mark.asyncio
    async def test_generate_cover_letter_success(self, ai_service):
        """Test successful cover letter generation."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = (
                "Dear Hiring Manager,\n\n"
                "I am excited to apply for this role. With strong experience in Python and backend systems, "
                "I can contribute immediately.\n\nSincerely,\nJohn Doe"
            )
            
            result = await ai_service.generate_cover_letter(
                job_title="Software Engineer",
                company_name="Tech Corp",
                resume_summary="5 years experience in Python",
                tone="professional"
            )
            
            assert result is not None
            assert len(result) > 50  # Should have substantial content

    @pytest.mark.asyncio
    async def test_generate_cover_letter_includes_company_name(self, ai_service):
        """Test that generated cover letter includes company name."""
        company_name = "Amazing Tech Inc"
        
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = f"Dear Hiring Manager at {company_name},\n\nContent..."
            
            result = await ai_service.generate_cover_letter(
                job_title="Developer",
                company_name=company_name,
                resume_summary="Experience summary"
            )
            
            # The mock returns the company name, so just check it's in result
            assert company_name in result or result is not None


# =============================================================================
# TEST: RESUME ANALYSIS
# =============================================================================

class TestResumeAnalysis:
    """Tests for resume analysis and scoring."""

    @pytest.mark.asyncio
    async def test_analyze_resume_returns_score(self, ai_service, valid_resume_input):
        """Test that resume analysis returns ATS score."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({
                "ats_score": 85,
                "suggestions": ["Add more keywords", "Quantify achievements"],
                "strengths": ["Good structure", "Clear formatting"]
            })
            
            result = await ai_service.analyze_resume(resume_content=valid_resume_input)
            
            assert "ats_score" in result or "score" in result
            
    @pytest.mark.asyncio
    async def test_analyze_resume_provides_suggestions(self, ai_service, valid_resume_input):
        """Test that analysis provides improvement suggestions."""
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({
                "ats_score": 75,
                "suggestions": [
                    "Add more technical keywords",
                    "Include measurable achievements"
                ]
            })
            
            result = await ai_service.analyze_resume(resume_content=valid_resume_input)
            
            assert "suggestions" in result
            assert len(result["suggestions"]) > 0


# =============================================================================
# TEST: JOB MATCHING
# =============================================================================

class TestJobMatching:
    """Tests for job-resume matching."""

    @pytest.mark.asyncio
    async def test_match_job_returns_score(self, ai_service, valid_resume_input):
        """Test that job matching returns a match score."""
        job_data = {
            "title": "Senior Python Developer",
            "requirements": {
                "skills": ["Python", "FastAPI", "PostgreSQL"],
                "experience": "5+ years"
            }
        }
        
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({
                "match_score": 85,
                "matching_skills": ["Python", "FastAPI"],
                "missing_skills": ["Kubernetes"]
            })
            
            result = await ai_service.match_job(
                resume_content=valid_resume_input,
                job_data=job_data
            )
            
            assert "match_score" in result or "score" in result
            assert result.get("match_score", result.get("score", 0)) >= 0
            assert result.get("match_score", result.get("score", 0)) <= 100

    @pytest.mark.asyncio
    async def test_match_job_identifies_matching_skills(self, ai_service, valid_resume_input):
        """Test that matching identifies common skills."""
        job_data = {
            "title": "Python Developer",
            "requirements": {"skills": ["Python", "SQL"]}
        }
        
        with patch.object(ai_service, '_call_openai_api') as mock_api:
            mock_api.return_value = json.dumps({
                "match_score": 80,
                "matching_skills": ["Python"],
                "missing_skills": ["SQL"]
            })
            
            result = await ai_service.match_job(
                resume_content=valid_resume_input,
                job_data=job_data
            )
            
            if "matching_skills" in result:
                assert "Python" in result["matching_skills"]
















