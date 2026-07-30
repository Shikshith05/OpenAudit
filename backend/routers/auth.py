import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

AUTH_COOKIE_NAME = "openaudit_access_token"
JWT_SECRET = os.getenv("OPENAUDIT_JWT_SECRET", "openaudit-dev-secret-change-me-please-set-env")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("OPENAUDIT_JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _get_auth_service():
    from main import auth_service as shared_auth_service

    return shared_auth_service


def create_access_token(user: Dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["id"],
        "username": user.get("username"),
        "email": user.get("email"),
        "account_type": user.get("account_type"),
        "full_name": user.get("full_name"),
        "is_admin": bool(user.get("is_admin", False)),
        "exp": now + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now,
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _set_auth_cookie(response: JSONResponse, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def get_current_user(
    request: Request,
    authorization: Optional[str] = None,
) -> Dict[str, Any]:
    auth_service = _get_auth_service()
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    user_record = auth_service.get_user_record(user_id)
    if not user_record:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": user_record["id"],
        "username": user_record["username"],
        "email": user_record["email"],
        "account_type": user_record["account_type"],
        "full_name": user_record["full_name"],
        "is_admin": user_record.get("is_admin", False),
    }


def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.post("/login")
async def login(data: Dict[str, Any]):
    """User login endpoint"""
    try:
        auth_service = _get_auth_service()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password are required")

        result = auth_service.login(username, password)

        if result["success"]:
            response = JSONResponse(content={
                "status": "success",
                "user": result["user"],
                "message": result["message"]
            })
            _set_auth_cookie(response, create_access_token(result["user"]))
            return response

        raise HTTPException(status_code=401, detail=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during login: {str(e)}")


@router.post("/register")
async def register(data: Dict[str, Any]):
    """User registration endpoint"""
    try:
        auth_service = _get_auth_service()
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        account_type = data.get("account_type", "personal")
        full_name = data.get("full_name", "")
        contact_number = data.get("contact_number", "")

        if not username or not email or not password:
            raise HTTPException(status_code=400, detail="Username, email, and password are required")

        result = auth_service.register_user(username, email, password, account_type, full_name, contact_number)

        if result["success"]:
            return JSONResponse(content={"status": "success", "message": result["message"]})

        raise HTTPException(status_code=400, detail=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during registration: {str(e)}")


@router.post("/verify-otp")
async def verify_otp(data: Dict[str, Any]):
    """Verify OTP endpoint"""
    try:
        auth_service = _get_auth_service()
        email = data.get("email")
        otp = data.get("otp")

        if not email or not otp:
            raise HTTPException(status_code=400, detail="Email and OTP are required")

        result = auth_service.verify_otp(email, otp)

        if result["success"]:
            return JSONResponse(content={"status": "success", "message": result["message"]})

        raise HTTPException(status_code=400, detail=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying OTP: {str(e)}")


@router.post("/resend-otp")
async def resend_otp(data: Dict[str, Any]):
    """Resend OTP endpoint"""
    try:
        auth_service = _get_auth_service()
        email = data.get("email")

        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        result = auth_service.resend_otp(email)

        if result["success"]:
            return JSONResponse(content={"status": "success", "message": result["message"]})

        raise HTTPException(status_code=400, detail=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resending OTP: {str(e)}")


@router.get("/users")
async def get_users(current_user: Dict[str, Any] = Depends(require_admin)):
    """Get all users (admin only)"""
    try:
        auth_service = _get_auth_service()
        users = auth_service.get_all_users()
        return JSONResponse(content={"status": "success", "users": users})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")


@router.get("/me")
async def get_current_session(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get the currently authenticated user."""
    return JSONResponse(content={"status": "success", "user": current_user})