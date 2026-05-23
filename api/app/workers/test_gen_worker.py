from celery_app import celery


@celery.task(name="workers.generate_test")
def generate_test(user_lang_id: str):
    # TODO Phase 4: AI test generation
    pass
