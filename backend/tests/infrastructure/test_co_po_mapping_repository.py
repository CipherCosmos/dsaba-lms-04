"""
CO-PO Mapping Repository Tests
Tests for COPOMappingRepository implementation
"""
import pytest
from src.infrastructure.database.repositories.co_po_mapping_repository_impl import COPOMappingRepository
from src.domain.entities.co_po_mapping import COPOMapping
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


@pytest.mark.integration
@pytest.mark.repository
class TestCOPOMappingRepository:
    """Tests for COPOMappingRepository"""
    
    async def test_create_mapping(self, test_db_session, course_outcome, program_outcome):
        """Test creating a CO-PO mapping"""
        repo = COPOMappingRepository(test_db_session)
        
        mapping = COPOMapping(
            id=None,
            co_id=course_outcome.id,
            po_id=program_outcome.id,
            strength=2
        )
        
        created = await repo.create(mapping)
        assert created.id is not None
        assert created.co_id == course_outcome.id
        assert created.po_id == program_outcome.id
        assert created.strength == 2
    
    async def test_get_by_id(self, test_db_session, co_po_mapping):
        """Test getting mapping by ID"""
        repo = COPOMappingRepository(test_db_session)
        
        found = await repo.get_by_id(co_po_mapping.id)
        assert found is not None
        assert found.id == co_po_mapping.id
        assert found.co_id == co_po_mapping.co_id
    
    async def test_get_by_co(self, test_db_session, course_outcome, co_po_mapping):
        """Test getting mappings by CO"""
        repo = COPOMappingRepository(test_db_session)
        
        mappings = await repo.get_by_co(course_outcome.id)
        assert len(mappings) > 0
        assert all(m.co_id == course_outcome.id for m in mappings)
    
    async def test_get_by_po(self, test_db_session, program_outcome, co_po_mapping):
        """Test getting mappings by PO"""
        repo = COPOMappingRepository(test_db_session)
        
        mappings = await repo.get_by_po(program_outcome.id)
        assert len(mappings) > 0
        assert all(m.po_id == program_outcome.id for m in mappings)
    
    async def test_get_by_co_and_po(self, test_db_session, course_outcome, program_outcome, co_po_mapping):
        """Test getting mapping by CO and PO"""
        repo = COPOMappingRepository(test_db_session)
        
        found = await repo.get_mapping(course_outcome.id, program_outcome.id)
        assert found is not None
        assert found.co_id == course_outcome.id
        assert found.po_id == program_outcome.id
    
    async def test_update_mapping(self, test_db_session, co_po_mapping):
        """Test updating a mapping"""
        repo = COPOMappingRepository(test_db_session)
        
        # Get the entity first
        mapping_entity = await repo.get_by_id(co_po_mapping.id)
        # Update strength directly on the entity
        mapping_entity.strength = 3
        
        updated = await repo.update(mapping_entity)
        assert updated.strength == 3
    
    async def test_delete_mapping(self, test_db_session, co_po_mapping):
        """Test deleting a mapping"""
        repo = COPOMappingRepository(test_db_session)
        
        mapping_id = co_po_mapping.id
        await repo.delete(mapping_id)
        
        found = await repo.get_by_id(mapping_id)
        assert found is None

