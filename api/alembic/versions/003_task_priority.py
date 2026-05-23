"""add task priority

Revision ID: 003
Revises: 002
Create Date: 2026-05-18
"""
import sqlalchemy as sa
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE TYPE taskpriority AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NONE')")
    op.add_column(
        "tasks",
        sa.Column(
            "priority",
            sa.Enum("HIGH", "MEDIUM", "LOW", "NONE", name="taskpriority"),
            nullable=False,
            server_default="NONE",
        ),
    )


def downgrade():
    op.drop_column("tasks", "priority")
    op.execute("DROP TYPE taskpriority")
