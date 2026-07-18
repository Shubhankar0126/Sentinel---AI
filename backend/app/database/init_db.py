import app.models  # noqa: F401

from app.core.config import get_settings
from app.database.base import Base
from app.database.session import engine


async def initialize_schema() -> None:
    settings = get_settings()
    if not settings.auto_create_schema:
        return
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
