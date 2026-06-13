"""drop legacy learn v1 tables (superseded by learn_v2)

Revision ID: 006
Revises: 005
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop children first (FK → user_languages), then the parent, then the enum type.
    op.drop_table("language_tests")
    op.drop_table("grammar_notes")
    op.drop_table("vocabulary")
    op.drop_table("user_languages")
    op.execute("DROP TYPE IF EXISTS teststatus")


def downgrade() -> None:
    # Recreate the v1 tables exactly as in migration 001.
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
