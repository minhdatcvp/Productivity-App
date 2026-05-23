"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # user_profiles
    op.create_table(
        "user_profiles",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("work_style", JSONB, server_default="{}"),
        sa.Column("personality_tags", ARRAY(sa.String), server_default="{}"),
        sa.Column("interactions", sa.Integer, server_default="0"),
        sa.Column("last_updated", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # goals
    op.create_table(
        "goals",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("timeline", sa.Enum("DAILY", "WEEKLY", "MONTHLY", name="timeline"), nullable=False),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("target_value", sa.Integer, server_default="100"),
        sa.Column("status", sa.Enum("ACTIVE", "COMPLETED", "FAILED", "ARCHIVED", name="goalstatus"), server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_goals_user_id", "goals", ["user_id"])

    # tasks
    op.create_table(
        "tasks",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("goal_id", UUID(as_uuid=False), sa.ForeignKey("goals.id"), nullable=True),
        sa.Column("parent_id", UUID(as_uuid=False), sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("completion_type", sa.Enum("CHECKBOX", "PERCENTAGE", name="completiontype"), server_default="CHECKBOX"),
        sa.Column("completed_value", sa.Integer, nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("order", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_tasks_user_id", "tasks", ["user_id"])

    # streaks
    op.create_table(
        "streaks",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.Enum("DAILY", "WEEKLY", "MONTHLY", name="timeline"), nullable=False),
        sa.Column("current", sa.Integer, server_default="0"),
        sa.Column("longest", sa.Integer, server_default="0"),
        sa.Column("last_success", sa.String(20), nullable=True),
        sa.UniqueConstraint("user_id", "type", name="uq_streak_user_type"),
    )

    # ai_summaries
    op.create_table(
        "ai_summaries",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("goal_id", UUID(as_uuid=False), sa.ForeignKey("goals.id"), unique=True, nullable=False),
        sa.Column("content", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # user_languages
    op.create_table(
        "user_languages",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("lang_code", sa.String(10), nullable=False),
        sa.Column("lang_name", sa.String(50), nullable=False),
        sa.Column("daily_goal", sa.Integer, server_default="10"),
        sa.Column("methods", ARRAY(sa.String), server_default="{}"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.UniqueConstraint("user_id", "lang_code", name="uq_user_language"),
    )
    op.create_index("ix_user_languages_user_id", "user_languages", ["user_id"])

    # vocabulary
    op.create_table(
        "vocabulary",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_lang_id", UUID(as_uuid=False), sa.ForeignKey("user_languages.id"), nullable=False),
        sa.Column("word", sa.String(255), nullable=False),
        sa.Column("meaning", sa.Text, nullable=False),
        sa.Column("example", sa.Text, nullable=True),
        sa.Column("pronunciation", sa.String(255), nullable=True),
        sa.Column("tags", ARRAY(sa.String), server_default="{}"),
        sa.Column("ease_factor", sa.Float, server_default="2.5"),
        sa.Column("interval", sa.Integer, server_default="1"),
        sa.Column("repetitions", sa.Integer, server_default="0"),
        sa.Column("next_review", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_review", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_vocabulary_user_lang_next_review", "vocabulary", ["user_lang_id", "next_review"])

    # grammar_notes
    op.create_table(
        "grammar_notes",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_lang_id", UUID(as_uuid=False), sa.ForeignKey("user_languages.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("examples", JSONB, server_default="[]"),
        sa.Column("tags", ARRAY(sa.String), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # language_tests
    op.create_table(
        "language_tests",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_lang_id", UUID(as_uuid=False), sa.ForeignKey("user_languages.id"), nullable=False),
        sa.Column("week_label", sa.String(20), nullable=False),
        sa.Column("questions", JSONB, server_default="[]"),
        sa.Column("answers", JSONB, nullable=True),
        sa.Column("score", sa.Integer, nullable=True),
        sa.Column("ai_feedback", JSONB, nullable=True),
        sa.Column("status", sa.Enum("PENDING", "IN_PROGRESS", "COMPLETED", name="teststatus"), server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("language_tests")
    op.drop_table("grammar_notes")
    op.drop_table("vocabulary")
    op.drop_table("user_languages")
    op.drop_table("ai_summaries")
    op.drop_table("streaks")
    op.drop_table("tasks")
    op.drop_table("goals")
    op.drop_table("user_profiles")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS timeline")
    op.execute("DROP TYPE IF EXISTS goalstatus")
    op.execute("DROP TYPE IF EXISTS completiontype")
    op.execute("DROP TYPE IF EXISTS teststatus")
