from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Streak, Timeline


def current_period(timeline: Timeline) -> str:
    today = date.today()
    if timeline == Timeline.DAILY:
        return today.isoformat()
    if timeline == Timeline.WEEKLY:
        y, w, _ = today.isocalendar()
        return f"{y}-W{w:02d}"
    return f"{today.year}-{today.month:02d}"


def prev_period(timeline: Timeline, period: str) -> str:
    return _prev_period(timeline, period)


def _prev_period(timeline: Timeline, period: str) -> str:
    if timeline == Timeline.DAILY:
        d = date.fromisoformat(period)
        return (d - timedelta(days=1)).isoformat()
    if timeline == Timeline.WEEKLY:
        year, week = period.split("-W")
        d = date.fromisocalendar(int(year), int(week), 1)
        p = d - timedelta(weeks=1)
        y, w, _ = p.isocalendar()
        return f"{y}-W{w:02d}"
    # MONTHLY
    year, month = int(period[:4]), int(period[5:])
    if month == 1:
        return f"{year - 1}-12"
    return f"{year}-{month - 1:02d}"


async def reduce_streak(
    db: AsyncSession, user_id: str, timeline: Timeline, period: str
) -> None:
    result = await db.execute(
        select(Streak).where(Streak.user_id == user_id, Streak.type == timeline)
    )
    streak = result.scalar_one_or_none()
    if streak and streak.last_success == period:
        prev = _prev_period(timeline, period)
        streak.current = max(0, streak.current - 1)
        streak.last_success = prev if streak.current > 0 else None
    await db.commit()


async def update_streak(
    db: AsyncSession, user_id: str, timeline: Timeline, period: str
) -> Streak:
    result = await db.execute(
        select(Streak).where(Streak.user_id == user_id, Streak.type == timeline)
    )
    streak = result.scalar_one_or_none()
    prev = _prev_period(timeline, period)

    if streak is None:
        streak = Streak(user_id=user_id, type=timeline, current=1, longest=1, last_success=period)
        db.add(streak)
    elif streak.last_success == period:
        pass  # already counted
    elif streak.last_success == prev:
        streak.current += 1
        streak.longest = max(streak.longest, streak.current)
        streak.last_success = period
    else:
        streak.current = 1
        streak.last_success = period

    await db.commit()
    await db.refresh(streak)
    return streak
