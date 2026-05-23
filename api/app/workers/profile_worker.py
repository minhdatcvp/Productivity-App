import asyncio

from celery_app import celery


@celery.task(name="workers.update_profile")
def update_profile(user_id: str, event_type: str, event_data: dict):
    asyncio.run(_do_update_profile(user_id, event_type, event_data))


async def _do_update_profile(user_id: str, event_type: str, event_data: dict):
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.user import UserProfile

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            profile = UserProfile(user_id=user_id)
            session.add(profile)

        profile.interactions = (profile.interactions or 0) + 1
        await session.commit()
