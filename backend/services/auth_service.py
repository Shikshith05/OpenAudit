import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional
from pathlib import Path
import random

class AuthService:
    """Authentication service for user management"""
    
    def __init__(self):
        self.db_path = Path(__file__).parent.parent / "database" / "users.json"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.users = self._load_users()
        self.otp_storage = {}  # Store OTPs temporarily
        
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
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def _generate_otp(self) -> str:
        """Generate 6-digit OTP"""
        return str(random.randint(100000, 999999))
    
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
        
        return {
            "success": True,
            "message": "User registered. OTP sent to your contact number.",
            "otp": otp  # In production, send via SMS/Email
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
        hashed_password = self._hash_password(password)
        
        # DEBUG: Log login attempt
        print(f"[LOGIN DEBUG] Attempting login for: {username}")
        print(f"[LOGIN DEBUG] Password hash: {hashed_password[:20]}...")
        print(f"[LOGIN DEBUG] Total users: {len(self.users.get('users', []))}")
        
        for user in self.users.get("users", []):
            username_match = user.get("username") == username or user.get("email") == username
            password_match = user.get("password") == hashed_password
            
            print(f"[LOGIN DEBUG] Checking user: {user.get('username')} (email: {user.get('email')})")
            print(f"[LOGIN DEBUG]   Username match: {username_match}")
            print(f"[LOGIN DEBUG]   Password match: {password_match}")
            print(f"[LOGIN DEBUG]   Stored hash: {user.get('password', '')[:20]}...")
            print(f"[LOGIN DEBUG]   Is verified: {user.get('is_verified', False)}")
            
            if username_match and password_match:
                print(f"[LOGIN DEBUG] ✅ MATCH FOUND for user: {user.get('username')}")
                
                if not user.get("is_verified", False):
                    print(f"[LOGIN DEBUG] ❌ User not verified")
                    return {
                        "success": False,
                        "message": "Please verify your account with OTP first"
                    }
                
                print(f"[LOGIN DEBUG] ✅ User verified, returning success")
                user_obj = {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "account_type": user["account_type"],
                    "full_name": user["full_name"],
                    "is_admin": user.get("is_admin", False)
                }
                print(f"[LOGIN DEBUG] Returning user object: {user_obj}")
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
        
        return {
            "success": True,
            "message": "OTP sent to your contact number",
            "otp": otp  # In production, send via SMS/Email
        }

