import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

class HistoryService:
    """Service for managing analysis history for users"""
    
    def __init__(self):
        self.db_dir = Path(__file__).parent.parent / "database"
        self.history_file = self.db_dir / "history.json"
        self._ensure_db_exists()
    
    def _ensure_db_exists(self):
        """Ensure database directory and history file exist"""
        self.db_dir.mkdir(exist_ok=True)
        if not self.history_file.exists():
            with open(self.history_file, 'w') as f:
                json.dump({"analyses": []}, f, indent=2)
    
    def _load_history(self) -> Dict[str, Any]:
        """Load history from JSON file"""
        try:
            with open(self.history_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {"analyses": []}
    
    def _save_history(self, data: Dict[str, Any]):
        """Save history to JSON file"""
        with open(self.history_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def save_analysis(self, user_id: str, account_type: str, analysis_data: Dict[str, Any]) -> str:
        """Save an analysis to history and return the analysis ID"""
        history = self._load_history()
        
        analysis_id = f"analysis_{datetime.now().timestamp()}"
        
        analysis_record = {
            "id": analysis_id,
            "user_id": user_id,
            "account_type": account_type,  # 'personal' or 'company'
            "created_at": datetime.now().isoformat(),
            "total_transactions": analysis_data.get("total_transactions", 0),
            "total_amount": analysis_data.get("total_amount", 0),
            "date_range": analysis_data.get("date_range", {}),
            "smart_score": analysis_data.get("smart_score", {}),
            # Store summary for history display (not full transactions to save space)
            "insights_summary": {
                "top_category": analysis_data.get("insights", {}).get("top_category", {}),
                "category_count": len(analysis_data.get("insights", {}).get("category_breakdown", {}))
            },
            # Store file errors and warnings if present
            "file_errors": analysis_data.get("file_errors", []),
            "file_warnings": analysis_data.get("file_warnings", [])
        }
        
        history["analyses"].append(analysis_record)
        self._save_history(history)
        
        return analysis_id
    
    def get_user_history(self, user_id: str, account_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get analysis history for a specific user"""
        history = self._load_history()
        
        # Filter by user_id and optionally by account_type
        user_analyses = [
            analysis for analysis in history.get("analyses", [])
            if analysis.get("user_id") == user_id
            and (account_type is None or analysis.get("account_type") == account_type)
        ]
        
        # Sort by created_at (most recent first)
        user_analyses.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return user_analyses
    
    def get_analysis_by_id(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific analysis by ID"""
        history = self._load_history()
        
        for analysis in history.get("analyses", []):
            if analysis.get("id") == analysis_id:
                return analysis
        
        return None
    
    def delete_analysis(self, user_id: str, analysis_id: str) -> bool:
        """Delete an analysis (only if it belongs to the user)"""
        history = self._load_history()
        
        original_count = len(history.get("analyses", []))
        
        history["analyses"] = [
            analysis for analysis in history.get("analyses", [])
            if not (analysis.get("id") == analysis_id and analysis.get("user_id") == user_id)
        ]
        
        removed = len(history.get("analyses", [])) < original_count
        
        if removed:
            self._save_history(history)
        
        return removed
    
    def save_company_analysis(self, user_id: str, analysis_data: Dict[str, Any]) -> str:
        """Save a company analysis (audit) to history and return the analysis ID"""
        history = self._load_history()
        
        # Use provided ID or generate one
        analysis_id = analysis_data.get('id', f"audit_{datetime.now().timestamp()}")
        
        analysis_record = {
            "id": analysis_id,
            "user_id": user_id,
            "account_type": "company",
            "created_at": analysis_data.get("audit_date", datetime.now().isoformat()),
            "company_name": analysis_data.get("company_name", ""),
            "audit_report": analysis_data.get("audit_report", {}),
            "financial_summary": analysis_data.get("financial_summary", {}),
            "total_transactions": analysis_data.get("financial_summary", {}).get("total_transactions", 0),
            "total_amount": analysis_data.get("financial_summary", {}).get("total_amount", 0),
            # Store full analysis data including visualizations for visualise tab
            "insights": analysis_data.get("insights", {}),
            "visualizations": analysis_data.get("visualizations", {}),
            "transactions": analysis_data.get("transactions", []),
            "smart_score": analysis_data.get("smart_score", {}),
            "files_uploaded": analysis_data.get("files_uploaded", [])
        }
        
        history["analyses"].append(analysis_record)
        self._save_history(history)
        
        return analysis_id
    
    def get_company_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get company analysis history for a specific user"""
        history = self._load_history()
        
        # Filter by user_id and account_type 'company'
        company_analyses = [
            analysis for analysis in history.get("analyses", [])
            if analysis.get("user_id") == user_id and analysis.get("account_type") == "company"
        ]
        
        # Sort by created_at (most recent first)
        company_analyses.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return company_analyses

