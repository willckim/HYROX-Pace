"""
Async SQLite database setup for live race tracking.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = "sqlite+aiosqlite:///./hyroxpace.db"

engine = create_async_engine(DATABASE_URL, echo=False)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables at startup."""
    from app.models.live_race import TrackedRace, TrackedCompetitor, CompetitorSnapshot  # noqa: F401
    from app.models.user import User  # noqa: F401
    from app.models.wearable import WearableSample, RedlineAlert  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    """FastAPI dependency yielding an async session."""
    async with async_session_factory() as session:
        yield session
