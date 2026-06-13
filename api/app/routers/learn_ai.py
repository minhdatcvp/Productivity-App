from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.learn_v2 import (
    BlockType,
    CatalogBlock,
    FlashCard,
    Note,
    Subject,
    SubjectModule,
    SubjectQuiz,
    QuizStatus,
    VocabItem,
)
from app.models.user import User
from app.schemas.learn_v2 import (
    AIConfigOut,
    AIConfigUpdate,
    AIConfirmRequest,
    AIGenerateResponse,
    AILookupVocabRequest,
    AILookupVocabResponse,
    AIQuizGenerateRequest,
    SubjectQuizOut,
    QuizSubmit,
)
from app.services import learning_ai_service
from app.services.learn_service import get_module

router = APIRouter(prefix="/learn/subjects", tags=["learn-ai"])


async def _get_subject_level(db: AsyncSession, subject_id: str) -> str | None:
    """The learner's assessed proficiency level for a subject, stored on its
    EXERCISE (Bài tập) module config by the assessment grader. Used to
    calibrate AI-generated content difficulty."""
    r = await db.execute(
        select(SubjectModule)
        .join(CatalogBlock, SubjectModule.block_id == CatalogBlock.id)
        .where(
            SubjectModule.subject_id == subject_id,
            CatalogBlock.block_type == BlockType.EXERCISE,
        )
        .order_by(SubjectModule.order)
    )
    ex_mod = r.scalars().first()
    if not ex_mod:
        return None
    return (ex_mod.config or {}).get("level") or None


# ── AI Config ─────────────────────────────────────────────────────────────────

