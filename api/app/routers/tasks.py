from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast, select
from sqlalchemy import Date as SADate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.task import Goal, GoalStatus, Task, Timeline
from app.models.user import User
from app.schemas.tasks import TaskComplete, TaskCreate, TaskResponse, TaskUpdate
from app.services.rollover_service import rollover_daily_tasks
from app.services.streak_service import reduce_streak, update_streak

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_to_response(task: Task) -> TaskResponse:
    return TaskResponse(
        **{c.key: getattr(task, c.key) for c in task.__table__.columns},
        subtasks=list(task.subtasks),
    )


async def _fetch_task(db: AsyncSession, task_id: str) -> Task:
    result = await db.execute(
        select(Task).where(Task.id == task_id).options(selectinload(Task.subtasks))
    )
    return result.scalar_one()


@router.get("", response_model=list[TaskResponse])
async def list_daily_tasks(
    period: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    period_date = date.fromisoformat(period)

    # Auto-rollover incomplete tasks to today when user views today's list
    if period_date == date.today():
        await rollover_daily_tasks(db, user.id, period_date)

    result = await db.execute(
        select(Task)
        .where(
            Task.user_id == user.id,
            Task.goal_id.is_(None),
            Task.parent_id.is_(None),
            cast(Task.due_date, SADate) == period_date,
        )
        .options(selectinload(Task.subtasks))
        .order_by(Task.order, Task.created_at)
    )
    tasks = result.scalars().all()
    return [_task_to_response(t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    body: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.goal_id:
        goal = await db.get(Goal, body.goal_id)
        if not goal or goal.user_id != user.id:
            raise HTTPException(404, "Goal not found")
    task = Task(user_id=user.id, **body.model_dump())
    db.add(task)
    await db.commit()
    task = await _fetch_task(db, task.id)
    return _task_to_response(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    task = await _fetch_task(db, task_id)
    return _task_to_response(task)


@router.patch("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: str,
    body: TaskComplete,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    task.completed_value = body.completed_value
    await db.flush()

    if task.goal_id:
        goal_result = await db.execute(
            select(Goal)
            .where(Goal.id == task.goal_id)
            .options(selectinload(Goal.tasks))
        )
        goal = goal_result.scalar_one_or_none()
        if goal:
            top = [t for t in goal.tasks if t.parent_id is None]
            done = sum(1 for t in top if t.completed_value is not None)
            progress = int(done / len(top) * 100) if top else 0

            if progress == 100 and goal.status != GoalStatus.COMPLETED:
                goal.status = GoalStatus.COMPLETED
                await db.flush()
                await update_streak(db, user.id, goal.timeline, goal.period)
            elif progress < 100 and goal.status == GoalStatus.COMPLETED:
                goal.status = GoalStatus.ACTIVE

    elif task.due_date is not None:
        period_date = task.due_date.date() if isinstance(task.due_date, datetime) else task.due_date
        period_str = period_date.isoformat()
        all_result = await db.execute(
            select(Task).where(
                Task.user_id == user.id,
                Task.goal_id.is_(None),
                Task.parent_id.is_(None),
                cast(Task.due_date, SADate) == period_date,
            )
        )
        all_tasks = all_result.scalars().all()
        if all_tasks:
            all_done = all(t.completed_value is not None for t in all_tasks)
            if all_done:
                await update_streak(db, user.id, Timeline.DAILY, period_str)
            else:
                await reduce_streak(db, user.id, Timeline.DAILY, period_str)

    await db.commit()
    task = await _fetch_task(db, task_id)
    return _task_to_response(task)


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    goal_id = task.goal_id
    was_top_level = task.parent_id is None
    due_date = task.due_date
    await db.delete(task)
    await db.flush()

    if goal_id and was_top_level:
        goal_result = await db.execute(
            select(Goal).where(Goal.id == goal_id).options(selectinload(Goal.tasks))
        )
        goal = goal_result.scalar_one_or_none()
        if goal:
            top = [t for t in goal.tasks if t.parent_id is None]
            done = sum(1 for t in top if t.completed_value is not None)
            progress = int(done / len(top) * 100) if top else 0

            if progress == 100 and goal.status != GoalStatus.COMPLETED:
                goal.status = GoalStatus.COMPLETED
                await db.flush()
                await update_streak(db, user.id, goal.timeline, goal.period)
            elif progress < 100 and goal.status == GoalStatus.COMPLETED:
                goal.status = GoalStatus.ACTIVE
                await db.flush()
                await reduce_streak(db, user.id, goal.timeline, goal.period)

    elif not goal_id and was_top_level and due_date is not None:
        period_date = due_date.date() if isinstance(due_date, datetime) else due_date
        period_str = period_date.isoformat()
        all_result = await db.execute(
            select(Task).where(
                Task.user_id == user.id,
                Task.goal_id.is_(None),
                Task.parent_id.is_(None),
                cast(Task.due_date, SADate) == period_date,
            )
        )
        remaining = all_result.scalars().all()
        if remaining:
            all_done = all(t.completed_value is not None for t in remaining)
            if not all_done:
                await reduce_streak(db, user.id, Timeline.DAILY, period_str)
        else:
            await reduce_streak(db, user.id, Timeline.DAILY, period_str)

    await db.commit()
    return {"ok": True}
