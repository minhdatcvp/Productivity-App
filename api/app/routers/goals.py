from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.task import Goal, GoalStatus, Task, Timeline
from app.models.user import User
from app.schemas.tasks import GoalCreate, GoalResponse, GoalUpdate, RolloverPreviewGoal, RolloverRequest
from app.services.rollover_service import apply_goal_rollover, get_goal_rollover_preview

router = APIRouter(prefix="/goals", tags=["goals"])


def _compute_progress(tasks: list[Task]) -> tuple[int, int, int]:
    top = [t for t in tasks if t.parent_id is None]
    if not top:
        return 0, 0, 0
    done = sum(1 for t in top if t.completed_value is not None)
    progress = int(done / len(top) * 100)
    return progress, len(top), done


def _to_response(goal: Goal) -> GoalResponse:
    progress, task_count, done = _compute_progress(list(goal.tasks))
    top_tasks = [t for t in goal.tasks if t.parent_id is None]
    return GoalResponse(
        **{c.key: getattr(goal, c.key) for c in goal.__table__.columns},
        progress=progress,
        task_count=task_count,
        completed_task_count=done,
        tasks=top_tasks,
    )


@router.get("", response_model=list[GoalResponse])
async def list_goals(
    timeline: Timeline = Query(...),
    period: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal)
        .where(Goal.user_id == user.id, Goal.timeline == timeline, Goal.period == period)
        .options(selectinload(Goal.tasks).selectinload(Task.subtasks))
        .order_by(Goal.created_at)
    )
    goals = result.scalars().all()
    return [_to_response(g) for g in goals]


@router.post("", response_model=GoalResponse, status_code=201)
async def create_goal(
    body: GoalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    goal = Goal(user_id=user.id, **body.model_dump())
    db.add(goal)
    await db.commit()
    # Re-fetch with eager loading to avoid lazy-load in async context
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal.id)
        .options(selectinload(Goal.tasks).selectinload(Task.subtasks))
    )
    goal = result.scalar_one()
    return _to_response(goal)


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id, Goal.user_id == user.id)
        .options(selectinload(Goal.tasks).selectinload(Task.subtasks))
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")
    return _to_response(goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    body: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id, Goal.user_id == user.id)
        .options(selectinload(Goal.tasks).selectinload(Task.subtasks))
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(goal, field, value)
    await db.commit()
    # Re-fetch with eager loading after commit
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id)
        .options(selectinload(Goal.tasks).selectinload(Task.subtasks))
    )
    goal = result.scalar_one()
    return _to_response(goal)


@router.get("/rollover-preview", response_model=list[RolloverPreviewGoal])
async def rollover_preview(
    timeline: Timeline = Query(...),
    period: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await get_goal_rollover_preview(db, user.id, timeline, period)
    return [RolloverPreviewGoal(**item) for item in data]


@router.post("/rollover", response_model=GoalResponse, status_code=201)
async def rollover_goal_tasks(
    body: RolloverRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        goal = await apply_goal_rollover(
            db, user.id, body.task_ids, body.to_goal_id, body.timeline, body.to_period
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    return _to_response(goal)


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")
    await db.delete(goal)
    await db.commit()
    return {"ok": True}
