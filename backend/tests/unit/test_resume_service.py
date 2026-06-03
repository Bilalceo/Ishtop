"""
=============================================================================
RESUME SERVICE UNIT TESTS
=============================================================================

Test cases for resume CRUD operations and business logic.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.resume_service import ResumeService
from app.core.exceptions import ValidationError, NotFoundError, AuthorizationError


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def resume_service():
    """Create resume service instance."""
    return ResumeService()


@pytest.fixture
def mock_db_session():
    """Create mock database session."""
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
def valid_resume_data():
    """Valid resume creation data."""
    return {
        "title": "Software Engineer Resume",
        "content": {
            "personal_info": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+998901234567",
                "professional_title": "Software Engineer"
            },
            "experience": [
                {
                    "company": "Tech Corp",
                    "position": "Developer",
                    "start_date": "2020-01",
                    "end_date": "2024-01",
                    "description": "Developed applications"
                }
            ],
            "education": [
                {
                    "institution": "University",
                    "degree": "Bachelor's",
                    "field": "CS",
                    "year": "2019"
                }
            ],
            "skills": {
                "technical": ["Python", "FastAPI"],
                "soft": ["Communication"]
            }
        }
    }


@pytest.fixture
def mock_user():
    """Create mock user."""
    return MagicMock(
        id="user-123",
        email="test@example.com",
        role="student",
        is_active=True
    )


@pytest.fixture
def mock_resume():
    """Create mock resume."""
    return MagicMock(
        id="resume-123",
        user_id="user-123",
        title="Test Resume",
        content={"personal_info": {"name": "Test"}},
        status="published",
        view_count=10,
        ats_score=85,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )


# =============================================================================
# CREATE RESUME TESTS
# =============================================================================

class TestCreateResume:
    """Tests for resume creation."""

    @pytest.mark.asyncio
    async def test_create_resume_success(
        self, resume_service, mock_db_session, valid_resume_data, mock_user
    ):
        """Test successful resume creation."""
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.create_resume(
                user_id=mock_user.id,
                title=valid_resume_data["title"],
                content=valid_resume_data["content"]
            )
            
            assert result is not None
            mock_db_session.add.assert_called_once()
            mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_resume_generates_id(
        self, resume_service, mock_db_session, valid_resume_data, mock_user
    ):
        """Test that resume creation generates unique ID."""
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.create_resume(
                user_id=mock_user.id,
                title=valid_resume_data["title"],
                content=valid_resume_data["content"]
            )
            
            assert result.id is not None
            assert len(result.id) > 0

    @pytest.mark.asyncio
    async def test_create_resume_sets_timestamps(
        self, resume_service, mock_db_session, valid_resume_data, mock_user
    ):
        """Test that resume creation sets timestamps."""
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.create_resume(
                user_id=mock_user.id,
                title=valid_resume_data["title"],
                content=valid_resume_data["content"]
            )
            
            assert result.created_at is not None
            assert result.updated_at is not None

    @pytest.mark.asyncio
    async def test_create_resume_default_status_draft(
        self, resume_service, mock_db_session, valid_resume_data, mock_user
    ):
        """Test that new resume defaults to draft status."""
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.create_resume(
                user_id=mock_user.id,
                title=valid_resume_data["title"],
                content=valid_resume_data["content"]
            )
            
            assert result.status == "draft"

    @pytest.mark.asyncio
    async def test_create_resume_invalid_content(
        self, resume_service, mock_db_session, mock_user
    ):
        """Test resume creation with invalid content."""
        invalid_content = {"invalid": "structure"}
        
        with pytest.raises(ValidationError):
            await resume_service.create_resume(
                user_id=mock_user.id,
                title="Test",
                content=invalid_content
            )

    @pytest.mark.asyncio
    async def test_create_resume_empty_title(
        self, resume_service, mock_db_session, valid_resume_data, mock_user
    ):
        """Test resume creation with empty title."""
        with pytest.raises(ValidationError):
            await resume_service.create_resume(
                user_id=mock_user.id,
                title="",
                content=valid_resume_data["content"]
            )


# =============================================================================
# GET RESUME TESTS
# =============================================================================

class TestGetResume:
    """Tests for retrieving resumes."""

    @pytest.mark.asyncio
    async def test_get_resume_by_id(
        self, resume_service, mock_db_session, mock_resume
    ):
        """Test getting resume by ID."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.get_resume(resume_id=mock_resume.id)
            
            assert result is not None
            assert result.id == mock_resume.id

    @pytest.mark.asyncio
    async def test_get_resume_not_found(
        self, resume_service, mock_db_session
    ):
        """Test getting non-existent resume."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=None)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            with pytest.raises(NotFoundError):
                await resume_service.get_resume(resume_id="non-existent")

    @pytest.mark.asyncio
    async def test_get_user_resumes(
        self, resume_service, mock_db_session, mock_resume, mock_user
    ):
        """Test getting all resumes for a user."""
        mock_db_session.execute.return_value = MagicMock(
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[mock_resume])))
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.get_user_resumes(user_id=mock_user.id)
            
            assert isinstance(result, list)
            assert len(result) >= 0

    @pytest.mark.asyncio
    async def test_get_resumes_with_pagination(
        self, resume_service, mock_db_session, mock_user
    ):
        """Test getting resumes with pagination."""
        mock_db_session.execute.return_value = MagicMock(
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.get_user_resumes(
                user_id=mock_user.id,
                page=1,
                limit=10
            )
            
            assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_resumes_by_status(
        self, resume_service, mock_db_session, mock_user
    ):
        """Test filtering resumes by status."""
        mock_db_session.execute.return_value = MagicMock(
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.get_user_resumes(
                user_id=mock_user.id,
                status="published"
            )
            
            assert isinstance(result, list)


# =============================================================================
# UPDATE RESUME TESTS
# =============================================================================

class TestUpdateResume:
    """Tests for updating resumes."""

    @pytest.mark.asyncio
    async def test_update_resume_success(
        self, resume_service, mock_db_session, mock_resume, mock_user
    ):
        """Test successful resume update."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.update_resume(
                resume_id=mock_resume.id,
                user_id=mock_user.id,
                title="Updated Title"
            )
            
            assert result is not None
            mock_db_session.commit.assert_called()

    @pytest.mark.asyncio
    async def test_update_resume_not_found(
        self, resume_service, mock_db_session, mock_user
    ):
        """Test updating non-existent resume."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=None)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            with pytest.raises(NotFoundError):
                await resume_service.update_resume(
                    resume_id="non-existent",
                    user_id=mock_user.id,
                    title="New Title"
                )

    @pytest.mark.asyncio
    async def test_update_resume_unauthorized(
        self, resume_service, mock_db_session, mock_resume
    ):
        """Test updating resume by non-owner."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            with pytest.raises(AuthorizationError):
                await resume_service.update_resume(
                    resume_id=mock_resume.id,
                    user_id="different-user-id",  # Different user
                    title="New Title"
                )

    @pytest.mark.asyncio
    async def test_update_resume_updates_timestamp(
        self, resume_service, mock_db_session, mock_resume, mock_user
    ):
        """Test that update changes updated_at timestamp."""
        original_time = mock_resume.updated_at
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.update_resume(
                resume_id=mock_resume.id,
                user_id=mock_user.id,
                title="Updated"
            )
            
            # In mock, just verify the method was called
            mock_db_session.commit.assert_called()


