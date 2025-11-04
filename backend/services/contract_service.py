from typing import Dict, Any, List, Optional
import json
import os
from datetime import datetime

class ContractService:
    """Service for managing contracts between companies and OpenAudit"""
    
    def __init__(self, db_path: str = "database/contracts.json"):
        self.db_path = db_path
        self._ensure_db()
    
    def _ensure_db(self):
        """Ensure the contracts database file exists"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        if not os.path.exists(self.db_path):
            with open(self.db_path, 'w') as f:
                json.dump({"contracts": []}, f, indent=2)
    
    def _load_db(self) -> Dict[str, Any]:
        """Load contracts from database"""
        try:
            with open(self.db_path, 'r') as f:
                return json.load(f)
        except:
            return {"contracts": []}
    
    def _save_db(self, data: Dict[str, Any]):
        """Save contracts to database"""
        with open(self.db_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def request_contract(self, company_id: str, company_name: str) -> Dict[str, Any]:
        """Company requests a contract"""
        db = self._load_db()
        
        # Check if there's already a pending or active contract
        existing = next((c for c in db["contracts"] if c.get("company_id") == company_id), None)
        if existing:
            if existing.get("status") == "pending":
                return {"error": "Contract request already pending"}
            if existing.get("status") == "active":
                return {"error": "Contract already active"}
        
        contract = {
            "id": f"contract_{int(datetime.now().timestamp() * 1000)}",
            "company_id": company_id,
            "company_name": company_name,
            "status": "pending",  # pending, signed_admin, signed_company, active
            "requested_at": datetime.now().isoformat(),
            "signed_admin_at": None,
            "signed_company_at": None,
            "admin_signature": None,
            "company_signature": None,
            "contract_pdf_path": None,
            "signed_contract_pdf_path": None
        }
        
        db["contracts"].append(contract)
        self._save_db(db)
        return contract
    
    def get_pending_contracts(self) -> List[Dict[str, Any]]:
        """Get all pending contracts for admin"""
        db = self._load_db()
        return [c for c in db["contracts"] if c.get("status") == "pending"]
    
    def get_company_contract(self, company_id: str) -> Optional[Dict[str, Any]]:
        """Get contract for a company"""
        db = self._load_db()
        contracts = [c for c in db["contracts"] if c.get("company_id") == company_id]
        if contracts:
            return sorted(contracts, key=lambda x: x.get("requested_at", ""), reverse=True)[0]
        return None
    
    def sign_contract_admin(self, contract_id: str, signature: str, signed_pdf_path: str) -> Dict[str, Any]:
        """Admin signs and uploads the contract"""
        db = self._load_db()
        contract = next((c for c in db["contracts"] if c.get("id") == contract_id), None)
        if not contract:
            return {"error": "Contract not found"}
        
        if contract.get("status") != "pending":
            return {"error": f"Contract status is {contract.get('status')}, cannot sign"}
        
        contract["status"] = "signed_admin"
        contract["signed_admin_at"] = datetime.now().isoformat()
        contract["admin_signature"] = signature
        contract["signed_contract_pdf_path"] = signed_pdf_path
        
        self._save_db(db)
        return contract
    
    def sign_contract_company(self, company_id: str, signature: str) -> Dict[str, Any]:
        """Company signs the contract"""
        db = self._load_db()
        contract = next((c for c in db["contracts"] if c.get("company_id") == company_id and c.get("status") == "signed_admin"), None)
        if not contract:
            return {"error": "No signed contract from admin found"}
        
        contract["status"] = "active"
        contract["signed_company_at"] = datetime.now().isoformat()
        contract["company_signature"] = signature
        
        self._save_db(db)
        return contract
    
    def update_signed_contract(self, contract_id: str, signed_pdf_path: str) -> Dict[str, Any]:
        """Admin updates/re-uploads signed contract"""
        db = self._load_db()
        contract = next((c for c in db["contracts"] if c.get("id") == contract_id), None)
        if not contract:
            return {"error": "Contract not found"}
        
        contract["signed_contract_pdf_path"] = signed_pdf_path
        contract["signed_admin_at"] = datetime.now().isoformat()
        
        self._save_db(db)
        return contract
    
    def get_all_contracts(self) -> List[Dict[str, Any]]:
        """Get all contracts for admin"""
        db = self._load_db()
        return db.get("contracts", [])

