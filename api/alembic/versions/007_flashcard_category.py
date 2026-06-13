"""add category to flashcards (Cần học thêm / Đã nhớ)

Revision ID: 007
Revises: 006
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    flashcard_category = sa.Enum("REVIEW", "MEMORIZED", name="flashcardcategory")
    flashcard_category.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "flashcards",
        sa.Column(
            "category",
            flashcard_category,
            nullable=False,
            server_default="REVIEW",
        ),
    )


def downgrade() -> None:
    op.drop_column("flashcards", "category")
    sa.Enum(name="flashcardcategory").drop(op.get_bind(), checkfirst=True)
