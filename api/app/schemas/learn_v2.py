from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.models.learn_v2 import BlockType, QuizStatus


# ── Catalog ───────────────────────────────────────────────────────────────────

class CatalogBlockOut(BaseModel):
    id: str
    user_id: str | None
    name: str
    description: str
    icon: str
    block_type: BlockType
    is_system: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CatalogBlockCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "square"
    block_type: BlockType


class SuggestCatalogRequest(BaseModel):
    query: str


class BlockSuggestion(BaseModel):
    name: str
    block_type: BlockType
    description: str
    icon: str
    is_duplicate: bool = False


class SuggestCatalogResponse(BaseModel):
    suggestions: list[BlockSuggestion]


# ── Templates ─────────────────────────────────────────────────────────────────

class TemplateBlockOut(BaseModel):
    id: str
    block_id: str
    block: CatalogBlockOut
    order: int

    model_config = {"from_attributes": True}


class TemplateOut(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    created_at: datetime
    template_blocks: list[TemplateBlockOut] = []

    model_config = {"from_attributes": True}


class TemplateCreate(BaseModel):
    name: str
    description: str = ""
    block_ids: list[str]


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    block_ids: list[str] | None = None


# ── Subjects ──────────────────────────────────────────────────────────────────

class SubjectModuleOut(BaseModel):
    id: str
    subject_id: str
    block_id: str
    block: CatalogBlockOut
    order: int
    config: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class SubjectOut(BaseModel):
    id: str
    user_id: str
    template_id: str | None
    name: str
    icon: str
    color: str
    created_at: datetime
    modules: list[SubjectModuleOut] = []

    model_config = {"from_attributes": True}


class SubjectCreate(BaseModel):
    name: str
    icon: str = "📚"
    color: str = "#6366f1"
    template_id: str | None = None


# ── Flashcards ────────────────────────────────────────────────────────────────

class FlashCardOut(BaseModel):
    id: str
    subject_mod_id: str
    front: str
    back: str
    ease_factor: float
    interval: int
    repetitions: int
    next_review: datetime
    last_review: datetime | None

    model_config = {"from_attributes": True}


class FlashCardCreate(BaseModel):
    front: str
    back: str


class FlashCardUpdate(BaseModel):
    front: str | None = None
    back: str | None = None


# ── Vocab ─────────────────────────────────────────────────────────────────────

class VocabItemOut(BaseModel):
    id: str
    subject_mod_id: str
    word: str
    meaning: str
    pronunciation: str | None
    example: str | None
    tags: list[str]
    ease_factor: float
    interval: int
    repetitions: int
    next_review: datetime
    last_review: datetime | None

    model_config = {"from_attributes": True}


class VocabItemCreate(BaseModel):
    word: str
    meaning: str
    pronunciation: str | None = None
    example: str | None = None
    tags: list[str] = []


class VocabItemUpdate(BaseModel):
    word: str | None = None
    meaning: str | None = None
    pronunciation: str | None = None
    example: str | None = None
    tags: list[str] | None = None


# ── Notes ─────────────────────────────────────────────────────────────────────

class NoteOut(BaseModel):
    id: str
    subject_mod_id: str
    title: str
    content: str
    tags: list[str]
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    tags: list[str] = []


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None


# ── Code Snippets ─────────────────────────────────────────────────────────────

class CodeSnippetOut(BaseModel):
    id: str
    subject_mod_id: str
    title: str
    language: str
    code: str
    explanation: str | None
    tags: list[str]

    model_config = {"from_attributes": True}


class CodeSnippetCreate(BaseModel):
    title: str
    language: str = "python"
    code: str
    explanation: str | None = None
    tags: list[str] = []


class CodeSnippetUpdate(BaseModel):
    title: str | None = None
    language: str | None = None
    code: str | None = None
    explanation: str | None = None
    tags: list[str] | None = None


# ── Quiz ──────────────────────────────────────────────────────────────────────

class SubjectQuizOut(BaseModel):
    id: str
    subject_mod_id: str
    questions: Any
    answers: Any | None
    score: int | None
    ai_feedback: Any | None
    status: QuizStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class QuizSubmit(BaseModel):
    answers: dict


# ── AI Learning ───────────────────────────────────────────────────────────────

class AIConfigOut(BaseModel):
    ai_enabled: bool = False
    daily_count: int = 10
    topics: list[str] = []
    difficulty: str = "intermediate"
    last_generated_at: str | None = None


class AIConfigUpdate(BaseModel):
    ai_enabled: bool | None = None
    daily_count: int | None = None
    topics: list[str] | None = None
    difficulty: str | None = None


class AIGeneratedItem(BaseModel):
    type: str  # "vocab" | "flashcard" | "note" | "exercise"
    # vocab fields
    word: str | None = None
    meaning: str | None = None
    pronunciation: str | None = None
    example: str | None = None
    # flashcard fields
    front: str | None = None
    back: str | None = None
    # note/exercise fields
    title: str | None = None
    content: str | None = None
    tags: list[str] = []


class AIGenerateResponse(BaseModel):
    items: list[dict]
    block_type: str


class AIConfirmRequest(BaseModel):
    items: list[dict]


class AIQuizGenerateRequest(BaseModel):
    count: int = 10


class AILookupVocabRequest(BaseModel):
    word: str


class AILookupVocabResponse(BaseModel):
    word: str
    meaning: str
    pronunciation: str = ""
    example: str = ""


# ── SRS ───────────────────────────────────────────────────────────────────────

class SRSReviewRequest(BaseModel):
    item_id: str
    quality: int  # 0-5 (SM-2 quality score)


class SRSItemOut(BaseModel):
    type: str  # "flashcard" | "vocab"
    item: FlashCardOut | VocabItemOut
