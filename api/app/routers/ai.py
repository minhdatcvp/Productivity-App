from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.task import AISummary, Goal, Task
from app.models.user import User
from app.schemas.ai import AISummaryResponse, BreakdownResponse, BreakdownTask, ConfirmDailyRequest, DailyBreakdownRequest, GoalBreakdownRequest, GoalConfirmRequest, JobStatusResponse, SummarizeResponse
from app.services import ai_service
from app.workers.summary_worker import summarize_goal

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/goals/{goal_id}/breakdown", response_model=BreakdownResponse)
async def breakdown_goal(
    goal_id: str,
    body: GoalBreakdownRequest | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id, Goal.user_id == user.id)
        .options(selectinload(Goal.tasks))
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")

    existing = [t.title for t in goal.tasks if t.parent_id is None]
    try:
        titles = await ai_service.breakdown_goal(
            goal.title, goal.description, existing,
            body.refinement if body else None,
        )
    except Exception as e:
        raise HTTPException(500, f"AI service error: {e}")

    return BreakdownResponse(tasks=[BreakdownTask(**t) for t in titles])


@router.post("/goals/{goal_id}/confirm", response_model=BreakdownResponse)
async def confirm_goal_tasks(
    goal_id: str,
    body: GoalConfirmRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id, Goal.user_id == user.id)
        .options(selectinload(Goal.tasks))
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")

    existing_count = len([t for t in goal.tasks if t.parent_id is None])
    for i, item in enumerate(body.tasks):
        task = Task(
            user_id=user.id,
            goal_id=goal.id,
            title=item.title,
            priority=item.priority,
            notes=item.description,
            order=existing_count + i,
        )
        db.add(task)
    await db.commit()

    return BreakdownResponse(tasks=body.tasks)


@router.post("/daily/breakdown", response_model=BreakdownResponse)
async def breakdown_daily(
    body: DailyBreakdownRequest,
    user: User = Depends(get_current_user),
):
    try:
        items = await ai_service.breakdown_daily(body.title, body.detail, body.period, body.refinement)
    except Exception as e:
        raise HTTPException(500, f"AI service error: {e}")

    return BreakdownResponse(tasks=[BreakdownTask(**t) for t in items])


@router.post("/daily/confirm", response_model=BreakdownResponse)
async def confirm_daily_tasks(
    body: ConfirmDailyRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from datetime import datetime
    due_dt = datetime.fromisoformat(body.period)
    for i, item in enumerate(body.tasks):
        task = Task(
            user_id=user.id,
            title=item.title,
            priority=item.priority,
            notes=item.description,
            due_date=due_dt,
            order=i,
        )
        db.add(task)
    await db.commit()

    return BreakdownResponse(tasks=body.tasks)


@router.post("/goals/{goal_id}/summarize", response_model=SummarizeResponse)
async def trigger_summary(
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

    try:
        job = summarize_goal.delay(goal_id, user.id)
    except Exception as e:
        raise HTTPException(500, f"Queue error: {e}")
    return SummarizeResponse(job_id=job.id)


@router.get("/goals/{goal_id}/summary", response_model=AISummaryResponse | None)
async def get_summary(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    goal_result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id)
    )
    if not goal_result.scalar_one_or_none():
        raise HTTPException(404, "Goal not found")

    summary_result = await db.execute(
        select(AISummary).where(AISummary.goal_id == goal_id)
    )
    summary = summary_result.scalar_one_or_none()
    if not summary:
        return None
    return AISummaryResponse(
        id=summary.id,
        goal_id=summary.goal_id,
        content=summary.content,
        created_at=summary.created_at.isoformat(),
    )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    result = AsyncResult(job_id)
    if result.state == "SUCCESS":
        return JobStatusResponse(status="SUCCESS", result=result.result)
    if result.state == "FAILURE":
        return JobStatusResponse(status="FAILURE")
    return JobStatusResponse(status=result.state)
