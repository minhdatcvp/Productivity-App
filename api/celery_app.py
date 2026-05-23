from celery import Celery

from app.core.config import settings

celery = Celery(
    "productivity",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.summary_worker", "app.workers.test_gen_worker", "app.workers.profile_worker"],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)
