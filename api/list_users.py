import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.core.config import settings
from app.models.user import User

engine = create_async_engine(settings.database_url, echo=False, connect_args={"ssl": False})
Session = async_sessionmaker(engine)

async def main():
    async with Session() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        if not users:
            print("No users found.")
        for u in users:
            print(f"{u.email}  ({u.name})")

asyncio.run(main())
