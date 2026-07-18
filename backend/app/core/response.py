from datetime import UTC, datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationMeta(BaseModel):
    total: int
    skip: int
    limit: int


class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    skip: int
    limit: int


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "OK"
    data: T | None = None
    pagination: PaginationMeta | None = None
    errors: list[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


def build_response(
    data: T | None = None,
    *,
    message: str = "OK",
    pagination: PaginationMeta | None = None,
    errors: list[str] | None = None,
) -> APIResponse[T]:
    return APIResponse(
        success=not bool(errors),
        message=message,
        data=data,
        pagination=pagination,
        errors=errors or [],
    )
