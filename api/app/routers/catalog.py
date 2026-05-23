import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.learn_v2 import CatalogBlock, SubjectModule, TemplateBlock
from app.models.user import User
from app.schemas.learn_v2 import (
    BlockSuggestion,
    CatalogBlockCreate,
    CatalogBlockOut,
    SuggestCatalogRequest,
    SuggestCatalogResponse,
)
from app.services.catalog_service import suggest_catalog_blocks

router = APIRouter(prefix="/settings/catalog", tags=["catalog"])


@router.get("", response_model=list[CatalogBlockOut])
async def list_catalog_blocks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CatalogBlock).where(
            (CatalogBlock.user_id == current_user.id) | (CatalogBlock.is_system == True)
        ).order_by(CatalogBlock.is_system.desc(), CatalogBlock.created_at)
    )
    return result.scalars().all()


@router.post("/suggest", response_model=SuggestCatalogResponse)
async def suggest_blocks(
    body: SuggestCatalogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CatalogBlock).where(
            (CatalogBlock.user_id == current_user.id) | (CatalogBlock.is_system == True)
        )
    )
    existing = [b.name for b in result.scalars().all()]

    raw = await suggest_catalog_blocks(body.query, existing)

    suggestions = []
    for item in raw:
        name = item.get("name", "")
        is_dup = name in existing
        suggestions.append(BlockSuggestion(
            name=name,
            block_type=item.get("block_type", "NOTES"),
            description=item.get("description", ""),
            icon=item.get("icon", "square"),
            is_duplicate=is_dup,
        ))

    return SuggestCatalogResponse(suggestions=suggestions)


@router.post("", response_model=list[CatalogBlockOut], status_code=status.HTTP_201_CREATED)
async def create_catalog_blocks(
    body: list[CatalogBlockCreate],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    created = []
    for item in body:
        existing = await db.execute(
            select(CatalogBlock).where(
                CatalogBlock.user_id == current_user.id,
                CatalogBlock.name == item.name,
            )
        )
        if existing.scalar_one_or_none():
            continue
        block = CatalogBlock(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            name=item.name,
            description=item.description,
            icon=item.icon,
            block_type=item.block_type,
            is_system=False,
        )
        db.add(block)
        created.append(block)
    await db.commit()
    for b in created:
        await db.refresh(b)
    return created


@router.delete("/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_catalog_block(
    block_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CatalogBlock).where(CatalogBlock.id == block_id)
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    if block.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system block")
    if block.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    # Delete referencing rows first to avoid FK violations
    tbs = await db.execute(select(TemplateBlock).where(TemplateBlock.block_id == block_id))
    for tb in tbs.scalars().all():
        await db.delete(tb)

    sms = await db.execute(select(SubjectModule).where(SubjectModule.block_id == block_id))
    for sm in sms.scalars().all():
        await db.delete(sm)

    await db.flush()
    await db.delete(block)
    await db.commit()
