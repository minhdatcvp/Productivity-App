from datetime import date, datetime
from sqlalchemy import cast, select
from sqlalchemy import Date as SADate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.task import Goal, GoalStatus, Task, TaskStatus, Timeline
from app.services.streak_service import prev_period


async def rollover_daily_tasks(db: AsyncSession, user_id: str, to_date: date) -> int:
    """Move incomplete standalone tasks with due_date < to_date to to_date."""
    result = await db.execute(
        select(Task).where(
            Task.user_id == user_id,
            Task.goal_id.is_(None),
            Task.parent_id.is_(None),
            Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS]),
            cast(Task.due_date, SADate) < to_date,
        )
    )
    tasks = result.scalars().all()
    count = 0
    for task in tasks:
        task.due_date = datetime.combine(to_date, datetime.min.time())
        count += 1
    if count:
        await db.commit()
    return count


async def get_goal_rollover_preview(
    db: AsyncSession, user_id: str, timeline: Timeline, current_period_str: str
) -> list[dict]:
    """Return incomplete tasks from the previous period's active goals."""
    prev = prev_period(timeline, current_period_str)
    result = await db.execute(
        select(Goal)
        .where(
            Goal.user_id == user_id,
            Goal.timeline == timeline,
            Goal.period == prev,
            Goal.status == GoalStatus.ACTIVE,
        )
        .options(selectinload(Goal.tasks))
    )
    goals = result.scalars().all()

    incomplete = []
    for goal in goals:
        top_tasks = [
            t for t in goal.tasks
            if t.parent_id is None
            and t.status not in (TaskStatus.DONE, TaskStatus.CANCELLED)
        ]
        if top_tasks:
            incomplete.append({
                "goal_id": goal.id,
                "goal_title": goal.title,
                "tasks": [
                    {"id": t.id, "title": t.title, "priority": t.priority}
                    for t in top_tasks
                ],
            })
    return incomplete


async def apply_goal_rollover(
    db: AsyncSession,
    user_id: str,
    task_ids: list[str],
    to_goal_id: str | None,
    timeline: Timeline,
    to_period: str,
) -> Goal:
    """Copy selected tasks to to_goal_id (or create a new goal) in to_period."""
    import uuid

    if to_goal_id:
        result = await db.execute(
            select(Goal)
            .where(Goal.id == to_goal_id, Goal.user_id == user_id)
            .options(selectinload(Goal.tasks).selectinload(Task.subtasks))
        )
        goal = result.scalar_one_or_none()
        if not goal:
            raise ValueError("Goal not found")
    else:
        goal = Goal(
            user_id=user_id,
            title="Chuyển tiếp",
            timeline=timeline,
            period=to_period,
        )
        db.add(goal)
        await db.flush()

    if task_ids:
        src_result = await db.execute(
            select(Task).where(Task.id.in_(task_ids), Task.user_id == user_id)
        )
        src_tasks = src_result.scalars().all()
        for src in src_tasks:
            new_task = Task(
                user_id=user_id,
                goal_id=goal.id,
                title=src.title,
                priority=src.priority,
                completion_type=src.completion_type,
                notes=src.notes,
            )
            db.add(new_task)

    await db.commit()
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal.id)
        .options(selectinload(Goal.tasks).selectinload(Task.subtasks))
    )
    return result.scalar_one()
