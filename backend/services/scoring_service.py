from typing import Dict, Any
import statistics

class ScoringService:
    """Service for calculating Smart Spending Score"""
    
    # Ideal spending percentages by category
    IDEAL_PERCENTAGES = {
        'Food': 15.0,  # 15% of income
        'Entertainment': 10.0,
        'Travel': 5.0,
        'Utilities': 10.0,
        'Education': 10.0,
        'Healthcare': 5.0,
        'Shopping': 10.0,
        'Savings': 25.0,  # Should be highest
        'Subscriptions': 5.0,
        'Transport': 5.0,
        'Other': 0.0
    }
    
    def calculate_smart_score(self, categorized_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate Smart Spending Score based on spending patterns"""
        category_percentages = categorized_data['category_percentages']
        category_totals = categorized_data['category_totals']
        total = categorized_data['total_amount']
        
        score_components = {}
        total_score = 0
        max_possible_score = 0
        
        # Score based on adherence to ideal percentages
        for category, ideal_pct in self.IDEAL_PERCENTAGES.items():
            actual_pct = category_percentages.get(category, 0)
            
            # Calculate deviation from ideal
            if ideal_pct > 0:
                deviation = abs(actual_pct - ideal_pct)
                # Score: 10 points if exact match, 0 if 30%+ deviation
                component_score = max(0, 10 - (deviation / 3))
                score_components[category] = {
                    "ideal": ideal_pct,
                    "actual": round(actual_pct, 2),
                    "deviation": round(deviation, 2),
                    "score": round(component_score, 2)
                }
                total_score += component_score
                max_possible_score += 10
            else:
                # For "Other" category, lower is better
                if actual_pct > 5:
                    component_score = max(0, 10 - (actual_pct / 2))
                else:
                    component_score = 10
                score_components[category] = {
                    "ideal": 0,
                    "actual": round(actual_pct, 2),
                    "deviation": round(actual_pct, 2),
                    "score": round(component_score, 2)
                }
                total_score += component_score
                max_possible_score += 10
        
        # Savings bonus (critical component)
        savings_pct = category_percentages.get('Savings', 0)
        if savings_pct >= 25:
            savings_bonus = 10
        elif savings_pct >= 15:
            savings_bonus = 7
        elif savings_pct >= 10:
            savings_bonus = 5
        else:
            savings_bonus = max(0, savings_pct / 10 * 5)
        
        total_score += savings_bonus
        max_possible_score += 10
        
        # Calculate final score (0-10 scale)
        if max_possible_score > 0:
            final_score = (total_score / max_possible_score) * 10
        else:
            final_score = 0
        
        final_score = min(10, max(0, round(final_score, 1)))
        
        # Generate score interpretation
        interpretation = self._interpret_score(final_score, category_percentages)
        spender_rating = self.get_spender_rating(final_score)
        
        return {
            "score": final_score,
            "max_score": 10.0,
            "spender_rating": spender_rating,
            "components": score_components,
            "savings_bonus": round(savings_bonus, 2),
            "interpretation": interpretation,
            "recommendations": self._generate_recommendations(score_components, category_percentages)
        }
    
    def _interpret_score(self, score: float, category_percentages: Dict[str, float]) -> str:
        """Interpret the Smart Spending Score"""
        if score >= 8.5:
            return "Wise Spender! You manage your expenses excellently with a balanced spending pattern."
        elif score >= 7.0:
            return "Moderate Spender. Your spending habits are mostly on track, with room for minor improvements."
        elif score >= 5.5:
            return "Moderate Spender. Your spending patterns could be optimized. Consider reviewing your expense categories."
        elif score >= 4.0:
            return "Over-Spender. Significant changes to spending patterns would help your financial health."
        else:
            return "Over-Spender. Immediate attention needed to restructure spending and improve financial habits."
    
    def get_spender_rating(self, score: float) -> str:
        """Get spender rating category"""
        if score >= 8.5:
            return "Wise Spender"
        elif score >= 5.5:
            return "Moderate Spender"
        else:
            return "Over-Spender"
    
    def _generate_recommendations(self, components: Dict[str, Any], category_percentages: Dict[str, float]) -> list:
        """Generate recommendations based on score components"""
        recommendations = []
        
        # Check savings
        savings_pct = category_percentages.get('Savings', 0)
        if savings_pct < 15:
            recommendations.append(
                f"🚨 Priority: Increase savings to at least 15% of income (currently {savings_pct:.1f}%). "
                "Consider automating monthly transfers to savings."
            )
        
        # Find top spending category for optimization
        top_category = max(
            [(cat, data.get('actual', 0)) for cat, data in components.items() if cat != 'Other' and cat != 'Savings'],
            key=lambda x: x[1],
            default=None
        )
        
        if top_category:
            cat_name, cat_pct = top_category
            ideal_pct = components[cat_name].get('ideal', 0)
            if cat_pct > ideal_pct * 1.3:
                recommendations.append(
                    f"💡 Optimization: You're spending {cat_pct:.1f}% on {cat_name} (ideal: {ideal_pct:.1f}%). "
                    f"This is your highest spending category. Review and cut unnecessary expenses here first."
                )
        
        # Check for overspending categories
        overspending_cats = []
        for category, component in components.items():
            if category in ['Other', 'Savings']:
                continue
            deviation = component.get('deviation', 0)
            actual = component.get('actual', 0)
            ideal = component.get('ideal', 0)
            
            if actual > ideal * 1.5:  # 50% more than ideal
                overspending_cats.append((category, actual, ideal))
        
        if overspending_cats:
            for cat_name, actual, ideal in overspending_cats[:2]:  # Top 2
                recommendations.append(
                    f"⚠️ Reduce spending on {cat_name}. You're spending {actual:.1f}% "
                    f"(ideal: {ideal:.1f}%). This is {((actual/ideal - 1) * 100):.0f}% above recommended."
                )
        
        # Check subscriptions
        subs_pct = category_percentages.get('Subscriptions', 0)
        if subs_pct > 10:
            recommendations.append(
                "📺 Review subscriptions: You're spending a significant amount on subscriptions. "
                "Audit all your subscriptions and cancel unused services to save money."
            )
        
        # Check entertainment vs savings ratio
        entertainment_pct = category_percentages.get('Entertainment', 0)
        if entertainment_pct > savings_pct:
            recommendations.append(
                "💰 Balance alert: Entertainment spending exceeds savings. "
                "Try to reverse this ratio for better financial health - prioritize savings over entertainment."
            )
        
        # Check food spending
        food_pct = category_percentages.get('Food', 0)
        if food_pct > 20:
            recommendations.append(
                f"🍔 Food spending: You're spending {food_pct:.1f}% on food (ideal: 15%). "
                "Consider meal planning, cooking at home more, and reducing restaurant visits."
            )
        
        if not recommendations:
            recommendations.append(
                "✅ Excellent! Your spending patterns are well-balanced. "
                "Continue monitoring to maintain this healthy financial habit."
            )
        
        return recommendations

