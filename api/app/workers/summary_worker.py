import asyncio

from celery_app import celery


@celery.task(name="workers.summarize_goal")
def summarize_goal(goal_id: str, user_id: str):
    asyncio.run(_do_summarize(goal_id, user_id))


async def _do_summarize(goal_id: str, user_id: str):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.core.database import AsyncSessionLocal
    from app.models.task import AISummary, Goal
    from app.models.user import User
    from app.services.ai_service import summarize_period_sync

    async with AsyncSessionLocal() as session:
        goal_result = await session.execute(
            select(Goal).where(Goal.id == goal_id).options(selectinload(Goal.tasks))
        )
        goal = goal_result.scalar_one_or_none()
        if not goal:
            return

        user_result = await session.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        user_name = user.name if user else "User"

        goals_data = [
            {
                "title": goal.title,
                "description": goal.description,
                "timeline": goal.timeline.value,
                "period": goal.period,
                "tasks": [
                    {"title": t.title, "completed": t.completed_value is not None}
                    for t in goal.tasks
                    if t.parent_id is None
                ],
            }
        ]

        summary_content = summarize_period_sync(user_name, goals_data)

        existing_result = await session.execute(
            select(AISummary).where(AISummary.goal_id == goal_id)
        )
        ai_summary = existing_result.scalar_one_or_none()
        if ai_summary:
            ai_summary.content = summary_content
        else:
            session.add(AISummary(goal_id=goal_id, content=summary_content))
        await session.commit()
