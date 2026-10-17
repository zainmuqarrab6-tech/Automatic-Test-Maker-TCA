import os
import json
import base64
import hmac
import hashlib
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer(auto_error=False)

# -------------------------------------------------------------
# Password Hashing & Verification (PBKDF2 HMAC-SHA256)
# -------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash password securely using PBKDF2 HMAC-SHA256 with random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    )
    return f"{salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored salt$hash."""
    if not hashed_password or "$" not in hashed_password:
        return False
    try:
        salt, stored_hash = hashed_password.split("$", 1)
        key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000
        )
        return hmac.compare_digest(key.hex(), stored_hash)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False


# -------------------------------------------------------------
# JWT Encoding & Verification (HMAC-SHA256 RFC 7519)
# -------------------------------------------------------------
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed HS256 JWT string."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp())
    })

    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(to_encode, separators=(",", ":")).encode("utf-8"))

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a signed HS256 JWT string."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts

        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        provided_sig = _b64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, provided_sig):
            return None

        payload_bytes = _b64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Verify expiration
        exp = payload.get("exp")
        if exp is not None:
            now_ts = int(datetime.now(timezone.utc).timestamp())
            if now_ts > exp:
                return None

        return payload
    except Exception as exc:
        logger.debug(f"JWT decode failed: {exc}")
        return None


# -------------------------------------------------------------
# FastAPI Dependencies & RBAC
# -------------------------------------------------------------
def get_current_user_optional(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieve user if valid Bearer token provided, otherwise return None."""
    if not auth_header or not auth_header.credentials:
        return None

    token = auth_header.credentials
    payload = decode_access_token(token)
    if not payload:
        return None

    user_email = payload.get("sub")
    if not user_email:
        return None

    user = db.query(User).filter(User.email == user_email).first()
    return user


def require_current_user(
    user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    """Enforce that user is authenticated and active."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token or log in.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )
    return user


def require_admin(
    user: User = Depends(require_current_user)
) -> User:
    """Enforce that the authenticated user has the 'admin' role."""
    if user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: This action is restricted to Administrators only."
        )
    return user


def require_teacher_or_admin(
    user: User = Depends(require_current_user)
) -> User:
    """Enforce that the user has either teacher or admin role."""
    if user.role.lower() not in {"teacher", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Valid Teacher or Admin role required."
        )
    return user


# -------------------------------------------------------------
# Default User Seeder
# -------------------------------------------------------------
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@tca.edu.pk")
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123")
DEFAULT_TEACHER_EMAIL = os.getenv("TEACHER_EMAIL", "teacher@tca.edu.pk")
DEFAULT_TEACHER_PASSWORD = os.getenv("TEACHER_PASSWORD", "Teacher@123")

def seed_default_users(db: Session):
    """Seed default Administrator and Teacher accounts if they do not exist."""
    try:
        # Check Admin
        admin = db.query(User).filter(User.email == DEFAULT_ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                email=DEFAULT_ADMIN_EMAIL,
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                full_name="Academic Administrator",
                role="admin",
                is_active=True
            )
            db.add(admin)
            logger.info(f"Seeded default Admin account: {DEFAULT_ADMIN_EMAIL}")

        # Check Teacher
        teacher = db.query(User).filter(User.email == DEFAULT_TEACHER_EMAIL).first()
        if not teacher:
            teacher = User(
                email=DEFAULT_TEACHER_EMAIL,
                password_hash=hash_password(DEFAULT_TEACHER_PASSWORD),
                full_name="Senior Faculty Teacher",
                role="teacher",
                is_active=True
            )
            db.add(teacher)
            logger.info(f"Seeded default Teacher account: {DEFAULT_TEACHER_EMAIL}")

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding default users: {e}")