@router.get("/{subject_id}/modules/{module_id}/ai/config", response_model=AIConfigOut)
async def get_ai_config(
    subject_id: str,
    module_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    module = await get_module(db, subject_id, module_id, current_user.id)
    config = module.config or {}
    return AIConfigOut(
        ai_enabled=config.get("ai_enabled", False),
        daily_count=config.get("daily_count", 10),
        topics=config.get("topics", []),
        difficulty=config.get("difficulty", "intermediate"),
        last_generated_at=config.get("last_generated_at"),
        level=config.get("level"),
        level_label=config.get("level_label"),
        level_assessed_at=config.get("level_assessed_at"),
        assess_cadence=config.get("assess_cadence", "monthly"),
    )


@router.patch("/{subject_id}/modules/{module_id}/ai/config", response_model=AIConfigOut)
async def update_ai_config(
    subject_id: str,
    module_id: str,
    body: AIConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    module = await get_module(db, subject_id, module_id, current_user.id)
    config = dict(module.config or {})
    updates = body.model_dump(exclude_none=True)
    config.update(updates)
    module.config = config
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return AIConfigOut(
        ai_enabled=config.get("ai_enabled", False),
        daily_count=config.get("daily_count", 10),
        topics=config.get("topics", []),
        difficulty=config.get("difficulty", "intermediate"),
        last_generated_at=config.get("last_generated_at"),
        level=config.get("level"),
        level_label=config.get("level_label"),
        level_assessed_at=config.get("level_assessed_at"),
        assess_cadence=config.get("assess_cadence", "monthly"),
    )


# ── AI Generate ───────────────────────────────────────────────────────────────

@router.post("/{subject_id}/modules/{module_id}/ai/generate", response_model=AIGenerateResponse)
async def ai_generate(
    subject_id: str,
    module_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    module = await get_module(db, subject_id, module_id, current_user.id)
    block_type: BlockType = module.block.block_type
    config = module.config or {}

    if block_type == BlockType.QUIZ:
        raise HTTPException(
            status_code=400,
            detail="QUIZ block kullanır ai/quiz endpoint'ini",
        )

    # Subject name
    subj_result = await db.execute(
        select(Subject).where(Subject.id == subject_id)
    )
    subject = subj_result.scalar_one_or_none()
    subject_name = subject.name if subject else subject_id

    topics: list[str] = config.get("topics", [])
    count: int = config.get("daily_count", 10)
    level = await _get_subject_level(db, subject_id)

    if block_type == BlockType.VOCABULARY:
        # Gather existing words — from the vocab inbox AND from flashcards the
        # user already triaged (categorized words leave vocab and become cards),
        # so the AI never regenerates a word that's already known.
        vocab_result = await db.execute(
            select(VocabItem.word).where(VocabItem.subject_mod_id == module_id)
        )
        existing_words = [r for r in vocab_result.scalars().all()]
        fc_fronts_result = await db.execute(
            select(FlashCard.front)
            .join(SubjectModule, FlashCard.subject_mod_id == SubjectModule.id)
            .where(SubjectModule.subject_id == subject_id)
        )
        existing_words.extend(fc_fronts_result.scalars().all())
        items = await learning_ai_service.generate_vocab_items(
            count=count,
            topics=topics,
            subject_name=subject_name,
            existing_words=existing_words,
            level=level,
        )
        return AIGenerateResponse(items=items, block_type=block_type.value)

    elif block_type == BlockType.FLASHCARD:
        fc_result = await db.execute(
            select(FlashCard.front).where(FlashCard.subject_mod_id == module_id)
        )
        existing_fronts = [r for r in fc_result.scalars().all()]
        items = await learning_ai_service.generate_flashcards(
            count=count,
            topics=topics,
            subject_name=subject_name,
            existing_fronts=existing_fronts,
            level=level,
        )
        return AIGenerateResponse(items=items, block_type=block_type.value)

    elif block_type == BlockType.NOTES:
        topic = topics[0] if topics else subject_name
        note = await learning_ai_service.generate_note(
            topic=topic, subject_name=subject_name, level=level
        )
        return AIGenerateResponse(items=[note], block_type=block_type.value)

    elif block_type == BlockType.EXERCISE:
        items = await learning_ai_service.generate_exercises(
            topics=topics, subject_name=subject_name, count=count
        )
        return AIGenerateResponse(items=items, block_type=block_type.value)

    else:
        # CODE_SNIPPET and others — not AI-generated
        raise HTTPException(status_code=400, detail=f"Block type {block_type} không hỗ trợ AI generate")


# ── AI Lookup Vocab ───────────────────────────────────────────────────────────

@router.post("/{subject_id}/modules/{module_id}/ai/lookup-vocab", response_model=AILookupVocabResponse)
async def ai_lookup_vocab(
    subject_id: str,
    module_id: str,
    body: AILookupVocabRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    module = await get_module(db, subject_id, module_id, current_user.id)
    if module.block.block_type != BlockType.VOCABULARY:
        raise HTTPException(status_code=400, detail="Module không phải VOCABULARY")

    word = body.word.strip()
    if not word:
        raise HTTPException(status_code=400, detail="Từ trống")

    subj_result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = subj_result.scalar_one_or_none()
    subject_name = subject.name if subject else subject_id

    data = await learning_ai_service.lookup_vocab_word(word=word, subject_name=subject_name)
    return AILookupVocabResponse(
        word=data.get("word", word),
        meaning=data.get("meaning", ""),
        pronunciation=data.get("pronunciation", "") or "",
        example=data.get("example", "") or "",
    )


# ── AI Confirm ────────────────────────────────────────────────────────────────

@router.post("/{subject_id}/modules/{module_id}/ai/confirm")
async def ai_confirm(
    subject_id: str,
    module_id: str,
    body: AIConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    module = await get_module(db, subject_id, module_id, current_user.id)
    block_type: BlockType = module.block.block_type
    created = 0

    for item in body.items:
        if block_type == BlockType.VOCABULARY:
            db.add(VocabItem(
                subject_mod_id=module_id,
                word=item.get("word", ""),
                meaning=item.get("meaning", ""),
                pronunciation=item.get("pronunciation"),
                example=item.get("example"),
            ))
            created += 1
        elif block_type == BlockType.FLASHCARD:
            db.add(FlashCard(
                subject_mod_id=module_id,
                front=item.get("front", ""),
                back=item.get("back", ""),
            ))
            created += 1
        elif block_type == BlockType.NOTES:
            db.add(Note(
                subject_mod_id=module_id,
                title=item.get("title", ""),
                content=item.get("content", ""),
                tags=item.get("tags", []),
            ))
            created += 1
        elif block_type == BlockType.EXERCISE:
            # Exercise maps to Note for now (same title/content shape)
            db.add(Note(
                subject_mod_id=module_id,
                title=item.get("title", ""),
                content=item.get("content", ""),
                tags=item.get("tags", []),
            ))
            created += 1

    # Update last_generated_at
    config = dict(module.config or {})
    config["last_generated_at"] = datetime.now(timezone.utc).isoformat()
    module.config = config
    db.add(module)

    await db.commit()
    return {"created": created}


# ── AI Quiz ───────────────────────────────────────────────────────────────────

@router.post("/{subject_id}/modules/{module_id}/ai/quiz", response_model=SubjectQuizOut)
async def ai_quiz(
    subject_id: str,
    module_id: str,
    body: AIQuizGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mod = await get_module(db, subject_id, module_id, current_user.id)

    # Subject name
    subj_result = await db.execute(
        select(Subject).where(Subject.id == subject_id)
    )
    subject = subj_result.scalar_one_or_none()
    subject_name = subject.name if subject else subject_id

    # EXERCISE module = proficiency assessment ("Bài tập"): a broad level-test,
    # not tied to the subject's existing content.
    if mod.block.block_type == BlockType.EXERCISE:
        questions = await learning_ai_service.generate_assessment_questions(
            subject_name=subject_name,
            count=max(body.count, 12),
        )
        quiz = SubjectQuiz(
            subject_mod_id=module_id,
            questions={"items": questions},
            status=QuizStatus.PENDING,
        )
        db.add(quiz)
        await db.commit()
        await db.refresh(quiz)
        return quiz

    # Gather ALL modules of this subject
    mods_result = await db.execute(
        select(SubjectModule.id).where(SubjectModule.subject_id == subject_id)
    )
    all_mod_ids = [r for r in mods_result.scalars().all()]

    if not all_mod_ids:
        raise HTTPException(status_code=400, detail="Chủ đề chưa có nội dung để tạo quiz")

    # Collect vocab (limit 30)
    vocab_result = await db.execute(
        select(VocabItem)
        .where(VocabItem.subject_mod_id.in_(all_mod_ids))
        .limit(30)
    )
    vocab_list = [
        {"word": v.word, "meaning": v.meaning, "example": v.example}
        for v in vocab_result.scalars().all()
    ]

    # Collect flashcards (limit 20)
    fc_result = await db.execute(
        select(FlashCard)
        .where(FlashCard.subject_mod_id.in_(all_mod_ids))
        .limit(20)
    )
    fc_list = [
        {"front": f.front, "back": f.back}
        for f in fc_result.scalars().all()
    ]

    # Collect notes (limit 10)
    notes_result = await db.execute(
        select(Note)
        .where(Note.subject_mod_id.in_(all_mod_ids))
        .limit(10)
    )
    notes_list = [
        {"title": n.title, "content": n.content[:500]}
        for n in notes_result.scalars().all()
    ]

    if not vocab_list and not fc_list and not notes_list:
        raise HTTPException(status_code=400, detail="Chủ đề chưa có nội dung để tạo quiz")

    context_dict = {
        "vocab": vocab_list,
        "flashcards": fc_list,
        "notes": notes_list,
    }

    questions = await learning_ai_service.generate_quiz_questions(
        subject_name=subject_name,
        context_dict=context_dict,
        count=body.count,
    )

    quiz = SubjectQuiz(
        subject_mod_id=module_id,
        questions={"items": questions},
        status=QuizStatus.PENDING,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return quiz


# ── List Quizzes ──────────────────────────────────────────────────────────────

@router.get("/{subject_id}/modules/{module_id}/quizzes", response_model=list[SubjectQuizOut])
async def list_quizzes(
    subject_id: str,
    module_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_module(db, subject_id, module_id, current_user.id)
    result = await db.execute(
        select(SubjectQuiz)
        .where(SubjectQuiz.subject_mod_id == module_id)
        .order_by(SubjectQuiz.created_at.desc())
    )
    return result.scalars().all()


# ── Submit Quiz ───────────────────────────────────────────────────────────────

@router.post("/{subject_id}/modules/{module_id}/quizzes/{quiz_id}/submit", response_model=SubjectQuizOut)
async def submit_quiz(
    subject_id: str,
    module_id: str,
    quiz_id: str,
    body: QuizSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mod = await get_module(db, subject_id, module_id, current_user.id)

    quiz_result = await db.execute(
        select(SubjectQuiz).where(
            SubjectQuiz.id == quiz_id,
            SubjectQuiz.subject_mod_id == module_id,
        )
    )
    quiz = quiz_result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.status == QuizStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Quiz đã được nộp")

    # Subject name
    subj_result = await db.execute(
        select(Subject).where(Subject.id == subject_id)
    )
    subject = subj_result.scalar_one_or_none()
    subject_name = subject.name if subject else subject_id

    q_data = quiz.questions or {}
    questions = q_data.get("items", []) if isinstance(q_data, dict) else q_data if isinstance(q_data, list) else []

    is_assessment = mod.block.block_type == BlockType.EXERCISE
    if is_assessment:
        feedback = await learning_ai_service.evaluate_assessment(
            subject_name=subject_name,
            questions=questions,
            user_answers=body.answers,
        )
        # Persist the assessed level on the EXERCISE module so AI content
        # generation across the subject calibrates to it.
        new_config = dict(mod.config or {})
        if feedback.get("level"):
            new_config["level"] = feedback["level"]
            new_config["level_label"] = feedback.get("level_label", "")
            new_config["level_assessed_at"] = datetime.now(timezone.utc).isoformat()
            mod.config = new_config
            db.add(mod)
    else:
        feedback = await learning_ai_service.evaluate_quiz(
            subject_name=subject_name,
            questions=questions,
            user_answers=body.answers,
        )

    # JSONB mutation — assign new dict, not mutate in place
    answers_dict = dict(body.answers)
    quiz.answers = answers_dict
    quiz.score = feedback["score"]
    quiz.ai_feedback = feedback
    quiz.status = QuizStatus.COMPLETED

    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return quiz
