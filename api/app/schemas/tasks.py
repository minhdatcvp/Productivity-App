from datetime import date, datetime

from pydantic import BaseModel

from app.models.task import CompletionType, GoalStatus, TaskPriority, TaskStatus, Timeline


class NotificationTask(BaseModel):
    id: str
    title: str
    goal_id: str | None
    due_date: datetime | None
    priority: TaskPriority
    status: TaskStatus

    model_config = {"from_attributes": True}


class ActiveGoalNotification(BaseModel):
    goal_id: str
    goal_title: str
    timeline: Timeline
    period: str
    progress: int
    days_remaining: int


class TaskNotificationsResponse(BaseModel):
    overdue: list[NotificationTask]
    due_today: list[NotificationTask]
    due_soon: list[NotificationTask]
    active_goals: list[ActiveGoalNotification]
    total: int


class RolloverPreviewTask(BaseModel):
    id: str
    title: str
    priority: TaskPriority


class RolloverPreviewGoal(BaseModel):
    goal_id: str
    goal_title: str
    tasks: list[RolloverPreviewTask]


class RolloverRequest(BaseModel):
    timeline: Timeline
    to_period: str
    task_ids: list[str]
    to_goal_id: str | None = None


class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    timeline: Timeline
    period: str
    target_value: int = 100


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: GoalStatus | None = None
    target_value: int | None = None


class TaskResponse(BaseModel):
    id: str
    goal_id: str | None
    parent_id: str | None
    title: str
    priority: TaskPriority
    completion_type: CompletionType
    completed_value: int | None
    status: TaskStatus
    notes: str | None
    due_date: datetime | None
    is_pinned: bool = False
    pinned_since: date | None = None
    order: int
    created_at: datetime
    subtasks: list["TaskResponse"] = []

    model_config = {"from_attributes": True}


class GoalResponse(BaseModel):
    id: str
    title: str
    description: str | None
    timeline: Timeline
    period: str
    target_value: int
    status: GoalStatus
    created_at: datetime
    progress: int = 0
    task_count: int = 0
    completed_task_count: int = 0
    tasks: list[TaskResponse] = []

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    goal_id: str | None = None
    parent_id: str | None = None
    title: str
    priority: TaskPriority = TaskPriority.NONE
    completion_type: CompletionType = CompletionType.CHECKBOX
    due_date: datetime | None = None
    is_pinned: bool = False
    pinned_since: date | None = None
    order: int = 0
    notes: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    priority: TaskPriority | None = None
    order: int | None = None
    due_date: datetime | None = None
    notes: str | None = None
    status: TaskStatus | None = None
    is_pinned: bool | None = None
    pinned_since: date | None = None


class TaskComplete(BaseModel):
    completed_value: int | None = None


class PinnedDailyStatusRequest(BaseModel):
    date: date
    status: TaskStatus | None = None
    completed_value: int | None = None


class StreakResponse(BaseModel):
    type: Timeline
    current: int
    longest: int
    last_success: str | None

    model_config = {"from_attributes": True}
