import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.learn_v2 import CatalogBlock, LearningTemplate, Subject, SubjectModule, TemplateBlock
from app.models.user import User
from app.schemas.learn_v2 import TemplateCreate, TemplateOut, TemplateUpdate
from app.services.catalog_service import suggest_template_blocks

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateSuggestRequest(BaseModel):
    query: str


class TemplateSuggestResponse(BaseModel):
    block_ids: list[str]


@router.post("/suggest", response_model=TemplateSuggestResponse)
async def suggest_blocks_for_template(
    body: TemplateSuggestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CatalogBlock).where(
            (CatalogBlock.user_id == current_user.id) | (CatalogBlock.is_system == True)
        )
    )
    blocks = result.scalars().all()
    available = [{"id": b.id, "name": b.name, "block_type": b.block_type} for b in blocks]
    suggested_ids = await suggest_template_blocks(body.query, available)
    # Validate returned IDs
    valid_ids = {b.id for b in blocks}
    return TemplateSuggestResponse(block_ids=[i for i in suggested_ids if i in valid_ids])

_LOAD_FULL = selectinload(LearningTemplate.template_blocks).selectinload(TemplateBlock.block)


@router.get("", response_model=list[TemplateOut])
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningTemplate)
        .where(LearningTemplate.user_id == current_user.id)
        .options(_LOAD_FULL)
        .order_by(LearningTemplate.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    body: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = LearningTemplate(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=body.name,
        description=body.description,
    )
    db.add(template)
    await db.flush()

    for i, block_id in enumerate(body.block_ids):
        block = await db.get(CatalogBlock, block_id)
        if not block:
            raise HTTPException(status_code=404, detail=f"Block {block_id} not found")
        db.add(TemplateBlock(id=str(uuid.uuid4()), template_id=template.id, block_id=block_id, order=i))

    await db.commit()

    result = await db.execute(
        select(LearningTemplate).where(LearningTemplate.id == template.id).options(_LOAD_FULL)
    )
    return result.scalar_one()


@router.put("/{template_id}", response_model=TemplateOut)
async def update_template(
    template_id: str,
    body: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningTemplate)
        .where(LearningTemplate.id == template_id, LearningTemplate.user_id == current_user.id)
        .options(_LOAD_FULL)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if body.name is not None:
        template.name = body.name
    if body.description is not None:
        template.description = body.description

    if body.block_ids is not None:
        existing_block_ids = {tb.block_id for tb in template.template_blocks}
        new_block_ids = set(body.block_ids)

        for tb in list(template.template_blocks):
            await db.delete(tb)
        await db.flush()
        for i, block_id in enumerate(body.block_ids):
            block = await db.get(CatalogBlock, block_id)
            if not block:
                raise HTTPException(status_code=404, detail=f"Block {block_id} not found")
            db.add(TemplateBlock(id=str(uuid.uuid4()), template_id=template.id, block_id=block_id, order=i))

        # Sync new blocks to all subjects using this template
        added_block_ids = new_block_ids - existing_block_ids
        if added_block_ids:
            subjects_result = await db.execute(
                select(Subject).where(Subject.template_id == template_id)
            )
            subjects = subjects_result.scalars().all()
            for subject in subjects:
                mods_result = await db.execute(
                    select(SubjectModule).where(SubjectModule.subject_id == subject.id)
                )
                existing_mod_block_ids = {m.block_id for m in mods_result.scalars().all()}
                max_order_result = await db.execute(
                    select(SubjectModule.order)
                    .where(SubjectModule.subject_id == subject.id)
                    .order_by(SubjectModule.order.desc())
                )
                max_order = max_order_result.scalar() or 0
                for block_id in body.block_ids:
                    if block_id in added_block_ids and block_id not in existing_mod_block_ids:
                        max_order += 1
                        db.add(SubjectModule(
                            id=str(uuid.uuid4()),
                            subject_id=subject.id,
                            block_id=block_id,
                            order=max_order,
                            config={},
                        ))

    await db.commit()

    result = await db.execute(
        select(LearningTemplate).where(LearningTemplate.id == template_id).options(_LOAD_FULL)
    )
    return result.scalar_one()


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningTemplate).where(
            LearningTemplate.id == template_id, LearningTemplate.user_id == current_user.id
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()
