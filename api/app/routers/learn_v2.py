import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.learn_v2 import (
    BlockType, CatalogBlock, CodeSnippet, FlashCard, LearningTemplate,
    Note, Subject, SubjectModule, SubjectQuiz, TemplateBlock, VocabItem,
)
from app.models.user import User
from app.schemas.learn_v2 import (
    CodeSnippetCreate, CodeSnippetOut, CodeSnippetUpdate,
    FlashCardCreate, FlashCardOut, FlashCardUpdate,
    NoteCreate, NoteOut, NoteUpdate,
    QuizSubmit, SRSReviewRequest,
    SubjectCreate, SubjectOut,
    VocabItemCreate, VocabItemOut, VocabItemUpdate,
)
from app.services.learn_service import get_module
from app.services.srs_service import compute_next_review

router = APIRouter(prefix="/learn", tags=["learn"])

_SUBJECT_OPTS = selectinload(Subject.modules).selectinload(SubjectModule.block)


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
        item = FlashCard(id=item_id, subject_mod_id=mod.id, front=parsed.front, back=parsed.back)
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
        r = await db.execute(
            select(FlashCard).where(FlashCard.subject_mod_id == mod.id, FlashCard.next_review <= now)
        )
        items = [{"type": "flashcard", "item": i} for i in r.scalars().all()]
    elif bt == BlockType.VOCABULARY:
        r = await db.execute(
            select(VocabItem).where(VocabItem.subject_mod_id == mod.id, VocabItem.next_review <= now)
        )
        items = [{"type": "vocab", "item": i} for i in r.scalars().all()]
    else:
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

    if bt not in (BlockType.FLASHCARD, BlockType.VOCABULARY):
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
