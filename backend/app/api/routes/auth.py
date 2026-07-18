from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.response import APIResponse, build_response
from app.database.session import get_db_session
from app.schemas.auth import LoginRequest, RefreshTokenRequest, RegisterRequest
from app.schemas.domain import UserRead
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=APIResponse[dict])
async def register(payload: RegisterRequest, session=Depends(get_db_session)):
    user, tokens = await AuthService(session).register(payload)
    return build_response(
        {"user": UserRead.model_validate(user).model_dump(mode="json"), "tokens": tokens.model_dump()},
        message="User registered successfully.",
    )


@router.post("/login", response_model=APIResponse[dict])
async def login(payload: LoginRequest, session=Depends(get_db_session)):
    user, tokens = await AuthService(session).login(payload)
    return build_response(
        {"user": UserRead.model_validate(user).model_dump(mode="json"), "tokens": tokens.model_dump()},
        message="Authentication successful.",
    )


@router.post("/refresh", response_model=APIResponse[dict])
async def refresh(payload: RefreshTokenRequest, session=Depends(get_db_session)):
    tokens = await AuthService(session).refresh(payload.refresh_token)
    return build_response(tokens.model_dump(), message="Token refreshed successfully.")


@router.get("/me", response_model=APIResponse[UserRead])
async def me(current_user=Depends(get_current_user)):
    return build_response(UserRead.model_validate(current_user), message="Current user retrieved successfully.")
