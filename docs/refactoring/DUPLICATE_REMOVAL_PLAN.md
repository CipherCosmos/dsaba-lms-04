# Duplicate Code Removal Plan

## Analysis Results

### Old Monolithic Files (To Remove)
1. `backend/main.py` - Replaced by `backend/src/main.py`
2. `backend/models.py` - Replaced by `backend/src/infrastructure/database/models.py`
3. `backend/schemas.py` - Replaced by `backend/src/application/dto/`
4. `backend/crud.py` - Replaced by repositories + services
5. `backend/auth.py` - Replaced by `backend/src/infrastructure/security/`
6. `backend/database.py` - Replaced by `backend/src/infrastructure/database/session.py`
7. `backend/analytics.py` - Replaced by `backend/src/application/services/analytics_service.py`
8. `backend/attainment_analytics.py` - Replaced by analytics_service
9. `backend/advanced_analytics_backend.py` - Replaced by analytics_service
10. `backend/strategic_dashboard_backend.py` - Replaced by analytics_service
11. `backend/report_generator.py` - Replaced by `backend/src/application/services/reports_service.py`
12. `backend/reports.py` - Replaced by reports_service
13. `backend/validation.py` - Replaced by value objects
14. `backend/error_handlers.py` - Replaced by `backend/src/api/middleware/error_handler.py`
15. `backend/celery_app.py` - Replaced by `backend/src/infrastructure/queue/celery_app.py`
16. `backend/celeryconfig.py` - Replaced by celery_app.py
17. `backend/tasks.py` - Replaced by `backend/src/infrastructure/queue/tasks/`

### Files That Reference Old Code
1. `backend/run.py` - Uses old `main:app`
2. `backend/Dockerfile` - Uses old `main:app`
3. `backend/test_integration.py` - Imports from old `main.py`

### Utility Scripts (Keep but may need updates)
- `backend/add_admin.py` - Utility script
- `backend/check_db.py` - Utility script
- `backend/check_users.py` - Utility script
- `backend/seed_data.py` - Utility script
- `backend/init_db.py` - Utility script

### Migration Scripts (Can remove - use Alembic)
- `backend/create_copo_tables.py` - Use Alembic instead
- `backend/update_copo_tables.py` - Use Alembic instead

### Cleanup Scripts (Can remove)
- `backend/cleanup_script.py` - No longer needed
- `backend/test_db_setup.py` - Use pytest fixtures
- `backend/database_optimization.py` - Optimizations built-in

---

## Removal Strategy

1. Create backup directory
2. Move old files to backup
3. Update references in run.py, Dockerfile, test_integration.py
4. Verify new implementation works
5. Delete backup after verification

