import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Timeline(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"


class GoalStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"


class CompletionType(str, enum.Enum):
    CHECKBOX = "CHECKBOX"
    PERCENTAGE = "PERCENTAGE"


class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class TaskPriority(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    timeline: Mapped[Timeline] = mapped_column(Enum(Timeline), nullable=False)
    period: Mapped[str] = mapped_column(String(20), nullable=False)
    target_value: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[GoalStatus] = mapped_column(Enum(GoalStatus), default=GoalStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="goals")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="goal", foreign_keys="Task.goal_id")
    ai_summary: Mapped["AISummary | None"] = relationship("AISummary", back_populates="goal", uselist=False)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    goal_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("goals.id"), nullable=True, index=True)
    parent_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    completion_type: Mapped[CompletionType] = mapped_column(Enum(CompletionType), default=CompletionType.CHECKBOX)
    completed_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.TODO, server_default="TODO", nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority), default=TaskPriority.NONE, server_default="NONE")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="tasks")
    goal: Mapped["Goal | None"] = relationship("Goal", back_populates="tasks", foreign_keys=[goal_id])
    subtasks: Mapped[list["Task"]] = relationship("Task", back_populates="parent")
    parent: Mapped["Task | None"] = relationship("Task", back_populates="subtasks", remote_side=[id])


class Streak(Base):
    __tablename__ = "streaks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    type: Mapped[Timeline] = mapped_column(Enum(Timeline), nullable=False)
    current: Mapped[int] = mapped_column(Integer, default=0)
    longest: Mapped[int] = mapped_column(Integer, default=0)
    last_success: Mapped[str | None] = mapped_column(String(20), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="streaks")

    from sqlalchemy import UniqueConstraint
    __table_args__ = (UniqueConstraint("user_id", "type", name="uq_streak_user_type"),)


class AISummary(Base):
    __tablename__ = "ai_summaries"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("goals.id"), unique=True, nullable=False)
    content: Mapped[dict] = mapped_column(__import__("sqlalchemy.dialects.postgresql", fromlist=["JSONB"]).JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    goal: Mapped["Goal"] = relationship("Goal", back_populates="ai_summary")
