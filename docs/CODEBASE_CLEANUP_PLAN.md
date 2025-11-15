# Codebase Cleanup Plan

## Files to Remove

### 1. Database Files (should not be committed)
- `backend/exam_management.db`
- `backend/test.db`
- `backend/test_exam_management.db`

### 2. Test Artifacts (should be in .gitignore)
- `backend/htmlcov/` (coverage HTML reports)
- `backend/coverage.xml` (coverage XML report)

### 3. Backup Files
- `src/pages/HOD/HODAnalytics.tsx.bak`

### 4. Old Backup Directory
- `backend/OLD_MONOLITHIC_BACKUP/` (already backed up, can be removed)

### 5. Documentation Consolidation
Move all root-level documentation to `docs/` and consolidate duplicates:
- Phase completion summaries → `docs/phases/`
- Testing reports → `docs/testing/`
- Verification reports → `docs/verification/`
- Keep only essential README files in root

## Files to Organize

### Documentation Structure
```
docs/
  ├── architecture/
  │   ├── ARCHITECTURE_REDESIGN.md
  │   ├── FRONTEND_ARCHITECTURE.md
  │   └── README_NEW_ARCHITECTURE.md
  ├── phases/
  │   └── (all phase completion summaries)
  ├── testing/
  │   ├── TESTING_SETUP_COMPLETE.md
  │   └── (all testing reports)
  ├── verification/
  │   └── (all verification reports)
  ├── refactoring/
  │   ├── REFACTORING_IMPLEMENTATION_PLAN.md
  │   └── (refactoring progress docs)
  └── README.md (main documentation index)
```

## .gitignore Updates

Add to `.gitignore`:
- `*.db` (database files)
- `htmlcov/` (coverage reports)
- `coverage.xml`
- `*.bak` (backup files)
- `__pycache__/` (already should be there)
- `.pytest_cache/`
- `.coverage`