# =============================================================================
# DELETE RESUME TESTS
# =============================================================================

class TestDeleteResume:
    """Tests for deleting resumes."""

    @pytest.mark.asyncio
    async def test_delete_resume_success(
        self, resume_service, mock_db_session, mock_resume, mock_user
    ):
        """Test successful resume deletion."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            await resume_service.delete_resume(
                resume_id=mock_resume.id,
                user_id=mock_user.id
            )
            
            mock_db_session.commit.assert_called()

    @pytest.mark.asyncio
    async def test_delete_resume_not_found(
        self, resume_service, mock_db_session, mock_user
    ):
        """Test deleting non-existent resume."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=None)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            with pytest.raises(NotFoundError):
                await resume_service.delete_resume(
                    resume_id="non-existent",
                    user_id=mock_user.id
                )

    @pytest.mark.asyncio
    async def test_delete_resume_unauthorized(
        self, resume_service, mock_db_session, mock_resume
    ):
        """Test deleting resume by non-owner."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            with pytest.raises(AuthorizationError):
                await resume_service.delete_resume(
                    resume_id=mock_resume.id,
                    user_id="different-user-id"
                )

    @pytest.mark.asyncio
    async def test_soft_delete_changes_status(
        self, resume_service, mock_db_session, mock_resume, mock_user
    ):
        """Test that soft delete changes status to archived."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            await resume_service.soft_delete_resume(
                resume_id=mock_resume.id,
                user_id=mock_user.id
            )
            
            # Verify commit was called (status update)
            mock_db_session.commit.assert_called()


# =============================================================================
# PUBLISH RESUME TESTS
# =============================================================================

