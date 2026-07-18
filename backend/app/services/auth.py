from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    extract_subject,
    get_password_hash,
    verify_password,
)
from app.repositories.entities import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair
from app.schemas.domain import UserCreate


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repository = UserRepository(session)

    async def register(self, payload: RegisterRequest):
        existing = await self.user_repository.get_by_email(payload.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

        user = await self.user_repository.create(
            UserCreate(
                name=payload.name,
                email=str(payload.email),
                role=payload.role,
                plant_id=payload.plant_id,
                password=payload.password,
            ).model_dump(exclude={"password"})
            | {"password_hash": get_password_hash(payload.password)}
        )
        await self.session.commit()
        tokens = TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
        return user, tokens

    async def login(self, payload: LoginRequest):
        user = await self.user_repository.get_by_email(str(payload.email))
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
        tokens = TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
        return user, tokens

    async def refresh(self, refresh_token: str) -> TokenPair:
        subject = extract_subject(refresh_token, expected_type="refresh")
        user = await self.user_repository.get(subject)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")
        return TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def get_user_from_token(self, token: str):
        user_id = extract_subject(token)
        user = await self.user_repository.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.")
        return user
