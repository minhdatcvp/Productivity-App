"""learn v2 schema

Revision ID: 004
Revises: 003
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "catalog_blocks",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("icon", sa.String(50), nullable=False, server_default="square"),
        sa.Column("block_type", sa.Enum(
            "FLASHCARD", "VOCABULARY", "NOTES", "CODE_SNIPPET", "QUIZ", "EXERCISE",
            name="blocktype"
        ), nullable=False),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "name", name="uq_catalog_block_user_name"),
    )
    op.create_index("ix_catalog_blocks_user_id", "catalog_blocks", ["user_id"])

    op.create_table(
        "learning_templates",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_learning_templates_user_id", "learning_templates", ["user_id"])

    op.create_table(
        "template_blocks",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("template_id", UUID(as_uuid=False), sa.ForeignKey("learning_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("block_id", UUID(as_uuid=False), sa.ForeignKey("catalog_blocks.id"), nullable=False),
        sa.Column("order", sa.Integer, server_default="0"),
        sa.UniqueConstraint("template_id", "block_id", name="uq_template_block"),
    )

    op.create_table(
        "subjects",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("template_id", UUID(as_uuid=False), sa.ForeignKey("learning_templates.id"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icon", sa.String(10), nullable=False, server_default="📚"),
        sa.Column("color", sa.String(20), nullable=False, server_default="#6366f1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_subjects_user_id", "subjects", ["user_id"])

    op.create_table(
        "subject_modules",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("subject_id", UUID(as_uuid=False), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("block_id", UUID(as_uuid=False), sa.ForeignKey("catalog_blocks.id"), nullable=False),
        sa.Column("order", sa.Integer, server_default="0"),
        sa.Column("config", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("subject_id", "block_id", name="uq_subject_module"),
    )
    op.create_index("ix_subject_modules_subject_id", "subject_modules", ["subject_id"])

    op.create_table(
        "flashcards",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("subject_mod_id", UUID(as_uuid=False), sa.ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("front", sa.Text, nullable=False),
        sa.Column("back", sa.Text, nullable=False),
        sa.Column("ease_factor", sa.Float, server_default="2.5"),
        sa.Column("interval", sa.Integer, server_default="1"),
        sa.Column("repetitions", sa.Integer, server_default="0"),
        sa.Column("next_review", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_review", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_flashcards_subject_mod_id", "flashcards", ["subject_mod_id"])

    op.create_table(
        "vocab_items",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("subject_mod_id", UUID(as_uuid=False), sa.ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("word", sa.String(255), nullable=False),
        sa.Column("meaning", sa.Text, nullable=False),
        sa.Column("pronunciation", sa.String(255), nullable=True),
        sa.Column("example", sa.Text, nullable=True),
        sa.Column("tags", ARRAY(sa.String), server_default="{}"),
        sa.Column("ease_factor", sa.Float, server_default="2.5"),
        sa.Column("interval", sa.Integer, server_default="1"),
        sa.Column("repetitions", sa.Integer, server_default="0"),
        sa.Column("next_review", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_review", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_vocab_items_subject_mod_id", "vocab_items", ["subject_mod_id"])

    op.create_table(
        "notes",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("subject_mod_id", UUID(as_uuid=False), sa.ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text, nullable=False, server_default=""),
        sa.Column("tags", ARRAY(sa.String), server_default="{}"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notes_subject_mod_id", "notes", ["subject_mod_id"])

    op.create_table(
        "code_snippets",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("subject_mod_id", UUID(as_uuid=False), sa.ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("language", sa.String(50), nullable=False, server_default="python"),
        sa.Column("code", sa.Text, nullable=False),
        sa.Column("explanation", sa.Text, nullable=True),
        sa.Column("tags", ARRAY(sa.String), server_default="{}"),
    )
    op.create_index("ix_code_snippets_subject_mod_id", "code_snippets", ["subject_mod_id"])

    op.create_table(
        "subject_quizzes",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("subject_mod_id", UUID(as_uuid=False), sa.ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("questions", JSONB, nullable=False),
        sa.Column("answers", JSONB, nullable=True),
        sa.Column("score", sa.Integer, nullable=True),
        sa.Column("ai_feedback", JSONB, nullable=True),
        sa.Column("status", sa.Enum("PENDING", "IN_PROGRESS", "COMPLETED", name="quizstatus"), server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_subject_quizzes_subject_mod_id", "subject_quizzes", ["subject_mod_id"])

    # Seed system catalog blocks
    op.execute("""
        INSERT INTO catalog_blocks (id, user_id, name, description, icon, block_type, is_system)
        VALUES
          (gen_random_uuid(), NULL, 'Flashcard SRS', 'Thẻ ghi nhớ với thuật toán lặp ngắt quãng SM-2', 'layers', 'FLASHCARD', true),
          (gen_random_uuid(), NULL, 'Từ vựng', 'Danh sách từ vựng có phát âm, ví dụ và SRS', 'book-open', 'VOCABULARY', true),
          (gen_random_uuid(), NULL, 'Ghi chú', 'Ghi chú dạng markdown có tag', 'file-text', 'NOTES', true),
          (gen_random_uuid(), NULL, 'Code Snippet', 'Lưu trữ đoạn code có giải thích', 'code', 'CODE_SNIPPET', true),
          (gen_random_uuid(), NULL, 'Quiz AI', 'Sinh câu hỏi bằng AI và nhận phản hồi', 'help-circle', 'QUIZ', true),
          (gen_random_uuid(), NULL, 'Bài tập', 'Bài tập thực hành có checklist', 'dumbbell', 'EXERCISE', true)
    """)


def downgrade() -> None:
    op.drop_table("subject_quizzes")
    op.drop_table("code_snippets")
    op.drop_table("notes")
    op.drop_table("vocab_items")
    op.drop_table("flashcards")
    op.drop_table("subject_modules")
    op.drop_table("subjects")
    op.drop_table("template_blocks")
    op.drop_table("learning_templates")
    op.drop_table("catalog_blocks")
    op.execute("DROP TYPE IF EXISTS blocktype")
    op.execute("DROP TYPE IF EXISTS quizstatus")
