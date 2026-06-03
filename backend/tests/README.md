# Backend Tests

## Running Tests

### Run all tests
```bash
pytest
```

### Run with coverage
```bash
pytest --cov=app --cov-report=html
```

### Run specific test file
```bash
pytest tests/test_auth.py
```

### Run tests by marker
```bash
# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration

# Skip slow tests
pytest -m "not slow"

# Auth tests only
pytest -m auth

# Payment tests only
pytest -m payment
```

### Run with verbose output
```bash
pytest -v
```

### Run and stop on first failure
```bash
pytest -x
```

## Test Structure

```
tests/
├── conftest.py           # Test fixtures and configuration
├── test_auth.py          # Authentication tests
├── test_users.py         # Users & RBAC tests
├── test_payments.py      # Payment system tests
└── README.md             # This file
```

## Test Coverage

Target: 70% minimum

Run coverage report:
```bash
pytest --cov=app --cov-report=term-missing
```

View HTML coverage report:
```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

## Test Markers

- `@pytest.mark.unit` - Unit tests (fast, no external dependencies)
- `@pytest.mark.integration` - Integration tests (database, services)
- `@pytest.mark.slow` - Slow tests (rate limiting, etc.)
- `@pytest.mark.auth` - Authentication tests
- `@pytest.mark.api` - API endpoint tests
- `@pytest.mark.payment` - Payment tests

## Fixtures

### Database Fixtures
- `test_db` - In-memory SQLite database
- `client` - FastAPI test client

### User Fixtures
- `test_student` - Test student user
- `test_company` - Test company user
- `test_admin` - Test admin user

### Token Fixtures
- `student_token` - Access token for student
- `company_token` - Access token for company
- `admin_token` - Access token for admin

### Headers Fixtures
- `student_headers` - Auth headers for student
- `company_headers` - Auth headers for company
- `admin_headers` - Auth headers for admin

### Data Fixtures
- `test_resume` - Test resume
- `test_job` - Test job posting
- `test_application` - Test job application
- `sample_resume_data` - Sample resume data dict
- `sample_job_data` - Sample job data dict

## Writing Tests

### Example unit test
```python
@pytest.mark.unit
def test_something(test_db):
    # Your test here
    assert True
```

### Example integration test
```python
@pytest.mark.integration
def test_api_endpoint(client, student_headers):
    response = client.get("/api/v1/endpoint", headers=student_headers)
    assert response.status_code == 200
```

### Example RBAC test
```python
@pytest.mark.integration
def test_student_cannot_access_admin(client, student_headers):
    response = client.get("/api/v1/admin/dashboard", headers=student_headers)
    assert response.status_code == 403
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch

See `.github/workflows/tests.yml` for CI configuration.









