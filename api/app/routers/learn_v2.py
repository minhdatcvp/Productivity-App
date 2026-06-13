import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.learn_v2 import (
    BlockType, CatalogBlock, CodeSnippet, FlashCard, FlashCardCategory,
    LearningTemplate, Note, Subject, SubjectModule, SubjectQuiz, TemplateBlock,
    VocabItem,
)
from app.models.user import User
from app.schemas.learn_v2 import (
    AssessmentReminder, CodeSnippetCreate, CodeSnippetUpdate,
    FlashCardCreate, FlashCardUpdate,
    LearnRemindersResponse,
    NoteCreate, NoteUpdate,
    QuizSubmit, SRSReminder, SRSReviewRequest,
    SubjectCreate, SubjectOut,
    VocabCategorizeRequest, VocabItemCreate, VocabItemUpdate,
)
from app.services.learn_service import get_module
from app.services.srs_service import compute_next_review

router = APIRouter(prefix="/learn", tags=["learn"])

_SUBJECT_OPTS = selectinload(Subject.modules).selectinload(SubjectModule.block)


# ── Reminders (in-app schedule) ───────────────────────────────────────────────

_CADENCE_DAYS = {"weekly": 7, "monthly": 30}


@router.get("/reminders", response_model=LearnRemindersResponse)
async def get_learn_reminders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Pull-based learning reminders: subjects due for a re-assessment (per the
    cadence set on their EXERCISE module) and subjects with SRS cards due."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Subject)
        .where(Subject.user_id == current_user.id)
        .options(_SUBJECT_OPTS)
        .order_by(Subject.created_at)
    )
    subjects = result.scalars().all()

    # Map flashcard module id → subject, then count due REVIEW cards in one query.
    fc_mod_to_subject: dict[str, Subject] = {}
    for s in subjects:
        for m in s.modules:
            if m.block.block_type == BlockType.FLASHCARD:
                fc_mod_to_subject[m.id] = s

    due_by_subject: dict[str, int] = {}
    if fc_mod_to_subject:
        dr = await db.execute(
            select(FlashCard.subject_mod_id, func.count(FlashCard.id))
            .where(
                FlashCard.subject_mod_id.in_(list(fc_mod_to_subject)),
                FlashCard.category == FlashCardCategory.REVIEW,
                FlashCard.next_review <= now,
            )
            .group_by(FlashCard.subject_mod_id)
        )
        for mod_id, cnt in dr.all():
            sid = fc_mod_to_subject[mod_id].id
            due_by_subject[sid] = due_by_subject.get(sid, 0) + cnt

    assessments: list[AssessmentReminder] = []
    srs: list[SRSReminder] = []

    for s in subjects:
        # Assessment cadence (on the EXERCISE module config)
        ex_mod = next((m for m in s.modules if m.block.block_type == BlockType.EXERCISE), None)
        if ex_mod:
            cfg = ex_mod.config or {}
            cadence = cfg.get("assess_cadence", "monthly")
            if cadence != "off":
                last_raw = cfg.get("level_assessed_at")
                if not last_raw:
                    assessments.append(AssessmentReminder(
                        subject_id=s.id, subject_name=s.name, icon=s.icon,
                        level=cfg.get("level"), last_assessed_at=None,
                        days_overdue=0, never=True,
                    ))
                else:
                    try:
                        last_dt = datetime.fromisoformat(last_raw)
                        if last_dt.tzinfo is None:
                            last_dt = last_dt.replace(tzinfo=timezone.utc)
                    except ValueError:
                        last_dt = None
                    if last_dt is not None:
                        next_due = last_dt + timedelta(days=_CADENCE_DAYS.get(cadence, 30))
                        if now >= next_due:
                            assessments.append(AssessmentReminder(
                                subject_id=s.id, subject_name=s.name, icon=s.icon,
                                level=cfg.get("level"), last_assessed_at=last_raw,
                                days_overdue=(now - next_due).days, never=False,
                            ))

        # SRS due
        cnt = due_by_subject.get(s.id, 0)
        if cnt > 0:
            srs.append(SRSReminder(
                subject_id=s.id, subject_name=s.name, icon=s.icon, due_count=cnt,
            ))

    return LearnRemindersResponse(
        assessments=assessments, srs=srs, total=len(assessments) + len(srs),
    )


# ── Subjects ──────────────────────────────────────────────────────────────────

@router.get("/subjects", response_model=list[SubjectOut])
async def list_subjects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subject)
        .where(Subject.user_id == current_user.id)
        .options(_SUBJECT_OPTS)
        .order_by(Subject.created_at)
    )
    return result.scalars().all()


