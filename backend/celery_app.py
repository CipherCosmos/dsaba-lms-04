import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('FORKED_BY_MULTIPROCESSING', '1')

app = Celery('exam_management')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('celeryconfig', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')