"""
Reset all data for a specific user (keep account, wipe all data across every table).
Usage:
    python reset_user.py <email>
    python reset_user.py <email> --delete-account
"""

import asyncio
import sys

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.learn_v2 import CatalogBlock, LearningTemplate, Subject
from app.models.task import AISummary, Goal, Streak, Task
from app.models.user import User, UserProfile

engine = create_async_engine(settings.db_url_clean, echo=False, connect_args={"ssl": settings.db_ssl})
Session = async_sessionmaker(engine, expire_on_commit=False)

DELETE_ACCOUNT = "--delete-account" in sys.argv
YES = "--yes" in sys.argv or "-y" in sys.argv
EMAIL = next((a for a in sys.argv[1:] if not a.startswith("--")), None)


async def main():
    if not EMAIL:
        print("Usage: python reset_user.py <email> [--delete-account]")
        sys.exit(1)

    async with Session() as db:
        result = await db.execute(select(User).where(User.email == EMAIL))
        user = result.scalar_one_or_none()
        if not user:
            print(f"User not found: {EMAIL}")
            sys.exit(1)

        uid = user.id
        print(f"\nUser  : {user.name} <{user.email}>")
        print(f"ID    : {uid}")
        action = "DELETE ACCOUNT + all data" if DELETE_ACCOUNT else "reset data (keep account)"
        print(f"Action: {action}")

        if YES:
            print("\nConfirm? [y/N] y (auto)")
        else:
            confirm = input("\nConfirm? [y/N] ").strip().lower()
            if confirm != "y":
                print("Aborted.")
                sys.exit(0)

        # ── Learn v2: subjects (CASCADE → subject_modules → flashcards/vocab_items/notes/code_snippets/quizzes) ──
        await db.execute(delete(Subject).where(Subject.user_id == uid))

        # ── Learn v2: learning_templates (CASCADE → template_blocks) ──
        await db.execute(delete(LearningTemplate).where(LearningTemplate.user_id == uid))

        # ── Learn v2: catalog_blocks (user-specific only) ──
        await db.execute(delete(CatalogBlock).where(CatalogBlock.user_id == uid))

        # ── Task module: ai_summaries / tasks (CASCADE → pinned_task_completions) / goals / streaks ──
        goal_ids = (await db.execute(
            select(Goal.id).where(Goal.user_id == uid)
        )).scalars().all()
        if goal_ids:
            await db.execute(delete(AISummary).where(AISummary.goal_id.in_(goal_ids)))

        await db.execute(delete(Task).where(Task.user_id == uid))
        await db.execute(delete(Goal).where(Goal.user_id == uid))
        await db.execute(delete(Streak).where(Streak.user_id == uid))

        if DELETE_ACCOUNT:
            await db.execute(delete(UserProfile).where(UserProfile.user_id == uid))
            await db.delete(user)
            print("\nAccount deleted.")
        else:
            print("\nAll data wiped. Account kept.")

        await db.commit()
        print("Done.")


asyncio.run(main())
