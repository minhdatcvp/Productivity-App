import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TestStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class UserLanguage(Base):
    __tablename__ = "user_languages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    lang_code: Mapped[str] = mapped_column(String(10), nullable=False)
    lang_name: Mapped[str] = mapped_column(String(50), nullable=False)
    daily_goal: Mapped[int] = mapped_column(Integer, default=10)
    methods: Mapped[list] = mapped_column(ARRAY(String), default=list)
    is_active: Mapped[bool] = mapped_column(default=True)

    __table_args__ = (UniqueConstraint("user_id", "lang_code", name="uq_user_language"),)

    user: Mapped["User"] = relationship("User", back_populates="languages")
    vocabulary: Mapped[list["Vocabulary"]] = relationship("Vocabulary", back_populates="user_lang", cascade="all, delete-orphan")
    grammar_notes: Mapped[list["GrammarNote"]] = relationship("GrammarNote", back_populates="user_lang", cascade="all, delete-orphan")
    tests: Mapped[list["LanguageTest"]] = relationship("LanguageTest", back_populates="user_lang", cascade="all, delete-orphan")


class Vocabulary(Base):
    __tablename__ = "vocabulary"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_lang_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("user_languages.id"), nullable=False, index=True)
    word: Mapped[str] = mapped_column(String(255), nullable=False)
    meaning: Mapped[str] = mapped_column(Text, nullable=False)
    example: Mapped[str | None] = mapped_column(Text, nullable=True)
    pronunciation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list)

    # SM-2 spaced repetition fields
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval: Mapped[int] = mapped_column(Integer, default=1)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    last_review: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_lang: Mapped["UserLanguage"] = relationship("UserLanguage", back_populates="vocabulary")


class GrammarNote(Base):
    __tablename__ = "grammar_notes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_lang_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("user_languages.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    examples: Mapped[list] = mapped_column(JSONB, default=list)
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_lang: Mapped["UserLanguage"] = relationship("UserLanguage", back_populates="grammar_notes")


class LanguageTest(Base):
    __tablename__ = "language_tests"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_lang_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("user_languages.id"), nullable=False, index=True)
    week_label: Mapped[str] = mapped_column(String(20), nullable=False)
    questions: Mapped[list] = mapped_column(JSONB, default=list)
    answers: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_feedback: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[TestStatus] = mapped_column(Enum(TestStatus), default=TestStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_lang: Mapped["UserLanguage"] = relationship("UserLanguage", back_populates="tests")
