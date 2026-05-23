from typing import Optional
from pydantic import BaseModel


class BreakdownTask(BaseModel):
    title: str
    priority: str
    description: str | None = None


class BreakdownResponse(BaseModel):
    tasks: list[BreakdownTask]


class SummarizeResponse(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    status: str
    result: Optional[dict] = None


class DailyBreakdownRequest(BaseModel):
    period: str
    title: str
    detail: Optional[str] = None
    refinement: Optional[str] = None


class ConfirmDailyRequest(BaseModel):
    period: str
    tasks: list[BreakdownTask]


class GoalBreakdownRequest(BaseModel):
    refinement: Optional[str] = None


class GoalConfirmRequest(BaseModel):
    tasks: list[BreakdownTask]


class AISummaryResponse(BaseModel):
    id: str
    goal_id: str
    content: dict
    created_at: str
