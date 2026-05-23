from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.task import Goal, GoalStatus, Streak, Timeline
from app.models.user import User
from app.schemas.tasks import StreakResponse
from app.services.streak_service import _prev_period, current_period

router = APIRouter(prefix="/streaks", tags=["streaks"])


@router.get("", response_model=list[StreakResponse])
async def get_streaks(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Streak).where(Streak.user_id == user.id))
    streaks = result.scalars().all()

    # Reset current streak if last_success is older than prev period (streak broken)
    dirty = False
    for streak in streaks:
        if not streak.last_success or streak.current == 0:
            continue
        cur = current_period(streak.type)
        prev = _prev_period(streak.type, cur)
        if streak.last_success not in (cur, prev):
            streak.current = 0
            dirty = True

    if dirty:
        await db.commit()

    return streaks


@router.get("/history", response_model=list[str])
async def get_streak_history(
    timeline: Timeline = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal.period)
        .distinct()
        .where(
            Goal.user_id == user.id,
            Goal.timeline == timeline,
            Goal.status == GoalStatus.COMPLETED,
        )
        .order_by(Goal.period.desc())
    )
    return result.scalars().all()
