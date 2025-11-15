"""
Subject Repository Tests
Tests for SubjectRepository implementation
"""

import pytest
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.domain.entities.subject import Subject
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


class TestSubjectRepository:
    """Tests for SubjectRepository"""
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_create_subject(self, test_db_session, department):
        """Test creating a subject"""
        repo = SubjectRepository(test_db_session)
        
        subject = Subject(
            id=None,
            code="CS101",
            name="Data Structures",
            department_id=department.id,
            credits=4.0,
            max_internal=40.0,
            max_external=60.0
        )
        
        created = await repo.create(subject)
        assert created.id is not None
        assert created.code == "CS101"
        assert created.name == "Data Structures"
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_id(self, test_db_session, subject):
        """Test getting subject by ID"""
        repo = SubjectRepository(test_db_session)
        
        found = await repo.get_by_id(subject.id)
        assert found is not None
        assert found.id == subject.id
        assert found.code == subject.code
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_id_not_found(self, test_db_session):
        """Test getting non-existent subject"""
        repo = SubjectRepository(test_db_session)
        
        found = await repo.get_by_id(99999)
        assert found is None
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_code(self, test_db_session, subject):
        """Test getting subject by code"""
        repo = SubjectRepository(test_db_session)
        
        found = await repo.get_by_code(subject.code)
        assert found is not None
        assert found.code == subject.code
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_department(self, test_db_session, department, subject):
        """Test getting subjects by department"""
        repo = SubjectRepository(test_db_session)
        
        subjects = await repo.get_by_department(department.id)
        assert len(subjects) > 0
        assert all(s.department_id == department.id for s in subjects)
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_code_exists(self, test_db_session, subject):
        """Test checking if code exists"""
        repo = SubjectRepository(test_db_session)
        
        assert await repo.code_exists(subject.code) is True
        assert await repo.code_exists("NONEXISTENT") is False
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_code_exists_exclude_id(self, test_db_session, subject):
        """Test code exists with exclude_id"""
        repo = SubjectRepository(test_db_session)
        
        # Should return False when excluding the subject's own ID
        assert await repo.code_exists(subject.code, exclude_id=subject.id) is False
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_update_subject(self, test_db_session, subject):
        """Test updating a subject"""
        repo = SubjectRepository(test_db_session)
        
        subject.name = "Updated Name"
        subject.credits = 5.0
        
        updated = await repo.update(subject)
        assert updated.name == "Updated Name"
        assert updated.credits == 5.0
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_delete_subject(self, test_db_session, subject):
        """Test deleting a subject"""
        repo = SubjectRepository(test_db_session)
        
        deleted = await repo.delete(subject.id)
        assert deleted is True
        
        # Verify deleted
        found = await repo.get_by_id(subject.id)
        assert found is None
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_delete_not_found(self, test_db_session):
        """Test deleting non-existent subject"""
        repo = SubjectRepository(test_db_session)
        
        deleted = await repo.delete(99999)
        assert deleted is False
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_all(self, test_db_session, subject):
        """Test getting all subjects"""
        repo = SubjectRepository(test_db_session)
        
        subjects = await repo.get_all()
        assert len(subjects) > 0
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_all_with_filters(self, test_db_session, department, subject):
        """Test getting all subjects with filters"""
        repo = SubjectRepository(test_db_session)
        
        # Filter by department
        subjects = await repo.get_all(filters={"department_id": department.id})
        assert len(subjects) > 0
        assert all(s.department_id == department.id for s in subjects)
        
        # Filter by is_active
        subjects = await repo.get_all(filters={"is_active": True})
        assert len(subjects) > 0
        assert all(s.is_active is True for s in subjects)
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_count(self, test_db_session, subject):
        """Test counting subjects"""
        repo = SubjectRepository(test_db_session)
        
        count = await repo.count()
        assert count > 0
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_count_with_filters(self, test_db_session, department, subject):
        """Test counting subjects with filters"""
        repo = SubjectRepository(test_db_session)
        
        count = await repo.count(filters={"department_id": department.id})
        assert count > 0
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_exists(self, test_db_session, subject):
        """Test checking if subject exists"""
        repo = SubjectRepository(test_db_session)
        
        assert await repo.exists(subject.id) is True
        assert await repo.exists(99999) is False

