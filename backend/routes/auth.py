from fastapi import APIRouter, HTTPException, Depends, Header, Request
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address
import jwt
import os
import secrets
import logging

from utils.email import send_password_reset_email

router = APIRouter()
logger = logging.getLogger(__name__)

# Rate limiter for auth endpoints - with OPTIONS exemption for CORS preflight
def get_remote_address_skip_options(request: Request) -> str:
    """Get remote address but skip rate limiting for OPTIONS (CORS preflight)"""
    if request.method == "OPTIONS":
        return ""  # Empty key skips rate limiting
    return get_remote_address(request)

limiter = Limiter(key_func=get_remote_address_skip_options)

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Use environment-specific JWT secret
SECRET_KEY = os.getenv("JWT_SECRET", "tailorstailor-secret-key-change-in-production")
if SECRET_KEY == "tailorstailor-secret-key-change-in-production":
    logger.warning("⚠️  Using default JWT secret! Set JWT_SECRET environment variable in production.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Failed login tracking settings
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, remember_me: bool = False):
    to_encode = data.copy()
    # Extended expiry (30 days) for "Remember Me", otherwise standard 7 days
    expire_days = 30 if remember_me else ACCESS_TOKEN_EXPIRE_DAYS
    expire = datetime.now(timezone.utc) + timedelta(days=expire_days)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ===========================================
# FAILED LOGIN TRACKING
# ===========================================
async def check_login_lockout(email: str, client_ip: str) -> bool:
    """Check if user or IP is locked out due to failed attempts"""
    lockout_threshold = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_DURATION_MINUTES)
    
    # Check by email
    email_attempts = await db.failed_logins.count_documents({
        "email": email,
        "timestamp": {"$gte": lockout_threshold}
    })
    
    # Check by IP
    ip_attempts = await db.failed_logins.count_documents({
        "ip_address": client_ip,
        "timestamp": {"$gte": lockout_threshold}
    })
    
    return email_attempts >= MAX_FAILED_ATTEMPTS or ip_attempts >= MAX_FAILED_ATTEMPTS * 2


async def record_failed_login(email: str, client_ip: str, reason: str):
    """Record a failed login attempt"""
    await db.failed_logins.insert_one({
        "email": email,
        "ip_address": client_ip,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc)
    })
    logger.warning(f"Failed login attempt for {email} from IP {client_ip}: {reason}")


