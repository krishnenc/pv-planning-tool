from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_reset_token,
    get_reset_token_expiry,
    hash_password,
    verify_password,
)
from app.database import get_session
from app.models.user import PasswordResetToken, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)

router = APIRouter(tags=["auth"])


def _make_tokens(user_id: int) -> TokenResponse:
    subject = str(user_id)
    return TokenResponse(
        access_token=create_access_token(subject),
        refresh_token=create_refresh_token(subject),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegisterRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return _make_tokens(user.id)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLoginRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    return _make_tokens(user.id)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(body: ForgotPasswordRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        return ForgotPasswordResponse(
            message="If that email exists, a reset link has been sent.",
            reset_token=None,
        )

    # Invalidate any existing unused tokens for this user
    existing = await session.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,  # noqa: E712
        )
    )
    for old_token in existing.scalars().all():
        old_token.used = True

    token_value = generate_reset_token()
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token_value,
        expires_at=get_reset_token_expiry(),
    )
    session.add(reset_token)
    await session.commit()

    # TODO: in production, email this token instead of returning it
    return ForgotPasswordResponse(
        message="If that email exists, a reset link has been sent.",
        reset_token=token_value,
    )


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == body.token,
            PasswordResetToken.used == False,  # noqa: E712
        )
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if reset_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user_result = await session.execute(select(User).where(User.id == reset_token.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.hashed_password = hash_password(body.new_password)
    reset_token.used = True
    await session.commit()

    return {"message": "Password reset successful"}
