import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserLogin, UserOut, TokenOut, DemoUserOut
from app.auth import (
    verify_password,
    create_access_token,
    require_current_user,
    seed_default_users,
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_TEACHER_EMAIL,
    DEFAULT_TEACHER_PASSWORD
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user with email and password.
    Returns HS256 JWT access token and user details.
    """
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(email_clean)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    # Generate Token
    token_data = {
        "sub": user.email,
        "user_id": user.id,
        "role": user.role,
        "full_name": user.full_name
    }
    access_token = create_access_token(token_data)

    return TokenOut(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.get("/me", response_model=UserOut)
def get_current_user_profile(user: User = Depends(require_current_user)):
    """Retrieve details of the currently authenticated user."""
    return UserOut.model_validate(user)


@router.get("/demo-users", response_model=List[DemoUserOut])
def get_demo_users():
    """List pre-configured test users for role testing and development."""
    return [
        DemoUserOut(
            email=DEFAULT_ADMIN_EMAIL,
            role="admin",
            full_name="Academic Administrator",
            password_hint=DEFAULT_ADMIN_PASSWORD
        ),
        DemoUserOut(
            email=DEFAULT_TEACHER_EMAIL,
            role="teacher",
            full_name="Senior Faculty Teacher",
            password_hint=DEFAULT_TEACHER_PASSWORD
        )
    ]


@router.post("/seed", status_code=status.HTTP_200_OK)
def trigger_seed_users(db: Session = Depends(get_db)):
    """Seed or verify default Administrator and Teacher accounts."""
    seed_default_users(db)
    return {"message": "Default Admin and Teacher accounts successfully verified/seeded."}
