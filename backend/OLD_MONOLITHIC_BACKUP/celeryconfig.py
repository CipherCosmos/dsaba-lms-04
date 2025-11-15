# Celery Configuration
import os

broker_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
result_backend = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Celery Beat schedule for periodic tasks (e.g., backups)
beat_schedule = {
    'daily-backup': {
        'task': 'tasks.backup_database',  # To be implemented
        'schedule': 86400.0,  # Every 24 hours
    },
}

# Task settings
task_serializer = 'json'
result_serializer = 'json'
accept_content = ['json']
timezone = 'UTC'
enable_utc = True

# Worker settings
worker_prefetch_multiplier = 1
worker_concurrency = 4