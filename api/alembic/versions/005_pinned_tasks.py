"""pinned daily tasks

Revision ID: 005
Revises: 004
Create Date: 2026-05-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM, UUID

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("is_pinned", sa.Boolean, nullable=False, server_default="false"),
    )
    op.add_column(
        "tasks",
        sa.Column("pinned_since", sa.Date, nullable=True),
    )
    op.create_index("ix_tasks_is_pinned", "tasks", ["user_id", "is_pinned"])

    # Reuse existing taskstatus enum (created in migration 002)
    task_status_enum = ENUM(
        "TODO", "IN_PROGRESS", "DONE", "CANCELLED",
        name="taskstatus",
        create_type=False,
    )

    op.create_table(
        "pinned_task_completions",
        sa.Column(
            "task_id",
            UUID(as_uuid=False),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("date", sa.Date, primary_key=True),
        sa.Column("status", task_status_enum, server_default="TODO", nullable=False),
        sa.Column("completed_value", sa.Integer, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("pinned_task_completions")
    op.drop_index("ix_tasks_is_pinned", table_name="tasks")
    op.drop_column("tasks", "pinned_since")
    op.drop_column("tasks", "is_pinned")
