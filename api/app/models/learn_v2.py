import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey, Integer,
    String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BlockType(str, enum.Enum):
    FLASHCARD = "FLASHCARD"
    VOCABULARY = "VOCABULARY"
    NOTES = "NOTES"
    CODE_SNIPPET = "CODE_SNIPPET"
    QUIZ = "QUIZ"
    EXERCISE = "EXERCISE"


class QuizStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class CatalogBlock(Base):
    __tablename__ = "catalog_blocks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="square")
    block_type: Mapped[BlockType] = mapped_column(Enum(BlockType), nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_catalog_block_user_name"),)

    template_blocks: Mapped[list["TemplateBlock"]] = relationship("TemplateBlock", back_populates="block")
    subject_modules: Mapped[list["SubjectModule"]] = relationship("SubjectModule", back_populates="block")


class LearningTemplate(Base):
    __tablename__ = "learning_templates"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    template_blocks: Mapped[list["TemplateBlock"]] = relationship(
        "TemplateBlock", back_populates="template", cascade="all, delete-orphan", order_by="TemplateBlock.order"
    )
    subjects: Mapped[list["Subject"]] = relationship("Subject", back_populates="template")


class TemplateBlock(Base):
    __tablename__ = "template_blocks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("learning_templates.id", ondelete="CASCADE"), nullable=False)
    block_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("catalog_blocks.id"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (UniqueConstraint("template_id", "block_id", name="uq_template_block"),)

    template: Mapped["LearningTemplate"] = relationship("LearningTemplate", back_populates="template_blocks")
    block: Mapped["CatalogBlock"] = relationship("CatalogBlock", back_populates="template_blocks")


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    template_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("learning_templates.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), nullable=False, default="📚")
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#6366f1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    template: Mapped["LearningTemplate | None"] = relationship("LearningTemplate", back_populates="subjects")
    modules: Mapped[list["SubjectModule"]] = relationship(
        "SubjectModule", back_populates="subject", cascade="all, delete-orphan", order_by="SubjectModule.order"
    )


class SubjectModule(Base):
    __tablename__ = "subject_modules"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    block_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("catalog_blocks.id"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("subject_id", "block_id", name="uq_subject_module"),)

    subject: Mapped["Subject"] = relationship("Subject", back_populates="modules")
    block: Mapped["CatalogBlock"] = relationship("CatalogBlock", back_populates="subject_modules")

    flashcards: Mapped[list["FlashCard"]] = relationship("FlashCard", back_populates="subject_module", cascade="all, delete-orphan")
    vocab_items: Mapped[list["VocabItem"]] = relationship("VocabItem", back_populates="subject_module", cascade="all, delete-orphan")
    notes: Mapped[list["Note"]] = relationship("Note", back_populates="subject_module", cascade="all, delete-orphan")
    code_snippets: Mapped[list["CodeSnippet"]] = relationship("CodeSnippet", back_populates="subject_module", cascade="all, delete-orphan")
    quizzes: Mapped[list["SubjectQuiz"]] = relationship("SubjectQuiz", back_populates="subject_module", cascade="all, delete-orphan")


class FlashCard(Base):
    __tablename__ = "flashcards"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_mod_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval: Mapped[int] = mapped_column(Integer, default=1)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_review: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    subject_module: Mapped["SubjectModule"] = relationship("SubjectModule", back_populates="flashcards")


class VocabItem(Base):
    __tablename__ = "vocab_items"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_mod_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    word: Mapped[str] = mapped_column(String(255), nullable=False)
    meaning: Mapped[str] = mapped_column(Text, nullable=False)
    pronunciation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    example: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list, server_default="{}")
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval: Mapped[int] = mapped_column(Integer, default=1)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_review: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    subject_module: Mapped["SubjectModule"] = relationship("SubjectModule", back_populates="vocab_items")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_mod_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list, server_default="{}")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subject_module: Mapped["SubjectModule"] = relationship("SubjectModule", back_populates="notes")


class CodeSnippet(Base):
    __tablename__ = "code_snippets"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_mod_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False, default="python")
    code: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list, server_default="{}")

    subject_module: Mapped["SubjectModule"] = relationship("SubjectModule", back_populates="code_snippets")


class SubjectQuiz(Base):
    __tablename__ = "subject_quizzes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_mod_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("subject_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    questions: Mapped[dict] = mapped_column(JSONB, nullable=False)
    answers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_feedback: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[QuizStatus] = mapped_column(Enum(QuizStatus), default=QuizStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    subject_module: Mapped["SubjectModule"] = relationship("SubjectModule", back_populates="quizzes")
