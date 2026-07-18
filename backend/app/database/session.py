from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

settings = get_settings()

url = make_url(settings.effective_database_url)

# Remove parameters that asyncpg doesn't accept directly
url = url.difference_update_query(["sslmode", "channel_binding"])

engine = create_async_engine(
    url,
    echo=settings.sqlalchemy_echo,
    future=True,
    pool_pre_ping=not settings.is_sqlite,
    connect_args={
        "ssl": True,
    },
)

SessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def ping_database() -> bool:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return True


async def dispose_engine() -> None:
    await engine.dispose()