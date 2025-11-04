import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from collections import defaultdict
from scipy.stats import chi2_contingency

class BiasDetectionService:
    """Service for detecting bias and inequality in financial or decision data"""
    
    def detect_bias(self, df: pd.DataFrame, sensitive_attributes: List[str], 
                   decision_attribute: str = "approved") -> Dict[str, Any]:
        """Detect bias in dataset based on sensitive attributes"""
        
        if not sensitive_attributes:
            return {
                "error": "No sensitive attributes provided",
                "bias_detected": False
            }
        
        results = {
            "bias_metrics": {},
            "disparity_analysis": {},
            "statistical_tests": {},
            "bias_detected": False,
            "severity": "none"
        }
        
        # Analyze each sensitive attribute
        for attr in sensitive_attributes:
            if attr not in df.columns:
                continue
            
            bias_analysis = self._analyze_attribute_bias(df, attr, decision_attribute)
            results["bias_metrics"][attr] = bias_analysis
        
        # Determine overall bias
        overall_bias = self._determine_overall_bias(results["bias_metrics"])
        results["bias_detected"] = overall_bias["detected"]
        results["severity"] = overall_bias["severity"]
        results["summary"] = overall_bias["summary"]
        
        return results
    
    def _analyze_attribute_bias(self, df: pd.DataFrame, attr: str, decision_attr: str) -> Dict[str, Any]:
        """Analyze bias for a specific attribute"""
        
        # Group by attribute values
        groups = df.groupby(attr)
        
        # Calculate approval/positive rates
        group_stats = {}
        for group_name, group_df in groups:
            total = len(group_df)
            positive = len(group_df[group_df[decision_attr] == 1]) if decision_attr in group_df.columns else 0
            
            positive_rate = (positive / total * 100) if total > 0 else 0
            
            group_stats[group_name] = {
                "total": total,
                "positive": positive,
                "positive_rate": round(positive_rate, 2),
                "percentage_of_total": round((total / len(df) * 100), 2)
            }
        
        # Calculate disparity metrics
        positive_rates = [stats["positive_rate"] for stats in group_stats.values()]
        avg_rate = np.mean(positive_rates)
        
        # Calculate difference in positive rates
        max_rate = max(positive_rates)
        min_rate = min(positive_rates)
        disparity_ratio = max_rate / min_rate if min_rate > 0 else float('inf')
        disparity_percentage = max_rate - min_rate
        
        # Statistical significance test (chi-square)
        contingency_table = []
        for group_name, stats_data in group_stats.items():
            group_df = groups.get_group(group_name)
            positive = stats_data["positive"]
            negative = len(group_df) - positive
            contingency_table.append([positive, negative])
        
        if len(contingency_table) >= 2:
            try:
                chi2, p_value = chi2_contingency(np.array(contingency_table))[:2]
            except:
                chi2, p_value = 0, 1.0
        else:
            chi2, p_value = 0, 1.0
        
        # Determine bias level
        bias_level = self._classify_bias_level(disparity_ratio, disparity_percentage, p_value)
        
        return {
            "group_statistics": group_stats,
            "disparity_ratio": round(disparity_ratio, 2),
            "disparity_percentage": round(disparity_percentage, 2),
            "average_rate": round(avg_rate, 2),
            "statistical_test": {
                "chi_square": round(chi2, 4) if chi2 else 0,
                "p_value": round(p_value, 4) if p_value else 1.0,
                "significant": p_value < 0.05 if p_value else False
            },
            "bias_level": bias_level
        }
    
    def _classify_bias_level(self, disparity_ratio: float, disparity_pct: float, p_value: float) -> str:
        """Classify the level of bias"""
        if disparity_ratio >= 2.0 or disparity_pct >= 30:
            return "severe"
        elif disparity_ratio >= 1.5 or disparity_pct >= 20:
            if p_value < 0.05:
                return "moderate"
            return "mild"
        elif disparity_ratio >= 1.2 or disparity_pct >= 10:
            if p_value < 0.05:
                return "mild"
            return "minimal"
        else:
            return "none"
    
    def _determine_overall_bias(self, bias_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Determine overall bias from all attribute analyses"""
        
        if not bias_metrics:
            return {
                "detected": False,
                "severity": "none",
                "summary": "No sensitive attributes analyzed"
            }
        
        severities = []
        for attr, analysis in bias_metrics.items():
            bias_level = analysis.get("bias_level", "none")
            severities.append(bias_level)
        
        # Determine overall severity
        if "severe" in severities:
            severity = "severe"
            detected = True
            summary = "Severe bias detected in the dataset. Immediate action recommended."
        elif "moderate" in severities:
            severity = "moderate"
            detected = True
            summary = "Moderate bias detected. Review and adjust decision processes."
        elif "mild" in severities:
            severity = "mild"
            detected = True
            summary = "Mild bias detected. Monitor and consider adjustments."
        else:
            severity = "minimal"
            detected = False
            summary = "Minimal or no significant bias detected."
        
        return {
            "detected": detected,
            "severity": severity,
            "summary": summary
        }
    
    def generate_recommendations(self, bias_results: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on bias detection results"""
        
        recommendations = []
        
        if not bias_results.get("bias_detected", False):
            recommendations.append("✅ No significant bias detected. Continue monitoring for fairness.")
            return recommendations
        
        severity = bias_results.get("severity", "none")
        
        if severity == "severe":
            recommendations.append("🚨 CRITICAL: Severe bias detected. Immediate review of decision processes required.")
            recommendations.append("Action: Audit decision criteria and remove discriminatory factors.")
            recommendations.append("Action: Implement fairness constraints in decision algorithms.")
        elif severity == "moderate":
            recommendations.append("⚠️ WARNING: Moderate bias detected. Review decision-making processes.")
            recommendations.append("Action: Analyze decision criteria for unintended discrimination.")
            recommendations.append("Action: Consider implementing fairness-aware algorithms.")
        elif severity == "mild":
            recommendations.append("ℹ️ INFO: Mild bias detected. Monitor and consider adjustments.")
            recommendations.append("Action: Track metrics over time to ensure improvement.")
        
        # Attribute-specific recommendations
        bias_metrics = bias_results.get("bias_metrics", {})
        for attr, analysis in bias_metrics.items():
            bias_level = analysis.get("bias_level", "none")
            if bias_level in ["severe", "moderate"]:
                disparity = analysis.get("disparity_percentage", 0)
                recommendations.append(
                    f"📊 {attr}: Address disparity of {disparity:.1f}% between groups in {attr}."
                )
        
        recommendations.append("💡 Consider using bias mitigation techniques like demographic parity or equalized odds.")
        recommendations.append("📈 Implement regular bias audits to ensure continuous fairness.")
        
        return recommendations

