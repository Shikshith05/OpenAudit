from typing import Dict, Any, List
from datetime import datetime

class NLGService:
    """Natural Language Generation service for creating plain-language reports"""
    
    def generate_report(self, spending_insights: Dict[str, Any], smart_score: Dict[str, Any]) -> Dict[str, Any]:
        """Generate natural language report from spending insights and score"""
        
        report_sections = []
        
        # Introduction
        total_spent = spending_insights.get("total_spent", 0)
        transaction_count = spending_insights.get("transaction_count", 0)
        
        intro = f"Based on your financial analysis of {transaction_count} transactions totaling ₹{total_spent:,.2f}, here's your comprehensive spending report."
        report_sections.append(intro)
        
        # Top category
        top_category = spending_insights.get("top_category", {})
        if top_category:
            top_name = top_category.get("name", "N/A")
            top_percentage = top_category.get("percentage", 0)
            top_amount = top_category.get("amount", 0)
            
            top_section = (
                f"Your largest expense category is {top_name}, accounting for {top_percentage:.1f}% "
                f"of your spending (₹{top_amount:,.2f})."
            )
            report_sections.append(top_section)
        
        # Category breakdown
        category_breakdown = spending_insights.get("category_breakdown", {})
        notable_categories = [
            (cat, data) for cat, data in category_breakdown.items()
            if data.get("percentage", 0) > 5
        ]
        
        if notable_categories:
            category_texts = []
            for cat, data in sorted(notable_categories, key=lambda x: x[1]["percentage"], reverse=True):
                pct = data.get("percentage", 0)
                amt = data.get("amount", 0)
                category_texts.append(f"{cat} ({pct:.1f}% - ₹{amt:,.2f})")
            
            breakdown_text = (
                "Your spending is distributed across the following categories: "
                + ", ".join(category_texts[:-1]) + 
                (f", and {category_texts[-1]}" if len(category_texts) > 1 else category_texts[0])
                + "."
            )
            report_sections.append(breakdown_text)
        
        # Smart Score section
        score_value = smart_score.get("score", 0)
        score_interpretation = smart_score.get("interpretation", "")
        
        score_section = (
            f"Your Smart Spending Score is {score_value:.1f}/10. {score_interpretation}"
        )
        report_sections.append(score_section)
        
        # Recommendations
        recommendations = smart_score.get("recommendations", [])
        if recommendations:
            report_sections.append("\nRecommendations:")
            for i, rec in enumerate(recommendations[:3], 1):  # Top 3 recommendations
                report_sections.append(f"{i}. {rec}")
        
        # Generate summary
        summary = self._generate_summary(spending_insights, smart_score)
        
        full_report = "\n\n".join(report_sections)
        
        return {
            "full_report": full_report,
            "summary": summary,
            "generated_at": datetime.now().isoformat(),
            "sections": {
                "introduction": intro,
                "top_category": top_section if top_category else None,
                "breakdown": breakdown_text if notable_categories else None,
                "score": score_section,
                "recommendations": recommendations[:3]
            }
        }
    
    def _generate_summary(self, spending_insights: Dict[str, Any], smart_score: Dict[str, Any]) -> str:
        """Generate a concise summary"""
        total_spent = spending_insights.get("total_spent", 0)
        top_category = spending_insights.get("top_category", {})
        score = smart_score.get("score", 0)
        
        top_name = top_category.get("name", "various categories") if top_category else "various categories"
        
        summary = (
            f"Total spending: ₹{total_spent:,.2f} | "
            f"Top category: {top_name} | "
            f"Smart Score: {score:.1f}/10"
        )
        
        return summary
    
    def generate_bias_report(self, bias_results: Dict[str, Any]) -> str:
        """Generate natural language report for bias detection"""
        
        bias_detected = bias_results.get("bias_detected", False)
        severity = bias_results.get("severity", "none")
        summary = bias_results.get("summary", "No analysis available.")
        
        if not bias_detected:
            return (
                "✅ Fairness Analysis Complete: "
                "No significant bias detected in your dataset. "
                "The decision process appears to be fair across different groups."
            )
        
        severity_descriptions = {
            "severe": "Severe bias has been detected. This indicates significant unfairness in the decision-making process that requires immediate attention.",
            "moderate": "Moderate bias has been detected. This suggests some unfairness that should be addressed to ensure equitable outcomes.",
            "mild": "Mild bias has been detected. While not critical, monitoring and minor adjustments are recommended."
        }
        
        report = (
            f"⚠️ Bias Detection Alert: {severity_descriptions.get(severity, 'Bias detected.')}\n\n"
            f"{summary}\n\n"
        )
        
        # Add details about specific attributes
        bias_metrics = bias_results.get("bias_metrics", {})
        if bias_metrics:
            report += "Detailed Analysis:\n"
            for attr, analysis in bias_metrics.items():
                bias_level = analysis.get("bias_level", "none")
                disparity_pct = analysis.get("disparity_percentage", 0)
                
                if bias_level != "none":
                    report += (
                        f"• {attr}: {bias_level.capitalize()} bias detected "
                        f"(disparity: {disparity_pct:.1f}%)\n"
                    )
        
        return report