async def clear_failed_logins(email: str):
    """Clear failed login attempts on successful login"""
    await db.failed_logins.delete_many({"email": email})


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxies"""
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def get_current_user(token: str):
    try:
        # Handle Bearer token format
        if token.startswith("Bearer "):
            token = token[7:]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_admin(authorization: str = None):
    from fastapi import Header
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(authorization)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return user


@router.post("/register")
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = {
        "email": user.email,
        "hashed_password": get_password_hash(user.password),
        "full_name": user.full_name,
        "role": "user",
        "is_admin": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    
    result = await db.users.insert_one(user_dict)
    return {"id": str(result.inserted_id), "email": user.email}


@router.post("/admin/login")
@limiter.limit("5/minute")  # Rate limit: 5 attempts per minute per IP
async def admin_login(request: Request, user: UserLogin):
    client_ip = get_client_ip(request)
    
    # Check for lockout
    if await check_login_lockout(user.email, client_ip):
        logger.warning(f"Login blocked due to lockout: {user.email} from {client_ip}")
        raise HTTPException(
            status_code=429, 
            detail=f"Too many failed attempts. Please try again in {LOCKOUT_DURATION_MINUTES} minutes."
        )
    
    db_user = await db.users.find_one({"email": user.email})
    if not db_user:
        await record_failed_login(user.email, client_ip, "User not found")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user.password, db_user.get("hashed_password", "")):
        await record_failed_login(user.email, client_ip, "Invalid password")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not db_user.get("is_admin") and db_user.get("role") != "admin":
        await record_failed_login(user.email, client_ip, "Not an admin")
        raise HTTPException(status_code=403, detail="Not authorized to access admin")
    
    # Clear failed attempts on successful login
    await clear_failed_logins(user.email)
    
    # Log successful login
    logger.info(f"Admin login successful: {user.email} from {client_ip}")
    
    # Fetch role permissions
    role_id = db_user.get("role_id") or db_user.get("role", "admin")
    role = await db.roles.find_one({"id": role_id})
    permissions = role.get("permissions", {}) if role else {"all": True}
    
    access_token = create_access_token(data={"sub": db_user["email"]}, remember_me=user.remember_me)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": db_user["email"],
            "full_name": db_user.get("full_name"),
            "role": db_user.get("role", "admin"),
            "role_id": role_id,
            "is_admin": db_user.get("is_admin", True),
            "permissions": permissions,
        },
    }


@router.post("/reseller/login")
@limiter.limit("5/minute")  # Rate limit: 5 attempts per minute per IP
async def reseller_login(request: Request, user: UserLogin):
    """Login for resellers and sales partners"""
    client_ip = get_client_ip(request)
    
    # Check for lockout
    if await check_login_lockout(user.email, client_ip):
        logger.warning(f"Login blocked due to lockout: {user.email} from {client_ip}")
        raise HTTPException(
            status_code=429, 
            detail=f"Too many failed attempts. Please try again in {LOCKOUT_DURATION_MINUTES} minutes."
        )
    
    db_user = await db.users.find_one({"email": user.email})
    if not db_user:
        await record_failed_login(user.email, client_ip, "User not found")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user.password, db_user.get("hashed_password", "")):
        await record_failed_login(user.email, client_ip, "Invalid password")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not db_user.get("is_active", True):
        await record_failed_login(user.email, client_ip, "Account deactivated")
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Check if user has reseller, sales_partner, or staff role
    role_id = db_user.get("role_id", "")
    valid_roles = ["reseller", "sales_partner", "staff"]
    if role_id not in valid_roles and not db_user.get("is_admin"):
        await record_failed_login(user.email, client_ip, "Not a reseller/staff")
        raise HTTPException(status_code=403, detail="Not authorized as reseller")
    
    # Clear failed attempts on successful login
    await clear_failed_logins(user.email)
    
    # Log successful login
    logger.info(f"Reseller login successful: {user.email} (role: {role_id}) from {client_ip}")
    
    # Fetch role permissions
    role = await db.roles.find_one({"id": role_id})
    permissions = role.get("permissions", {}) if role else {}
    
    access_token = create_access_token(data={"sub": db_user["email"], "type": "reseller"}, remember_me=user.remember_me)
    
    # Build user response based on role
    user_response = {
        "id": str(db_user["_id"]),
        "email": db_user["email"],
        "full_name": db_user.get("full_name"),
        "company": db_user.get("company"),
        "role": db_user.get("role", role_id),
        "role_id": role_id,
        "is_admin": db_user.get("is_admin", False),
        "payment_methods": db_user.get("payment_methods", {"bank_transfer": True, "stripe": False}),
        "permissions": permissions,
    }
    
    # Add staff-specific fields
    if role_id == "staff":
        user_response["parent_reseller_email"] = db_user.get("parent_reseller_email")
        user_response["margins"] = db_user.get("margins", {})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
    }


@router.get("/me")
async def get_me(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(authorization)
    
    # Fetch role permissions
    role_id = user.get("role_id") or user.get("role", "user")
    role = await db.roles.find_one({"id": role_id})
    permissions = role.get("permissions", {}) if role else {}
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "full_name": user.get("full_name"),
        "company": user.get("company"),
        "role": user.get("role", "user"),
        "role_id": role_id,
        "is_admin": user.get("is_admin", False),
        "payment_methods": user.get("payment_methods", {"bank_transfer": True, "stripe": False}),
        "permissions": permissions,
        "parent_reseller_email": user.get("parent_reseller_email"),
    }


def generate_password_reset_token():
    """Generate a secure random token for password reset"""
    return secrets.token_urlsafe(32)


@router.post("/forgot-password")
@limiter.limit("3/minute")  # Rate limit: 3 requests per minute per IP
async def forgot_password(request: Request, email: str):
    """Request password reset email"""
    client_ip = get_client_ip(request)
    logger.info(f"Password reset requested for {email} from {client_ip}")
    
    user = await db.users.find_one({"email": email})
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "If an account with that email exists, a password reset link has been sent."}
    
    # Generate reset token
    reset_token = generate_password_reset_token()
    reset_token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token in database
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expiry": reset_token_expiry,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Send reset email
    await send_password_reset_email(email, reset_token)
    
    return {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(token: str, new_password: str):
    """Reset password using token"""
    user = await db.users.find_one({"reset_token": token})
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token",
        )
    
    # Check if token is expired
    token_expiry = user.get("reset_token_expiry")
    if token_expiry:
        # Handle both datetime and string formats
        if isinstance(token_expiry, str):
            token_expiry = datetime.fromisoformat(token_expiry.replace('Z', '+00:00'))
        if token_expiry.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail="Reset token has expired",
            )
    
    # Update password and clear reset token
    hashed_password = get_password_hash(new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "hashed_password": hashed_password,
            "reset_token": None,
            "reset_token_expiry": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Password reset successful"}
