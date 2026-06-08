from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast, select
from sqlalchemy import Date as SADate
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.task import Goal, GoalStatus, PinnedTaskCompletion, Task, TaskStatus, Timeline
from app.models.user import User
from app.schemas.tasks import (
    PinnedDailyStatusRequest,
    TaskComplete,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.services.rollover_service import rollover_daily_tasks
from app.services.streak_service import reduce_streak, update_streak

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_to_response(task: Task) -> TaskResponse:
    return TaskResponse(
        **{c.key: getattr(task, c.key) for c in task.__table__.columns},
        subtasks=list(task.subtasks),
    )


def _pinned_task_to_response(task: Task, completion: PinnedTaskCompletion | None) -> TaskResponse:
    """For pinned tasks, override status/completed_value with the per-day completion row."""
    cols = {c.key: getattr(task, c.key) for c in task.__table__.columns}
    if completion:
        cols["status"] = completion.status
        cols["completed_value"] = completion.completed_value
    else:
        cols["status"] = TaskStatus.TODO
        cols["completed_value"] = None
    return TaskResponse(**cols, subtasks=list(task.subtasks))


async def _fetch_task(db: AsyncSession, task_id: str) -> Task:
    result = await db.execute(
        select(Task).where(Task.id == task_id).options(selectinload(Task.subtasks))
    )
    return result.scalar_one()


async def _all_done_for_day(db: AsyncSession, user_id: str, period_date: date) -> bool:
    """Check if all standalone tasks (one-off + pinned) for the given date are DONE."""
    # One-off tasks scheduled for this date
    one_off_res = await db.execute(
        select(Task).where(
            Task.user_id == user_id,
            Task.goal_id.is_(None),
            Task.parent_id.is_(None),
            Task.is_pinned.is_(False),
            cast(Task.due_date, SADate) == period_date,
        )
    )
    one_off = one_off_res.scalars().all()

    # Pinned tasks active on this date
    pinned_res = await db.execute(
        select(Task).where(
            Task.user_id == user_id,
            Task.goal_id.is_(None),
            Task.parent_id.is_(None),
            Task.is_pinned.is_(True),
            Task.pinned_since <= period_date,
        )
    )
    pinned = pinned_res.scalars().all()

    if not one_off and not pinned:
        return False

    # One-off uses Task.completed_value
    for t in one_off:
        if t.completed_value is None:
            return False

    # Pinned uses completion table
    if pinned:
        pin_ids = [t.id for t in pinned]
        comp_res = await db.execute(
            select(PinnedTaskCompletion).where(
                PinnedTaskCompletion.task_id.in_(pin_ids),
                PinnedTaskCompletion.date == period_date,
            )
        )
        completions = {c.task_id: c for c in comp_res.scalars().all()}
        for t in pinned:
            c = completions.get(t.id)
            if not c or c.completed_value is None:
                return False
    return True


@router.get("", response_model=list[TaskResponse])
async def list_daily_tasks(
    period: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    period_date = date.fromisoformat(period)

    # Auto-rollover incomplete one-off tasks to today when user views today's list
    if period_date == date.today():
        await rollover_daily_tasks(db, user.id, period_date)

    # One-off tasks scheduled for this date
    one_off_res = await db.execute(
        select(Task)
        .where(
            Task.user_id == user.id,
            Task.goal_id.is_(None),
            Task.parent_id.is_(None),
            Task.is_pinned.is_(False),
            cast(Task.due_date, SADate) == period_date,
        )
        .options(selectinload(Task.subtasks))
        .order_by(Task.order, Task.created_at)
    )
    one_off = list(one_off_res.scalars().all())

    # Pinned tasks active on this date
    pinned_res = await db.execute(
        select(Task)
        .where(
            Task.user_id == user.id,
            Task.goal_id.is_(None),
            Task.parent_id.is_(None),
            Task.is_pinned.is_(True),
            Task.pinned_since <= period_date,
        )
        .options(selectinload(Task.subtasks))
        .order_by(Task.order, Task.created_at)
    )
    pinned = list(pinned_res.scalars().all())

    # Load completions for pinned tasks for this date
    completions_map: dict[str, PinnedTaskCompletion] = {}
    if pinned:
        comp_res = await db.execute(
            select(PinnedTaskCompletion).where(
                PinnedTaskCompletion.task_id.in_([t.id for t in pinned]),
                PinnedTaskCompletion.date == period_date,
            )
        )
        completions_map = {c.task_id: c for c in comp_res.scalars().all()}

    return [_task_to_response(t) for t in one_off] + [
        _pinned_task_to_response(t, completions_map.get(t.id)) for t in pinned
    ]


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

    data = body.model_dump()
    # If pinned and pinned_since not provided, default to today (or due_date if given)
    if data.get("is_pinned") and not data.get("pinned_since"):
        if data.get("due_date"):
            dd = data["due_date"]
            data["pinned_since"] = dd.date() if isinstance(dd, datetime) else dd
        else:
            data["pinned_since"] = date.today()

    task = Task(user_id=user.id, **data)
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

    payload = body.model_dump(exclude_unset=True)

    # Toggling pin ON: default pinned_since to today if not explicitly set
    if payload.get("is_pinned") is True and "pinned_since" not in payload and task.pinned_since is None:
        payload["pinned_since"] = date.today()

    for field, value in payload.items():
        setattr(task, field, value)
    await db.commit()
    task = await _fetch_task(db, task_id)
    return _task_to_response(task)


@router.patch("/{task_id}/pinned-status", response_model=TaskResponse)
async def update_pinned_daily_status(
    task_id: str,
    body: PinnedDailyStatusRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upsert per-day completion row for a pinned task. Drives streak for that date."""
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    if not task.is_pinned:
        raise HTTPException(400, "Task is not pinned")

    target_date = body.date
    new_status = body.status if body.status is not None else TaskStatus.TODO
    # Auto-derive completed_value: DONE → 100, anything else → None (unless explicitly given)
    if body.completed_value is not None:
        new_completed = body.completed_value
    else:
        new_completed = 100 if new_status == TaskStatus.DONE else None

    stmt = pg_insert(PinnedTaskCompletion).values(
        task_id=task_id,
        date=target_date,
        status=new_status,
        completed_value=new_completed,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["task_id", "date"],
        set_={"status": new_status, "completed_value": new_completed},
    )
    await db.execute(stmt)
    await db.flush()

    # Streak: if all standalone tasks for this date done → bump; else reduce.
    period_str = target_date.isoformat()
    if await _all_done_for_day(db, user.id, target_date):
        await update_streak(db, user.id, Timeline.DAILY, period_str)
    else:
        await reduce_streak(db, user.id, Timeline.DAILY, period_str)

    await db.commit()

    # Return the task with the per-day status overlaid
    fetched = await _fetch_task(db, task_id)
    comp_res = await db.execute(
        select(PinnedTaskCompletion).where(
            PinnedTaskCompletion.task_id == task_id,
            PinnedTaskCompletion.date == target_date,
        )
    )
    completion = comp_res.scalar_one_or_none()
    return _pinned_task_to_response(fetched, completion)


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
    if task.is_pinned:
        raise HTTPException(400, "Use /tasks/{id}/pinned-status for pinned tasks")

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
        if await _all_done_for_day(db, user.id, period_date):
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
    was_pinned = task.is_pinned
    pinned_since = task.pinned_since
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

    elif not goal_id and was_top_level and due_date is not None and not was_pinned:
        period_date = due_date.date() if isinstance(due_date, datetime) else due_date
        period_str = period_date.isoformat()
        if not await _all_done_for_day(db, user.id, period_date):
            await reduce_streak(db, user.id, Timeline.DAILY, period_str)

    elif not goal_id and was_top_level and was_pinned and pinned_since is not None:
        # Recheck today's streak if we deleted a pinned task that was active today
        today = date.today()
        if pinned_since <= today and not await _all_done_for_day(db, user.id, today):
            await reduce_streak(db, user.id, Timeline.DAILY, today.isoformat())

    await db.commit()
    return {"ok": True}
