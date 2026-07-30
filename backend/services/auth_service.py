import json
import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from pathlib import Path
import random
import bcrypt


logger = logging.getLogger(__name__)

class AuthService:
    """Authentication service for user management"""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = Path(db_path) if db_path else Path(__file__).parent.parent / "database" / "users.json"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.users = self._load_users()
        self.otp_storage = {}  # Store OTPs temporarily
        self.otp_delivery_mode = os.getenv("OPENAUDIT_OTP_DELIVERY_MODE", "stub").lower()
        
    def _load_users(self) -> Dict:
        """Load users from JSON file"""
        if self.db_path.exists():
            try:
                with open(self.db_path, 'r') as f:
                    return json.load(f)
            except:
                return {"users": []}
        return {"users": []}
    
    def _save_users(self):
        """Save users to JSON file"""
        with open(self.db_path, 'w') as f:
            json.dump(self.users, f, indent=2)
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt for new accounts and password upgrades"""
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def _is_legacy_sha256_hash(self, hashed_password: Optional[str]) -> bool:
        if not isinstance(hashed_password, str) or len(hashed_password) != 64:
            return False
        try:
            int(hashed_password, 16)
            return True
        except (TypeError, ValueError):
            return False

    def _verify_password(self, password: str, stored_hash: Optional[str]) -> Tuple[bool, bool]:
        """Return whether the password matches and whether the hash should be upgraded."""
        if not stored_hash:
            return False, False

        stored_hash = str(stored_hash)

        if stored_hash.startswith("$2a$") or stored_hash.startswith("$2b$") or stored_hash.startswith("$2y$"):
            try:
                return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")), False
            except ValueError:
                return False, False

        if self._is_legacy_sha256_hash(stored_hash):
            candidate = hashlib.sha256(password.encode()).hexdigest()
            return secrets.compare_digest(candidate, stored_hash), True

        candidate = hashlib.sha256(password.encode()).hexdigest()
        return secrets.compare_digest(candidate, stored_hash), True
    
    def _generate_otp(self) -> str:
        """Generate 6-digit OTP"""
        return str(random.randint(100000, 999999))

    def _deliver_otp(self, recipient: str, otp: str) -> None:
        """Deliver OTP using the configured dev-only stub or a future real provider."""
        if self.otp_delivery_mode == "stub":
            logger.info("[OTP STUB] OTP for %s is %s", recipient, otp)
            return

        logger.warning(
            "OTP delivery mode '%s' is not wired to an external provider yet; using stub logging for %s",
            self.otp_delivery_mode,
            recipient,
        )
        logger.info("[OTP STUB] OTP for %s is %s", recipient, otp)
    
    def register_user(self, username: str, email: str, password: str, 
                     account_type: str, full_name: str, contact_number: str) -> Dict:
        """Register a new user"""
        # Check if user exists
        for user in self.users.get("users", []):
            if user.get("username") == username or user.get("email") == email:
                return {"success": False, "message": "Username or email already exists"}
        
        # Create new user
        new_user = {
            "id": secrets.token_urlsafe(16),
            "username": username,
            "email": email,
            "password": self._hash_password(password),
            "account_type": account_type,  # "personal" or "company"
            "full_name": full_name,
            "contact_number": contact_number,
            "is_verified": False,
            "is_admin": False,
            "created_at": datetime.now().isoformat(),
            "otp": None,
            "otp_expiry": None
        }
        
        # Generate OTP
        otp = self._generate_otp()
        new_user["otp"] = otp
        new_user["otp_expiry"] = (datetime.now() + timedelta(minutes=10)).isoformat()
        
        # Store OTP temporarily
        self.otp_storage[email] = {
            "otp": otp,
            "expiry": datetime.now() + timedelta(minutes=10)
        }
        
        # Add user to database
        if "users" not in self.users:
            self.users["users"] = []
        self.users["users"].append(new_user)
        self._save_users()
        self._deliver_otp(email, otp)
        
        return {
            "success": True,
            "message": "User registered. OTP sent to your contact number."
        }
    
    def verify_otp(self, email: str, otp: str) -> Dict:
        """Verify OTP for user registration"""
        # Find user
        user = None
        for u in self.users.get("users", []):
            if u.get("email") == email:
                user = u
                break
        
        if not user:
            return {"success": False, "message": "User not found"}
        
        # Check OTP
        stored_otp = self.otp_storage.get(email)
        if not stored_otp:
            return {"success": False, "message": "OTP expired or invalid"}
        
        if datetime.now() > stored_otp["expiry"]:
            return {"success": False, "message": "OTP expired. Please request a new one."}
        
        if stored_otp["otp"] != otp:
            return {"success": False, "message": "Invalid OTP"}
        
        # Verify user
        user["is_verified"] = True
        user["otp"] = None
        user["otp_expiry"] = None
        del self.otp_storage[email]
        self._save_users()
        
        return {"success": True, "message": "Email verified successfully"}
    
    def login(self, username: str, password: str) -> Dict:
        """Authenticate user"""
        # Reload users to get latest data
        self.users = self._load_users()

        for user in self.users.get("users", []):
            username_match = user.get("username") == username or user.get("email") == username
            password_match, needs_rehash = self._verify_password(password, user.get("password"))

            if username_match and password_match:
                if not user.get("is_verified", False):
                    return {
                        "success": False,
                        "message": "Please verify your account with OTP first"
                    }

                if needs_rehash:
                    user["password"] = self._hash_password(password)
                    self._save_users()
                    self.users = self._load_users()

                user_obj = {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "account_type": user["account_type"],
                    "full_name": user["full_name"],
                    "is_admin": user.get("is_admin", False)
                }
                return {
                    "success": True,
                    "user": user_obj,
                    "message": "Login successful"
                }
        
        return {"success": False, "message": "Invalid username or password"}
    
    def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        for user in self.users.get("users", []):
            if user.get("id") == user_id:
                return {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "account_type": user["account_type"],
                    "full_name": user["full_name"],
                    "contact_number": user.get("contact_number", ""),
                    "is_admin": user.get("is_admin", False),
                    "created_at": user.get("created_at", "")
                }
        return None

    def get_user_record(self, user_id: str) -> Optional[Dict]:
        """Get the raw stored user record by ID."""
        for user in self.users.get("users", []):
            if user.get("id") == user_id:
                return user
        return None
    
    def get_all_users(self) -> list:
        """Get all users (for admin)"""
        return [
            {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "account_type": user["account_type"],
                "full_name": user["full_name"],
                "is_verified": user.get("is_verified", False),
                "created_at": user.get("created_at", "")
            }
            for user in self.users.get("users", [])
        ]
    
    def resend_otp(self, email: str) -> Dict:
        """Resend OTP to user"""
        user = None
        for u in self.users.get("users", []):
            if u.get("email") == email:
                user = u
                break
        
        if not user:
            return {"success": False, "message": "User not found"}
        
        # Generate new OTP
        otp = self._generate_otp()
        self.otp_storage[email] = {
            "otp": otp,
            "expiry": datetime.now() + timedelta(minutes=10)
        }
        self._deliver_otp(email, otp)
        
        return {
            "success": True,
            "message": "OTP sent to your contact number"
        }

