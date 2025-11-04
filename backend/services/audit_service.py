"""
Fraud Detection and Transaction Analysis Service
Provides comprehensive fraud detection for company transactions using:
- Amount-based anomaly detection (Z-scores)
- Text-based anomaly detection (Sentence Transformers + LOF)
- Combined suspicion index calculation
"""
import json
import os
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path

# Optional imports for ML libraries
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None

try:
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.preprocessing import MinMaxScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    LocalOutlierFactor = None
    MinMaxScaler = None

class AuditService:
    """Fraud detection and transaction analysis service"""
    
    def __init__(self):
        """Initialize the fraud detection service"""
        self.sentence_model = None
        self.api_available = False
        
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            print(f"[AUDIT WARNING] sentence-transformers package not installed. Install with: pip install sentence-transformers")
            print(f"[AUDIT WARNING] Text-based fraud detection will be disabled.")
        else:
            try:
                self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
                self.api_available = True
                print(f"[AUDIT] Fraud detection model initialized successfully")
            except Exception as e:
                print(f"[AUDIT WARNING] Failed to load sentence transformer model: {str(e)}")
        
        if not SKLEARN_AVAILABLE:
            print(f"[AUDIT WARNING] scikit-learn package not installed. Install with: pip install scikit-learn")
            print(f"[AUDIT WARNING] LOF-based anomaly detection will be disabled.")
    
    def _calculate_amount_score(self, amounts: List[float]) -> Dict[str, Any]:
        """Calculate amount-based suspicion scores using Z-scores"""
        if not amounts or len(amounts) == 0:
            return {'amount_scores': [], 'amount_z_scores': []}
        
        amounts_array = np.array(amounts)
        
        # Calculate Z-scores
        mean_amount = np.mean(amounts_array)
        std_amount = np.std(amounts_array)
        
        if std_amount == 0:
            # All amounts are the same
            z_scores = np.zeros_like(amounts_array)
            amount_scores = np.zeros_like(amounts_array)
        else:
            z_scores = (amounts_array - mean_amount) / std_amount
            abs_z_scores = np.abs(z_scores)
            
            # Normalize to 0-1 range
            max_abs_z = np.max(abs_z_scores) if np.max(abs_z_scores) > 0 else 1
            amount_scores = np.clip(abs_z_scores / max_abs_z, 0, 1)
        
        return {
            'amount_scores': amount_scores.tolist(),
            'amount_z_scores': z_scores.tolist()
        }
    
    def _calculate_text_score(self, descriptions: List[str]) -> Dict[str, Any]:
        """Calculate text-based suspicion scores using sentence embeddings and LOF"""
        if not descriptions or len(descriptions) == 0:
            return {'text_scores': []}
        
        if not self.api_available or not SKLEARN_AVAILABLE:
            # Fallback: return zeros if ML libraries not available
            return {'text_scores': [0.0] * len(descriptions)}
        
        try:
            # Compute embeddings
            desc_embeddings = self.sentence_model.encode(descriptions, show_progress_bar=False)
            
            # Use Local Outlier Factor for anomaly detection
            n_neighbors = min(20, len(descriptions) - 1) if len(descriptions) > 1 else 1
            if n_neighbors < 1:
                return {'text_scores': [0.0] * len(descriptions)}
            
            lof = LocalOutlierFactor(n_neighbors=n_neighbors, novelty=False)
            lof.fit(desc_embeddings)
            
            # Get LOF scores (negative outlier factor)
            raw_lof_scores = -lof.negative_outlier_factor_
            
            # Normalize to 0-1 range
            scaler = MinMaxScaler()
            text_scores = scaler.fit_transform(raw_lof_scores.reshape(-1, 1))
            
            return {'text_scores': text_scores.flatten().tolist()}
        except Exception as e:
            print(f"[AUDIT WARNING] Failed to calculate text scores: {str(e)}")
            return {'text_scores': [0.0] * len(descriptions)}
    
    def _calculate_suspicion_index(self, amount_scores: List[float], 
                                   text_scores: List[float],
                                   w_amount: float = 0.6, 
                                   w_text: float = 0.4) -> List[float]:
        """Calculate combined suspicion index"""
        if len(amount_scores) != len(text_scores):
            # Pad shorter list with zeros
            max_len = max(len(amount_scores), len(text_scores))
            amount_scores = amount_scores + [0.0] * (max_len - len(amount_scores))
            text_scores = text_scores + [0.0] * (max_len - len(text_scores))
        
        suspicion_indices = [
            (w_amount * amt_score) + (w_text * txt_score)
            for amt_score, txt_score in zip(amount_scores, text_scores)
        ]
        
        return suspicion_indices
    
    def _get_risk_label(self, suspicion_index: float) -> str:
        """Convert suspicion index to risk label"""
        if suspicion_index > 0.8:
            return "🚨 HIGH RISK"
        elif suspicion_index > 0.6:
            return "⚠️ MEDIUM RISK"
        else:
            return "✅ Normal"
    
    def perform_audit(self, company_data: Dict, financial_data: Dict, 
                     transactions: List[Dict]) -> Dict[str, Any]:
        """
        Perform comprehensive fraud detection audit on company transactions
        
        Args:
            company_data: Company information (name, industry, size, etc.)
            financial_data: Financial summaries and analysis
            transactions: List of all transactions
        
        Returns:
            Comprehensive fraud detection report with findings, risks, and recommendations
        """
        try:
            print(f"[AUDIT] Starting fraud detection for {company_data.get('company_name', 'Unknown')}")
            
            if not transactions or len(transactions) == 0:
                return self._fallback_audit(company_data, financial_data, transactions)
            
            # Extract amounts and descriptions
            amounts = []
            descriptions = []
            
            for txn in transactions:
                # Extract amount (handle different field names)
                amount = abs(float(txn.get('amount', txn.get('Amount', txn.get('amount_abs', 0)))))
                amounts.append(amount)
                
                # Extract description
                desc = str(txn.get('description', txn.get('Description', '')))
                if not desc:
                    desc = str(txn.get('vendor', txn.get('Vendor/Customer', txn.get('account', txn.get('Account', '')))))
                descriptions.append(desc)
            
            # Calculate amount-based scores
            amount_data = self._calculate_amount_score(amounts)
            amount_scores = amount_data['amount_scores']
            
            # Calculate text-based scores
            text_data = self._calculate_text_score(descriptions)
            text_scores = text_data['text_scores']
            
            # Calculate suspicion index
            suspicion_indices = self._calculate_suspicion_index(amount_scores, text_scores)
            
            # Create DataFrame for analysis
            df = pd.DataFrame({
                'transaction': transactions,
                'amount': amounts,
                'description': descriptions,
                'amount_score': amount_scores,
                'text_score': text_scores,
                'suspicion_index': suspicion_indices
            })
            
            # Sort by suspicion index
            df_sorted = df.sort_values('suspicion_index', ascending=False)
            
            # Get top suspicious transactions
            top_suspicious = df_sorted.head(10).to_dict('records')
            
            # Calculate risk statistics
            high_risk_count = sum(1 for idx in suspicion_indices if idx > 0.8)
            medium_risk_count = sum(1 for idx in suspicion_indices if 0.6 < idx <= 0.8)
            normal_count = sum(1 for idx in suspicion_indices if idx <= 0.6)
            
            # Determine overall risk level
            if high_risk_count > len(transactions) * 0.1:  # More than 10% high risk
                overall_risk = "CRITICAL"
                overall_risk_score = 85
            elif high_risk_count > 0 or medium_risk_count > len(transactions) * 0.2:
                overall_risk = "HIGH"
                overall_risk_score = 70
            elif medium_risk_count > 0:
                overall_risk = "MEDIUM"
                overall_risk_score = 50
            else:
                overall_risk = "LOW"
                overall_risk_score = 25
            
            # Build suspicious transactions list
            suspicious_transactions = []
            for record in top_suspicious:
                txn = record['transaction']
                suspicious_transactions.append({
                    'date': txn.get('date', txn.get('Date', '')),
                    'amount': record['amount'],
                    'description': record['description'],
                    'suspicion_index': round(record['suspicion_index'], 4),
                    'amount_score': round(record['amount_score'], 4),
                    'text_score': round(record['text_score'], 4),
                    'risk_level': self._get_risk_label(record['suspicion_index'])
                })
            
            # Build audit report
            audit_report = {
                "audit_summary": {
                    "audit_date": datetime.now().isoformat(),
                    "company_name": company_data.get('company_name', 'Unknown'),
                    "fiscal_year": company_data.get('fiscal_year', datetime.now().year),
                    "overall_risk_score": overall_risk_score,
                    "compliance_score": 100 - overall_risk_score,
                    "financial_health_score": 100 - min(overall_risk_score, 75),
                    "audit_status": "PASS" if overall_risk == "LOW" else "CONDITIONAL" if overall_risk == "MEDIUM" else "FAIL"
                },
                "financial_compliance": {
                    "gaap_compliance": "COMPLIANT" if overall_risk == "LOW" else "REVIEW_REQUIRED",
                    "issues": [f"Detected {high_risk_count} high-risk transactions"] if high_risk_count > 0 else [],
                    "recommendations": [
                        "Review high-risk transactions for potential fraud",
                        "Verify suspicious transactions with stakeholders",
                        "Implement additional controls for high-value transactions"
                    ] if high_risk_count > 0 else ["No significant issues detected"]
                },
                "fraud_detection": {
                    "suspicious_transactions": suspicious_transactions,
                    "anomalies_detected": [
                        f"{high_risk_count} high-risk transactions",
                        f"{medium_risk_count} medium-risk transactions",
                        f"{normal_count} normal transactions"
                    ],
                    "risk_level": overall_risk,
                    "findings": [
                        f"Total transactions analyzed: {len(transactions)}",
                        f"High-risk transactions: {high_risk_count} ({high_risk_count/len(transactions)*100:.1f}%)",
                        f"Medium-risk transactions: {medium_risk_count} ({medium_risk_count/len(transactions)*100:.1f}%)",
                        f"Normal transactions: {normal_count} ({normal_count/len(transactions)*100:.1f}%)"
                    ]
                },
                "risk_assessment": {
                    "financial_risks": [
                        f"Identified {high_risk_count} potentially fraudulent transactions",
                        f"Average transaction amount: ₹{np.mean(amounts):,.2f}",
                        f"Largest transaction: ₹{np.max(amounts):,.2f}"
                    ] if len(amounts) > 0 else [],
                    "operational_risks": [],
                    "compliance_risks": [
                        "Some transactions require manual review"
                    ] if high_risk_count > 0 else [],
                    "overall_risk_level": overall_risk
                },
                "internal_controls": {
                    "strengths": ["Automated fraud detection system in place"],
                    "weaknesses": [
                        f"High number of suspicious transactions detected ({high_risk_count})"
                    ] if high_risk_count > 0 else [],
                    "improvement_areas": [
                        "Enhance transaction monitoring",
                        "Implement real-time fraud alerts",
                        "Review and approve high-value transactions manually"
                    ] if high_risk_count > 0 else ["Maintain current monitoring levels"]
                },
                "regulatory_compliance": {
                    "tax_compliance": "REVIEW_REQUIRED" if high_risk_count > 0 else "COMPLIANT",
                    "statutory_compliance": "REVIEW_REQUIRED" if high_risk_count > 0 else "COMPLIANT",
                    "issues": [
                        f"{high_risk_count} transactions flagged for review"
                    ] if high_risk_count > 0 else [],
                    "actions_required": [
                        "Review flagged transactions",
                        "Document review findings",
                        "Report significant findings to management"
                    ] if high_risk_count > 0 else ["Continue monitoring"]
                },
                "operational_analysis": {
                    "revenue_trends": "Based on transaction analysis",
                    "expense_trends": f"Analyzed {len(transactions)} transactions",
                    "budget_variance": "Not provided",
                    "key_metrics": [
                        f"Total transactions: {len(transactions)}",
                        f"Total amount: ₹{sum(amounts):,.2f}",
                        f"Average amount: ₹{np.mean(amounts):,.2f}" if len(amounts) > 0 else "N/A",
                        f"High-risk ratio: {high_risk_count/len(transactions)*100:.2f}%"
                    ]
                },
                "recommendations": {
                    "critical": [
                        f"Immediately review {high_risk_count} high-risk transactions"
                    ] if high_risk_count > 0 else [],
                    "high_priority": [
                        "Verify suspicious transaction details",
                        "Review transaction approval processes"
                    ] if medium_risk_count + high_risk_count > 0 else [],
                    "medium_priority": [
                        "Implement regular fraud detection audits",
                        "Enhance transaction monitoring"
                    ],
                    "low_priority": [
                        "Maintain current fraud detection practices"
                    ] if overall_risk == "LOW" else []
                },
                "metadata": {
                    "audit_performed_at": datetime.now().isoformat(),
                    "model_used": "fraud-detection-ml-model",
                    "total_transactions_analyzed": len(transactions),
                    "financial_period": financial_data.get('date_range', {})
                }
            }
            
            print(f"[AUDIT] Fraud detection completed successfully")
            print(f"[AUDIT] Found {high_risk_count} high-risk, {medium_risk_count} medium-risk transactions")
            
            return audit_report
            
        except Exception as e:
            print(f"[AUDIT ERROR] {str(e)}")
            import traceback
            traceback.print_exc()
            # Fallback to rule-based audit
            return self._fallback_audit(company_data, financial_data, transactions)
    
    def _fallback_audit(self, company_data: Dict, financial_data: Dict, 
                       transactions: List[Dict]) -> Dict[str, Any]:
        """Fallback rule-based audit when API is not available"""
        print("[AUDIT] Using fallback rule-based audit")
        
        # Basic analysis
        total_amount = financial_data.get('total_amount', 0)
        transaction_count = financial_data.get('total_transactions', 0)
        
        # Risk assessment based on data patterns
        risks = []
        findings = []
        
        # Check for unusual patterns
        if transaction_count > 0:
            avg_transaction = total_amount / transaction_count
            if avg_transaction > 100000:
                risks.append("High-value transactions detected - requires additional scrutiny")
        
        # Check category distribution
        categories = financial_data.get('category_breakdown', {})
        if len(categories) < 3:
            findings.append("Limited expense categories - may indicate incomplete categorization")
        
        return {
            "audit_summary": {
                "audit_date": datetime.now().isoformat(),
                "company_name": company_data.get('company_name', 'Unknown'),
                "overall_risk_score": 60,
                "compliance_score": 70,
                "financial_health_score": 65,
                "audit_status": "CONDITIONAL",
                "note": "Rule-based audit (Gemini API not configured)"
            },
            "financial_compliance": {
                "gaap_compliance": "PARTIALLY_COMPLIANT",
                "issues": ["Complete financial statements not provided"],
                "recommendations": ["Submit full financial statements for comprehensive audit"]
            },
            "fraud_detection": {
                "suspicious_transactions": [],
                "anomalies_detected": risks,
                "risk_level": "MEDIUM",
                "findings": findings
            },
            "risk_assessment": {
                "financial_risks": risks,
                "operational_risks": [],
                "compliance_risks": [],
                "overall_risk_level": "MEDIUM"
            },
            "internal_controls": {
                "strengths": ["Transaction data provided"],
                "weaknesses": ["Limited documentation"],
                "improvement_areas": ["Enhanced transaction categorization"]
            },
            "regulatory_compliance": {
                "tax_compliance": "REVIEW_REQUIRED",
                "statutory_compliance": "REVIEW_REQUIRED",
                "issues": ["Full compliance check requires additional documents"],
                "actions_required": ["Submit tax returns and statutory documents"]
            },
            "operational_analysis": {
                "revenue_trends": "Insufficient data for trend analysis",
                "expense_trends": "Analysis based on provided transactions",
                "budget_variance": "Budget not provided",
                "key_metrics": [
                    f"Total transactions: {transaction_count}",
                    f"Total amount: ₹{total_amount:,.2f}"
                ]
            },
            "recommendations": {
                "critical": ["Install ML libraries for comprehensive fraud detection"],
                "high_priority": ["Submit complete financial statements"],
                "medium_priority": ["Improve transaction categorization"],
                "low_priority": ["Implement regular audit schedule"]
            },
            "metadata": {
                "audit_performed_at": datetime.now().isoformat(),
                "model_used": "rule-based-fallback",
                "total_transactions_analyzed": len(transactions)
            }
        }

