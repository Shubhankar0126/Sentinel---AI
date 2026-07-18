from collections.abc import Sequence
from typing import Any, Generic, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    def __init__(self, session: AsyncSession, model: type[ModelT]):
        self.session = session
        self.model = model

    @staticmethod
    def _coerce_enum_filter(column, value: Any) -> Any:
        column_type = column.property.columns[0].type
        enum_class = getattr(column_type, "enum_class", None)
        if enum_class is None:
            return value
        if isinstance(value, (list, tuple, set)):
            return [
                item
                if isinstance(item, enum_class)
                else enum_class(item)
                if isinstance(item, str)
                else item
                for item in value
            ]
        if isinstance(value, str):
            return enum_class(value)
        return value

    def _apply_filters(self, stmt: Select[tuple[ModelT]], filters: dict[str, Any] | None = None):
        if hasattr(self.model, "deleted_at"):
            stmt = stmt.where(getattr(self.model, "deleted_at").is_(None))
        for field, value in (filters or {}).items():
            if value is None:
                continue
            column = getattr(self.model, field)
            value = self._coerce_enum_filter(column, value)
            if isinstance(value, (list, tuple, set)):
                stmt = stmt.where(column.in_(list(value)))
            else:
                stmt = stmt.where(column == value)
        return stmt

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 25,
        filters: dict[str, Any] | None = None,
    ) -> Sequence[ModelT]:
        stmt = self._apply_filters(select(self.model), filters)
        stmt = stmt.order_by(getattr(self.model, "created_at", getattr(self.model, "id"))).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def count(self, *, filters: dict[str, Any] | None = None) -> int:
        stmt = self._apply_filters(select(func.count()).select_from(self.model), filters)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def get(self, item_id: str) -> ModelT | None:
        stmt = self._apply_filters(select(self.model).where(self.model.id == item_id))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, payload: dict[str, Any]) -> ModelT:
        instance = self.model(**payload)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update(self, instance: ModelT, payload: dict[str, Any]) -> ModelT:
        for field, value in payload.items():
            setattr(instance, field, value)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def delete(self, instance: ModelT) -> None:
        if hasattr(self.model, "deleted_at"):
            setattr(instance, "deleted_at", func.now())
            await self.session.flush()
            return
        await self.session.delete(instance)
        await self.session.flush()
