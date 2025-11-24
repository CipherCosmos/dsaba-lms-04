# Legacy Model Deprecation Guide

## Overview

This document tracks the deprecation of `ClassModel` and `BatchYearModel` in favor of `BatchInstanceModel` + `SectionModel` architecture.

## Deprecated Components

### Backend Models

| Component | Status | Location | Replacement |
|-----------|--------|----------|-------------|
| `ClassModel` | Deprecated | `models.py:444-464` | `BatchInstanceModel` + `SectionModel` |
| `BatchYearModel` | Deprecated | `models.py:195+` | `BatchInstanceModel` |
| `BatchYearRepository` | Deprecated | `academic_structure_repository_impl.py:108+` | `BatchInstanceRepository` |
| `class_id` fields | Deprecated | Multiple models | `batch_instance_id` + `section_id` |

### API Endpoints

| Endpoint | Status | Replacement |
|----------|--------|-------------|
| `GET /analytics/class/{class_id}` | Deprecated | Use semester or batch instance analytics |
| `GET /reports/class/{class_id}` | Deprecated | Use semester-based reports |

### Frontend Components

| Component | Status | Notes |
|-----------|--------|-------|
| `ClassManagement.tsx` | ✅ Deleted | Replaced by `BatchInstanceManagement` |
| `classSlice.ts` | Deprecated | Compatibility layer, use `useBatchInstances` hook |

## Deprecation Markers

### Python Code

```python
import warnings

class ClassModel(Base):
    def __init__(self, **kwargs):
        warnings.warn(
            "ClassModel is deprecated. Use BatchInstanceModel instead.",
            DeprecationWarning,
            stacklevel=2
        )
        super().__init__(**kwargs)
```

### FastAPI Endpoints

```python
@router.get("/class/{class_id}", deprecated=True)
async def get_class_analytics(...):
    """⚠️ DEPRECATED: Use batch instance analytics"""
```

### TypeScript Code

```typescript
/**
 * @deprecated Use useBatchInstances hook instead
 */
export const fetchClasses = createAsyncThunk(...)
```

## Migration Checklist

### For Developers

- [ ] Never create new `ClassModel` or `BatchYearModel` records
- [ ] Use `BatchInstanceModel` for all new features
- [ ] Replace `class_id` with `batch_instance_id` + `section_id` in new queries
- [ ] Avoid calling deprecated API endpoints
- [ ] Use `useBatchInstances` hook instead of `classSlice` in React components

### For DevOps

- [ ] Monitor deprecation warnings in application logs
- [ ] Track usage of deprecated endpoints via API metrics
- [ ] Plan data migration from legacy tables to BatchInstance
- [ ] Schedule sunset dates for deprecated endpoints (recommend 6 months notice)

## Data Migration Status

| Task | Status | Notes |
|------|--------|-------|
| Migrate existing `batch_years` to `batch_instances` | ✅ Complete | Via migration `0006` |
| Migrate `classes.section` to `sections` table | ✅ Complete | Via migration `0006` |
| Update `students.batch_instance_id` | ✅ Complete | Via migration `0006` |
| Update `semesters.batch_instance_id` | ✅ Complete | Via migration `0006` |
| Backfill null `batch_instance_id` in production | ⏳ Pending | Requires production data audit |

## Removal Timeline

**Phase 1 (Current)**: Deprecation Warnings
- ✅ Add warnings to all legacy code
- ✅ Mark API endpoints as deprecated
- ✅ Update documentation

**Phase 2 (Q1 2025)**: Monitoring
- Monitor warning logs for usage patterns
- Identify remaining consumers of deprecated APIs
- Communicate sunset dates to API clients

**Phase 3 (Q2 2025)**: Data Migration
- Audit production database for remaining `class_id` references
- Backfill `batch_instance_id` for all records
- Verify no null `batch_instance_id` in active records

**Phase 4 (Q3 2025)**: Removal
- Remove deprecated API endpoints
- Drop `classes` and `batch_years` tables via Alembic migration
- Remove `class_id` columns from `students`, `subject_assignments`
- Delete `BatchYearRepository` and `classSlice.ts`

## Testing Deprecated Code

Test files (`conftest.py`, `test_*.py`) may continue using legacy models for:
- Testing backward compatibility
- Verifying migration logic
- Ensuring old data can still be queried

This is acceptable and does not require deprecation warnings in test code.

## Questions?

Contact the architecture team or refer to:
- `SYSTEM_STATUS.md` for current migration status
- `0006_redesign_academic_structure_batches_sections.py` for migration details
- `BatchInstanceManagement.tsx` for frontend reference implementation