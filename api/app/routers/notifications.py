from calendar import monthrange
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import cast, select
from sqlalchemy import Date as SADate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.task import Goal, GoalStatus, Task, TaskStatus, Timeline
from app.models.user import User
from app.schemas.tasks import (
    ActiveGoalNotification,
    NotificationTask,
    TaskNotificationsResponse,
)
from app.services.rollover_service import rollover_daily_tasks
from app.services.streak_service import current_period, prev_period

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _days_remaining(timeline: Timeline, period: str) -> int:
    today = date.today()
    if timeline == Timeline.DAILY:
        d = date.fromisoformat(period)
        return (d - today).days
    if timeline == Timeline.WEEKLY:
        year, week = period.split("-W")
        end = date.fromisocalendar(int(year), int(week), 7)
        return (end - today).days
    year, month = int(period[:4]), int(period[5:])
    last_day = monthrange(year, month)[1]
    end = date(year, month, last_day)
    return (end - today).days


def _compute_progress(tasks: list[Task]) -> int:
    top = [t for t in tasks if t.parent_id is None]
    if not top:
        return 0
    done = sum(1 for t in top if t.completed_value is not None)
    return int(done / len(top) * 100)


@router.get("", response_model=TaskNotificationsResponse)
async def get_task_notifications(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = date.today()
    soon = today + timedelta(days=3)

    # Auto-rollover daily tasks so overdue count is accurate
    await rollover_daily_tasks(db, user.id, today)

    # Overdue tasks (due_date set, < today, incomplete)
    overdue_result = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.parent_id.is_(None),
            Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS]),
            Task.due_date.is_not(None),
            cast(Task.due_date, SADate) < today,
        ).order_by(Task.due_date)
    )
    overdue = overdue_result.scalars().all()

    # Due today
    due_today_result = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.parent_id.is_(None),
            Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS]),
            Task.due_date.is_not(None),
            cast(Task.due_date, SADate) == today,
        )
    )
    due_today = due_today_result.scalars().all()

    # Due soon (next 3 days, excluding today)
    due_soon_result = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.parent_id.is_(None),
            Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS]),
            Task.due_date.is_not(None),
            cast(Task.due_date, SADate) > today,
            cast(Task.due_date, SADate) <= soon,
        ).order_by(Task.due_date)
    )
    due_soon = due_soon_result.scalars().all()

    # Active goals for WEEKLY and MONTHLY current periods
    active_goals: list[ActiveGoalNotification] = []
    for tl in (Timeline.WEEKLY, Timeline.MONTHLY):
        cp = current_period(tl)
        goals_result = await db.execute(
            select(Goal)
            .where(
                Goal.user_id == user.id,
                Goal.timeline == tl,
                Goal.period == cp,
                Goal.status == GoalStatus.ACTIVE,
            )
            .options(selectinload(Goal.tasks))
        )
        for goal in goals_result.scalars().all():
            progress = _compute_progress(list(goal.tasks))
            days = _days_remaining(tl, cp)
            active_goals.append(
                ActiveGoalNotification(
                    goal_id=goal.id,
                    goal_title=goal.title,
                    timeline=tl,
                    period=cp,
                    progress=progress,
                    days_remaining=days,
                )
            )

    def _to_notif(t: Task) -> NotificationTask:
        return NotificationTask(
            id=t.id,
            title=t.title,
            goal_id=t.goal_id,
            due_date=t.due_date,
            priority=t.priority,
            status=t.status,
        )

    overdue_list = [_to_notif(t) for t in overdue]
    today_list = [_to_notif(t) for t in due_today]
    soon_list = [_to_notif(t) for t in due_soon]

    return TaskNotificationsResponse(
        overdue=overdue_list,
        due_today=today_list,
        due_soon=soon_list,
        active_goals=active_goals,
        total=len(overdue_list) + len(today_list),
    )
