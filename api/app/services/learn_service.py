"""Shared helpers for the learning module routers."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.learn_v2 import Subject, SubjectModule


async def get_module(db: AsyncSession, subject_id: str, module_id: str, user_id: str) -> SubjectModule:
    """Fetch a SubjectModule owned by user_id, with its block eager-loaded. 404 if not found."""
    result = await db.execute(
        select(SubjectModule)
        .join(Subject, SubjectModule.subject_id == Subject.id)
        .where(
            SubjectModule.id == module_id,
            SubjectModule.subject_id == subject_id,
            Subject.user_id == user_id,
        )
        .options(selectinload(SubjectModule.block))
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    return module
