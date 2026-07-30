import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main
from services.auth_service import AuthService
from services.contract_service import ContractService


def _write_contract_db(contract_path: Path) -> None:
    contract_path.write_text(
        """{
  "contracts": [
    {
      "id": "contract_1762007885955",
      "company_id": "company-1",
      "company_name": "Example Co",
      "status": "pending",
      "requested_at": "2026-01-01T00:00:00",
      "signed_admin_at": null,
      "signed_company_at": null,
      "admin_signature": null,
      "company_signature": null,
      "contract_pdf_path": null,
      "signed_contract_pdf_path": null
    }
  ]
}
"""
    )


def _login_admin(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin-password"},
    )
    assert response.status_code == 200


def test_admin_contract_upload_rejects_bad_mime_and_uses_server_filename(tmp_path, monkeypatch):
    users_file = tmp_path / "users.json"
    contract_file = tmp_path / "contracts.json"
    contract_dir = tmp_path / "contracts"
    contract_dir.mkdir()
    _write_contract_db(contract_file)

    auth_service = AuthService(db_path=str(users_file))
    auth_service.users = {
        "users": [
            {
                "id": "admin-user",
                "username": "admin",
                "email": "admin@example.com",
                "password": auth_service._hash_password("admin-password"),
                "account_type": "company",
                "full_name": "Admin User",
                "contact_number": "5555555555",
                "is_verified": True,
                "is_admin": True,
                "created_at": "2026-01-01T00:00:00",
                "otp": None,
                "otp_expiry": None,
            }
        ]
    }
    auth_service._save_users()

    contract_service = ContractService(db_path=str(contract_file))

    monkeypatch.setattr(main, "auth_service", auth_service)
    monkeypatch.setattr(main, "contract_service", contract_service)
    monkeypatch.setattr(main, "_build_contract_upload_path", lambda prefix: str(contract_dir / f"{prefix}_tmp.pdf"))

    client = TestClient(main.app)
    _login_admin(client)

    bad_response = client.post(
        "/api/admin/contract/sign",
        data={"contract_id": "contract_1762007885955", "signature": "Admin"},
        files={"file": ("contract.txt", b"not a pdf", "text/plain")},
    )
    assert bad_response.status_code == 400
    assert "PDF" in bad_response.json()["detail"]

    good_response = client.post(
        "/api/admin/contract/sign",
        data={"contract_id": "contract_1762007885955", "signature": "Admin"},
        files={"file": ("contract.pdf", b"%PDF-1.4\n%fake pdf", "application/pdf")},
    )
    assert good_response.status_code == 200
    contract = good_response.json()["contract"]
    assert contract["signed_contract_pdf_path"]
    assert Path(contract["signed_contract_pdf_path"]).name.startswith("signed_contract_")
    assert "contract_1762007885955" not in Path(contract["signed_contract_pdf_path"]).name