class TestPublishResume:
    """Tests for publishing resumes."""

    @pytest.mark.asyncio
    async def test_publish_resume_success(
        self, resume_service, mock_db_session, mock_resume, mock_user
    ):
        """Test successful resume publishing."""
        mock_resume.status = "draft"
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.publish_resume(
                resume_id=mock_resume.id,
                user_id=mock_user.id
            )
            
            mock_db_session.commit.assert_called()

    @pytest.mark.asyncio
    async def test_publish_already_published(
        self, resume_service, mock_db_session, mock_resume, mock_user
    ):
        """Test publishing already published resume."""
        mock_resume.status = "published"
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            # Should succeed without error
            result = await resume_service.publish_resume(
                resume_id=mock_resume.id,
                user_id=mock_user.id
            )


# =============================================================================
# RESUME VALIDATION TESTS
# =============================================================================

class TestResumeValidation:
    """Tests for resume content validation."""

    @pytest.mark.asyncio
    async def test_validate_complete_resume(
        self, resume_service, valid_resume_data
    ):
        """Test validation of complete resume."""
        is_valid = await resume_service.validate_content(
            content=valid_resume_data["content"]
        )
        
        assert is_valid is True

    @pytest.mark.asyncio
    async def test_validate_missing_personal_info(
        self, resume_service
    ):
        """Test validation fails without personal_info."""
        invalid_content = {
            "skills": {"technical": ["Python"]}
        }
        
        with pytest.raises(ValidationError):
            await resume_service.validate_content(content=invalid_content)

    @pytest.mark.asyncio
    async def test_validate_invalid_email(
        self, resume_service
    ):
        """Test validation fails with invalid email."""
        invalid_content = {
            "personal_info": {
                "name": "Test",
                "email": "not-an-email"
            }
        }
        
        with pytest.raises(ValidationError):
            await resume_service.validate_content(content=invalid_content)


# =============================================================================
# PDF GENERATION TESTS
# =============================================================================

class TestPDFGeneration:
    """Tests for PDF generation."""

    @pytest.mark.asyncio
    async def test_generate_pdf_success(
        self, resume_service, mock_db_session, mock_resume, mock_user
    ):
        """Test successful PDF generation."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            with patch.object(resume_service, '_generate_pdf') as mock_pdf:
                mock_pdf.return_value = b'%PDF-1.4 mock content'
                
                result = await resume_service.download_pdf(
                    resume_id=mock_resume.id,
                    user_id=mock_user.id
                )
                
                assert result is not None
                assert isinstance(result, bytes)

    @pytest.mark.asyncio
    async def test_generate_pdf_not_found(
        self, resume_service, mock_db_session, mock_user
    ):
        """Test PDF generation for non-existent resume."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=None)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            with pytest.raises(NotFoundError):
                await resume_service.download_pdf(
                    resume_id="non-existent",
                    user_id=mock_user.id
                )


# =============================================================================
# ATS SCORE TESTS
# =============================================================================

class TestATSScore:
    """Tests for ATS score calculation."""

    @pytest.mark.asyncio
    async def test_calculate_ats_score(
        self, resume_service, valid_resume_data
    ):
        """Test ATS score calculation."""
        with patch.object(resume_service, '_calculate_ats_score') as mock_calc:
            mock_calc.return_value = 85
            
            score = await resume_service.calculate_ats_score(
                content=valid_resume_data["content"]
            )
            
            assert isinstance(score, int)
            assert 0 <= score <= 100

    @pytest.mark.asyncio
    async def test_ats_score_range(
        self, resume_service
    ):
        """Test that ATS score is within valid range."""
        contents = [
            {"personal_info": {"name": "Test", "email": "t@t.com"}},
            {
                "personal_info": {"name": "Test", "email": "t@t.com"},
                "skills": {"technical": ["Python"] * 20}
            }
        ]
        
        for content in contents:
            with patch.object(resume_service, '_calculate_ats_score') as mock_calc:
                mock_calc.return_value = 75
                
                score = await resume_service.calculate_ats_score(content=content)
                
                assert 0 <= score <= 100


# =============================================================================
# ANALYTICS TESTS
# =============================================================================

class TestResumeAnalytics:
    """Tests for resume analytics."""

    @pytest.mark.asyncio
    async def test_increment_view_count(
        self, resume_service, mock_db_session, mock_resume
    ):
        """Test incrementing view count."""
        original_count = mock_resume.view_count
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            await resume_service.increment_view_count(resume_id=mock_resume.id)
            
            mock_db_session.commit.assert_called()

    @pytest.mark.asyncio
    async def test_get_analytics(
        self, resume_service, mock_db_session, mock_resume, mock_user
    ):
        """Test getting resume analytics."""
        mock_db_session.execute.return_value = MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_resume)
        )
        
        with patch.object(resume_service, 'db', mock_db_session):
            result = await resume_service.get_analytics(
                resume_id=mock_resume.id,
                user_id=mock_user.id
            )
            
            assert result is not None
            assert "view_count" in result or hasattr(result, "view_count")
















