"""
Reset all data for a specific user (keep account, wipe goals/tasks/streaks).
Usage:
    python reset_user.py <email>
    python reset_user.py <email> --delete-account
"""

import asyncio
import sys

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.task import AISummary, Goal, Streak, Task
from app.models.user import User, UserProfile

engine = create_async_engine(settings.database_url, echo=False, connect_args={"ssl": False})
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

        print(f"\nUser  : {user.name} <{user.email}>")
        print(f"ID    : {user.id}")
        action = "DELETE ACCOUNT + all data" if DELETE_ACCOUNT else "reset data (keep account)"
        print(f"Action: {action}")
        if YES:
            print("\nConfirm? [y/N] y (auto)")
        else:
            confirm = input("\nConfirm? [y/N] ").strip().lower()
            if confirm != "y":
                print("Aborted.")
                sys.exit(0)

        # Count before
        goals_count = (await db.execute(select(Goal).where(Goal.user_id == user.id))).scalars().all()
        tasks_count = (await db.execute(select(Task).where(Task.user_id == user.id))).scalars().all()
        streaks_count = (await db.execute(select(Streak).where(Streak.user_id == user.id))).scalars().all()
        print(f"\nDeleting: {len(goals_count)} goals, {len(tasks_count)} tasks, {len(streaks_count)} streaks")

        # Delete ai_summaries (FK → goals)
        goal_ids = [g.id for g in goals_count]
        if goal_ids:
            await db.execute(delete(AISummary).where(AISummary.goal_id.in_(goal_ids)))

        # Delete tasks, goals, streaks
        await db.execute(delete(Task).where(Task.user_id == user.id))
        await db.execute(delete(Goal).where(Goal.user_id == user.id))
        await db.execute(delete(Streak).where(Streak.user_id == user.id))

        if DELETE_ACCOUNT:
            await db.execute(delete(UserProfile).where(UserProfile.user_id == user.id))
            await db.delete(user)
            print("Account deleted.")
        else:
            print("Data wiped. Account kept.")

        await db.commit()
        print("Done.")


asyncio.run(main())