@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
async def create_subject(
    body: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    subject = Subject(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        template_id=body.template_id,
        name=body.name,
        icon=body.icon,
        color=body.color,
    )
    db.add(subject)
    await db.flush()

    if body.template_id:
        tb_result = await db.execute(
            select(TemplateBlock)
            .where(TemplateBlock.template_id == body.template_id)
            .order_by(TemplateBlock.order)
        )
        for i, tb in enumerate(tb_result.scalars().all()):
            db.add(SubjectModule(
                id=str(uuid.uuid4()),
                subject_id=subject.id,
                block_id=tb.block_id,
                order=i,
                config={},
            ))

    await db.commit()
    result = await db.execute(
        select(Subject).where(Subject.id == subject.id).options(_SUBJECT_OPTS)
    )
    return result.scalar_one()


@router.get("/subjects/{subject_id}", response_model=SubjectOut)
async def get_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subject)
        .where(Subject.id == subject_id, Subject.user_id == current_user.id)
        .options(_SUBJECT_OPTS)
    )
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subject).where(Subject.id == subject_id, Subject.user_id == current_user.id)
    )
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    await db.delete(subject)
    await db.commit()


# ── Items: dispatch by block_type ─────────────────────────────────────────────

@router.get("/subjects/{subject_id}/modules/{module_id}/items")
async def list_items(
    subject_id: str,
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mod = await get_module(db, subject_id, module_id, current_user.id)
    return await _fetch_items(db, mod)


async def _fetch_items(db: AsyncSession, mod: SubjectModule) -> list:
    bt = mod.block.block_type
    if bt == BlockType.FLASHCARD:
        r = await db.execute(select(FlashCard).where(FlashCard.subject_mod_id == mod.id))
        return r.scalars().all()
    if bt == BlockType.VOCABULARY:
        r = await db.execute(select(VocabItem).where(VocabItem.subject_mod_id == mod.id))
        return r.scalars().all()
    if bt == BlockType.NOTES:
        r = await db.execute(select(Note).where(Note.subject_mod_id == mod.id))
        return r.scalars().all()
    if bt == BlockType.CODE_SNIPPET:
        r = await db.execute(select(CodeSnippet).where(CodeSnippet.subject_mod_id == mod.id))
        return r.scalars().all()
    if bt == BlockType.QUIZ:
        r = await db.execute(select(SubjectQuiz).where(SubjectQuiz.subject_mod_id == mod.id).order_by(SubjectQuiz.created_at.desc()))
        return r.scalars().all()
    return []


@router.post("/subjects/{subject_id}/modules/{module_id}/items", status_code=status.HTTP_201_CREATED)
async def create_item(
    subject_id: str,
    module_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mod = await get_module(db, subject_id, module_id, current_user.id)
    bt = mod.block.block_type

    item_id = str(uuid.uuid4())
    if bt == BlockType.FLASHCARD:
        parsed = FlashCardCreate(**body)
        item = FlashCard(id=item_id, subject_mod_id=mod.id, front=parsed.front, back=parsed.back, category=parsed.category)
    elif bt == BlockType.VOCABULARY:
        parsed = VocabItemCreate(**body)
        item = VocabItem(id=item_id, subject_mod_id=mod.id, **parsed.model_dump())
    elif bt == BlockType.NOTES:
        parsed = NoteCreate(**body)
        item = Note(id=item_id, subject_mod_id=mod.id, **parsed.model_dump())
    elif bt == BlockType.CODE_SNIPPET:
        parsed = CodeSnippetCreate(**body)
        item = CodeSnippet(id=item_id, subject_mod_id=mod.id, **parsed.model_dump())
    else:
        raise HTTPException(status_code=400, detail=f"Cannot manually create items for block type {bt}")

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/subjects/{subject_id}/modules/{module_id}/items/{item_id}", status_code=status.HTTP_200_OK)
async def update_item(
    subject_id: str,
    module_id: str,
    item_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mod = await get_module(db, subject_id, module_id, current_user.id)
    bt = mod.block.block_type

    item = await _get_item(db, bt, item_id, mod.id)
    update_data = _parse_update(bt, body)
    for k, v in update_data.items():
        if v is not None:
            setattr(item, k, v)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/subjects/{subject_id}/modules/{module_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    subject_id: str,
    module_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mod = await get_module(db, subject_id, module_id, current_user.id)
    item = await _get_item(db, mod.block.block_type, item_id, mod.id)
    await db.delete(item)
    await db.commit()


async def _get_item(db, bt: BlockType, item_id: str, mod_id: str):
    model_map = {
        BlockType.FLASHCARD: FlashCard,
        BlockType.VOCABULARY: VocabItem,
        BlockType.NOTES: Note,
        BlockType.CODE_SNIPPET: CodeSnippet,
    }
    Model = model_map.get(bt)
    if not Model:
        raise HTTPException(status_code=400, detail="Invalid block type for item operations")
    r = await db.execute(select(Model).where(Model.id == item_id, Model.subject_mod_id == mod_id))
    item = r.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


def _parse_update(bt: BlockType, body: dict) -> dict:
    if bt == BlockType.FLASHCARD:
        return FlashCardUpdate(**body).model_dump(exclude_none=True)
    if bt == BlockType.VOCABULARY:
        return VocabItemUpdate(**body).model_dump(exclude_none=True)
    if bt == BlockType.NOTES:
        return NoteUpdate(**body).model_dump(exclude_none=True)
    if bt == BlockType.CODE_SNIPPET:
        return CodeSnippetUpdate(**body).model_dump(exclude_none=True)
    return {}


# ── SRS ───────────────────────────────────────────────────────────────────────

@router.get("/subjects/{subject_id}/modules/{module_id}/due")
async def get_due_items(
    subject_id: str,
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mod = await get_module(db, subject_id, module_id, current_user.id)
    now = datetime.now(timezone.utc)
    bt = mod.block.block_type

    if bt == BlockType.FLASHCARD:
        # Only "Cần học thêm" (REVIEW) cards are reviewed; "Đã nhớ" are excluded.
        r = await db.execute(
            select(FlashCard).where(
                FlashCard.subject_mod_id == mod.id,
                FlashCard.category == FlashCardCategory.REVIEW,
                FlashCard.next_review <= now,
            )
        )
        items = [{"type": "flashcard", "item": i} for i in r.scalars().all()]
    else:
        # Vocab is no longer SRS-reviewed — words are triaged into flashcards.
        items = []

    return {"due": items, "count": len(items)}


@router.post("/subjects/{subject_id}/modules/{module_id}/review")
async def submit_review(
    subject_id: str,
    module_id: str,
    body: SRSReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mod = await get_module(db, subject_id, module_id, current_user.id)
    bt = mod.block.block_type

    if bt != BlockType.FLASHCARD:
        raise HTTPException(status_code=400, detail="This module does not support SRS review")

    quality = max(0, min(5, body.quality))
    item = await _get_item(db, bt, body.item_id, mod.id)

    new_ef, new_interval, new_reps, next_review = compute_next_review(
        item.ease_factor, item.interval, item.repetitions, quality
    )
    item.ease_factor = new_ef
    item.interval = new_interval
    item.repetitions = new_reps
    item.next_review = next_review
    item.last_review = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(item)
    return item


# ── Vocab → Flashcard categorization ──────────────────────────────────────────

def _compose_flashcard_back(vocab: VocabItem) -> str:
    parts = [vocab.meaning]
    if vocab.pronunciation:
        parts.append(f"[{vocab.pronunciation}]")
    if vocab.example:
        parts.append(f"VD: {vocab.example}")
    return "\n".join(p for p in parts if p)


@router.post("/subjects/{subject_id}/modules/{module_id}/vocab/{item_id}/categorize")
async def categorize_vocab(
    subject_id: str,
    module_id: str,
    item_id: str,
    body: VocabCategorizeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Move a vocab word into the subject's Flashcard module under a category
    ("Cần học thêm" / "Đã nhớ"), then remove it from the vocabulary inbox.
    Dedupes by front: an existing card with the same word is re-categorized
    instead of duplicated."""
    mod = await get_module(db, subject_id, module_id, current_user.id)
    if mod.block.block_type != BlockType.VOCABULARY:
        raise HTTPException(status_code=400, detail="Module không phải VOCABULARY")

    vr = await db.execute(
        select(VocabItem).where(VocabItem.id == item_id, VocabItem.subject_mod_id == mod.id)
    )
    vocab = vr.scalar_one_or_none()
    if not vocab:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng")

    # Find the subject's FLASHCARD module (target store for both categories).
    fr = await db.execute(
        select(SubjectModule)
        .join(CatalogBlock, SubjectModule.block_id == CatalogBlock.id)
        .where(
            SubjectModule.subject_id == subject_id,
            CatalogBlock.block_type == BlockType.FLASHCARD,
        )
        .order_by(SubjectModule.order)
    )
    fc_mod = fr.scalars().first()
    if not fc_mod:
        raise HTTPException(status_code=400, detail="Môn học chưa có module Flashcard để lưu từ")

    front = vocab.word.strip()
    back = _compose_flashcard_back(vocab)

    # Dedup by front (case-insensitive) within the flashcard module.
    er = await db.execute(
        select(FlashCard).where(
            FlashCard.subject_mod_id == fc_mod.id,
            func.lower(FlashCard.front) == front.lower(),
        )
    )
    existing = er.scalars().first()
    deduped = existing is not None
    if existing:
        existing.category = body.category
        existing.back = back
        flashcard = existing
    else:
        flashcard = FlashCard(
            id=str(uuid.uuid4()),
            subject_mod_id=fc_mod.id,
            front=front,
            back=back,
            category=body.category,
        )
        db.add(flashcard)

    await db.delete(vocab)
    await db.commit()
    await db.refresh(flashcard)
    return {
        "flashcard_id": flashcard.id,
        "flashcard_module_id": fc_mod.id,
        "category": body.category.value,
        "deduped": deduped,
    }
