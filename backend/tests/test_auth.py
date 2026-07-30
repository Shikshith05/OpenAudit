import hashlib
import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main
from services.auth_service import AuthService


@pytest.fixture()
def temp_auth_service(tmp_path, monkeypatch):
    users_file = tmp_path / "users.json"
    legacy_password = "legacy-password"
    admin_password = "admin-password"

    service = AuthService(db_path=str(users_file))
    service.users = {
        "users": [
            {
                "id": "legacy-user",
                "username": "legacy",
                "email": "legacy@example.com",
                "password": hashlib.sha256(legacy_password.encode()).hexdigest(),
                "account_type": "personal",
                "full_name": "Legacy User",
                "contact_number": "1234567890",
                "is_verified": True,
                "is_admin": False,
                "created_at": "2026-01-01T00:00:00",
                "otp": None,
                "otp_expiry": None,
            },
            {
                "id": "admin-user",
                "username": "admin",
                "email": "admin@example.com",
                "password": service._hash_password(admin_password),
                "account_type": "company",
                "full_name": "Admin User",
                "contact_number": "5555555555",
                "is_verified": True,
                "is_admin": True,
                "created_at": "2026-01-01T00:00:00",
                "otp": None,
                "otp_expiry": None,
            },
        ]
    }
    service._save_users()

    monkeypatch.setattr(main, "auth_service", service)
    return service, legacy_password, admin_password, users_file


@pytest.fixture()
def client(temp_auth_service):
    return TestClient(main.app)


def test_legacy_login_rehashes_password_and_sets_cookie(client, temp_auth_service):
    service, legacy_password, _, users_file = temp_auth_service

    response = client.post(
        "/api/auth/login",
        json={"username": "legacy", "password": legacy_password},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["user"]["username"] == "legacy"
    assert response.cookies.get(main.AUTH_COOKIE_NAME)

    stored = json.loads(users_file.read_text())
    updated_user = next(user for user in stored["users"] if user["username"] == "legacy")
    assert updated_user["password"].startswith("$2")


def test_protected_route_requires_authentication(client):
    response = client.get("/api/auth/users")

    assert response.status_code == 401


def test_admin_login_can_access_protected_route(client, temp_auth_service):
    _, _, admin_password, _ = temp_auth_service

    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": admin_password},
    )

    assert login_response.status_code == 200

    users_response = client.get("/api/auth/users")

    assert users_response.status_code == 200
    payload = users_response.json()
    assert payload["status"] == "success"
    assert any(user["username"] == "admin" for user in payload["users"])


def test_registration_and_resend_do_not_expose_otp(client):
    register_response = client.post(
        "/api/auth/register",
        json={
            "username": "new-user",
            "email": "new-user@example.com",
            "password": "new-password",
            "account_type": "personal",
            "full_name": "New User",
            "contact_number": "1112223333",
        },
    )

    assert register_response.status_code == 200
    register_payload = register_response.json()
    assert register_payload["status"] == "success"
    assert "otp" not in register_payload

    resend_response = client.post(
        "/api/auth/resend-otp",
        json={"email": "new-user@example.com"},
    )

    assert resend_response.status_code == 200
    resend_payload = resend_response.json()
    assert resend_payload["status"] == "success"
    assert "otp" not in resend_payload
