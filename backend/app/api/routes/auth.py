"""
Authentication API routes: register, login, Google OAuth, profile.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_session
from app.core.security import (
    create_access_token,
    hash_password,
    verify_google_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_token_response(user: User) -> TokenResponse:
    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse)
async def register(
    request: RegisterRequest,
    session: AsyncSession = Depends(get_session),
):
    """Register a new user with email and password."""
    result = await session.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        display_name=request.display_name,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return _make_token_response(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    session: AsyncSession = Depends(get_session),
):
    """Login with email and password."""
    result = await session.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return _make_token_response(user)


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    request: GoogleAuthRequest,
    session: AsyncSession = Depends(get_session),
):
    """Authenticate with a Google id_token. Creates or links user as needed."""
    google_info = await verify_google_token(request.id_token)
    email = google_info["email"]
    google_id = google_info["sub"]
    name = google_info.get("name", "")

    # Try find by google_id first
    result = await session.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        # Try find by email and link google_id
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.google_id = google_id
            if not user.display_name and name:
                user.display_name = name
            user.updated_at = datetime.now(timezone.utc)
        else:
            # Create new user
            user = User(
                email=email,
                google_id=google_id,
                display_name=name or None,
            )
            session.add(user)

    await session.commit()
    await session.refresh(user)

    return _make_token_response(user)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    updates: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update current user profile (display_name, max_hr)."""
    if updates.display_name is not None:
        current_user.display_name = updates.display_name
    if updates.max_hr is not None:
        current_user.max_hr = updates.max_hr

    current_user.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(current_user)

    return UserResponse.model_validate(current_user)
