# DSABA LMS Test Suite

Comprehensive test suite for the DSABA LMS backend, covering all layers of the Clean Architecture implementation.

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures and configuration
├── domain/                  # Domain layer tests
│   ├── test_entities.py    # Entity tests
│   └── test_value_objects.py  # Value object tests
├── infrastructure/         # Infrastructure layer tests
│   ├── test_repositories.py   # Repository tests
│   └── test_security.py       # Security component tests
├── application/            # Application layer tests
│   └── test_auth_service.py    # Service tests
├── api/                    # API layer tests
│   ├── test_auth_endpoints.py
│   ├── test_user_endpoints.py
│   ├── test_exam_endpoints.py
│   └── test_marks_endpoints.py
├── integration/            # Integration tests
│   └── test_exam_workflow.py  # End-to-end workflow tests
└── utils/                  # Test utilities
    ├── auth_helpers.py
    └── factories.py
```

## Running Tests

### Run All Tests
```bash
cd backend
pytest
```

### Run Specific Test Categories
```bash
# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration

# API tests only
pytest -m api

# Repository tests only
pytest -m repository

# Service tests only
pytest -m service

# Domain tests only
pytest -m domain
```

### Run Specific Test Files
```bash
# Run domain tests
pytest tests/domain/

# Run API tests
pytest tests/api/

# Run integration tests
pytest tests/integration/
```

### Run with Coverage
```bash
# Generate coverage report
pytest --cov=src --cov-report=html

# View coverage report
open htmlcov/index.html
```

### Run Specific Tests
```bash
# Run a specific test class
pytest tests/domain/test_value_objects.py::TestEmail

# Run a specific test method
pytest tests/domain/test_value_objects.py::TestEmail::test_valid_email
```

## Test Markers

Tests are organized using pytest markers:

- `@pytest.mark.unit` - Fast, isolated unit tests
- `@pytest.mark.integration` - Tests requiring database
- `@pytest.mark.api` - API endpoint tests
- `@pytest.mark.slow` - Slow-running tests
- `@pytest.mark.auth` - Authentication/authorization tests
- `@pytest.mark.repository` - Repository layer tests
- `@pytest.mark.service` - Service layer tests
- `@pytest.mark.domain` - Domain layer tests

## Test Fixtures

### Database Fixtures
- `test_db_session` - Test database session (function-scoped)
- `test_engine` - Test database engine (session-scoped)
- `override_get_db` - Override FastAPI dependency

### User Fixtures
- `admin_user` - Admin user with admin role
- `teacher_user` - Teacher user with teacher role
- `student_user` - Student user with student role
- `hod_user` - HOD user with HOD role

### Authentication Fixtures
- `admin_token` - JWT token for admin user
- `teacher_token` - JWT token for teacher user
- `student_token` - JWT token for student user
- `hod_token` - JWT token for HOD user

### Data Fixtures
- `department` - Test department
- `batch` - Test batch
- `batch_year` - Test batch year
- `semester` - Test semester
- `class_obj` - Test class
- `subject` - Test subject
- `subject_assignment` - Test subject assignment
- `exam` - Test exam
- `question` - Test question
- `mark` - Test mark entry
- `course_outcome` - Test course outcome
- `program_outcome` - Test program outcome

### Client Fixtures
- `client` - FastAPI TestClient (synchronous)
- `async_client` - AsyncClient (asynchronous)

## Writing Tests

### Example: Domain Test
```python
@pytest.mark.unit
@pytest.mark.domain
def test_valid_email():
    """Test creating email with valid format"""
    email = Email("test@example.com")
    assert email.value == "test@example.com"
```

### Example: API Test
```python
@pytest.mark.api
@pytest.mark.integration
def test_login_success(client, admin_user):
    """Test successful login endpoint"""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "admin",
            "password": "admin123"
        }
    )
    
    assert response.status_code == 200
    assert "access_token" in response.json()
```

### Example: Integration Test
```python
@pytest.mark.integration
@pytest.mark.slow
def test_create_exam_and_enter_marks(client, teacher_token, subject_assignment):
    """Test complete workflow"""
    # Create exam
    exam_response = client.post(...)
    # Add questions
    question_response = client.post(...)
    # Enter marks
    mark_response = client.post(...)
    # Verify
    assert mark_response.status_code == 200
```

## Test Coverage Goals

- **Domain Layer**: 90%+ coverage
- **Infrastructure Layer**: 85%+ coverage
- **Application Layer**: 80%+ coverage
- **API Layer**: 75%+ coverage
- **Overall**: 70%+ coverage

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    cd backend
    pytest --cov=src --cov-report=xml
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Fixtures**: Use fixtures for common setup/teardown
3. **Naming**: Use descriptive test names that explain what is being tested
4. **Assertions**: Use specific assertions with clear error messages
5. **Markers**: Use appropriate markers to categorize tests
6. **Documentation**: Add docstrings to test methods explaining what they test

## Troubleshooting

### Database Issues
If tests fail with database errors:
1. Ensure test database is properly configured
2. Check that all migrations are applied
3. Verify fixtures are creating data correctly

### Import Errors
If tests fail with import errors:
1. Ensure `src` is in Python path
2. Check that all dependencies are installed
3. Verify relative imports are correct

### Async Issues
If async tests fail:
1. Ensure `pytest-asyncio` is installed
2. Use `async def` for async test functions
3. Use `await` for async operations

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Use appropriate fixtures
3. Add proper markers
4. Write clear docstrings
5. Aim for high coverage
6. Test both success and failure cases

