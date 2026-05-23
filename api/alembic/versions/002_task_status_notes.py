"""add task status and notes

Revision ID: 002
Revises: 001
Create Date: 2026-05-18
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE taskstatus AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED')")
    op.add_column(
        "tasks",
        sa.Column(
            "status",
            sa.Enum("TODO", "IN_PROGRESS", "DONE", "CANCELLED", name="taskstatus"),
            server_default="TODO",
            nullable=False,
        ),
    )
    op.add_column("tasks", sa.Column("notes", sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "notes")
    op.drop_column("tasks", "status")
    op.execute("DROP TYPE taskstatus")
