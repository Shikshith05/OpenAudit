import pandas as pd
from typing import Dict, List, Any
import re
from datetime import datetime
from collections import defaultdict

class AnalysisService:
    """Service for analyzing financial data and generating spending insights"""
    
    # Category keywords mapping
    # NOTE: This is RULE-BASED keyword matching, NOT AI/ML
    # Transactions are categorized by matching keywords in descriptions
    CATEGORY_KEYWORDS = {
        'Entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'game', 'entertainment', 'streaming', 'music', 'theater', 'ticket', 'concert', 'show', 'theatre'],
        'Food': ['restaurant', 'food', 'cafe', 'grocery', 'supermarket', 'dining', 'eat', 'lunch', 'dinner', 'breakfast', 'zomato', 'swiggy', 'pizza', 'burger', 'mcdonalds', 'dominos', 'kfc', 'starbucks', 'foodpanda', 'ubereats'],
        'Travel': ['flight', 'hotel', 'taxi', 'uber', 'travel', 'trip', 'booking', 'train', 'bus', 'transport', 'ola', 'makemytrip', 'goibibo', 'yatra', 'airline', 'airport', 'railway'],
        'Utilities': ['electricity', 'water', 'gas', 'internet', 'phone', 'utility', 'bill', 'utility bill', 'bsnl', 'airtel', 'jio', 'vodafone', 'reliance', 'mobile', 'broadband', 'district', 'municipal', 'corporation'],
        'Education': ['school', 'university', 'course', 'education', 'tuition', 'book', 'textbook', 'learning', 'college', 'institute', 'coaching', 'tuition fee', 'exam', 'admission'],
        'Healthcare': ['hospital', 'doctor', 'pharmacy', 'medical', 'health', 'medicine', 'clinic', 'apollo', 'medplus', 'wellness', 'diagnostic', 'lab', 'pharma'],
        'Shopping': ['amazon', 'flipkart', 'shopping', 'store', 'mall', 'purchase', 'buy', 'myntra', 'nykaa', 'snapdeal', 'ajio', 'meesho', 'online'],
        'Savings': ['savings', 'deposit', 'investment', 'fd', 'fixed deposit', 'recurring deposit', 'rd', 'mutual fund', 'sip', 'insurance', 'ppf', 'epf', 'zerodha', 'groww', 'upstox', 'paytm money', 'bse', 'nse', 'stock', 'trading', 'broker'],
        'Subscriptions': ['subscription', 'monthly', 'annual', 'premium', 'membership', 'renewal', 'plan', 'google', 'netflix', 'spotify', 'amazon prime'],
        'Transport': ['fuel', 'petrol', 'diesel', 'parking', 'metro', 'subway', 'auto', 'rickshaw', 'cab', 'cng', 'gas station', 'petrol pump', 'uber', 'ola', 'rapido'],
        'Payments': ['upi', 'paytm', 'phonepe', 'google pay', 'gpay', 'bhimpay', 'neokred', 'payment', 'transfer', 'vishwas', 'pavan'],
        'Other': []
    }
    
    def process_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process raw financial data"""
        # Ensure date column is datetime
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
        
        # Ensure amount is numeric
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        
        # Remove rows with invalid descriptions (required)
        df = df.dropna(subset=['description'])
        
        # Check if DataFrame is empty after removing invalid descriptions
        if len(df) == 0:
            # This shouldn't happen, but create a placeholder transaction
            df = pd.DataFrame([{
                'amount': 0.0,
                'description': 'No valid transactions found',
                'date': datetime.now()
            }])
        
        # Fill NaN amounts with 0 (but keep the rows)
        df['amount'] = df['amount'].fillna(0)
        
        # Ensure amounts are non-negative (use absolute values for expenses)
        # This treats negative amounts as positive expenses
        df['amount'] = df['amount'].abs()
        
        # Convert DataFrame to dict and ensure all dates are strings for JSON serialization
        transactions_list = []
        for _, row in df.iterrows():
            amount_val = float(row['amount'])  # Already absolute at this point
            transaction = {
                'amount': amount_val,  # Already absolute
                'description': str(row['description'])
            }
            # Convert date to string if present
            if 'date' in df.columns and pd.notna(row['date']):
                if hasattr(row['date'], 'isoformat'):
                    transaction['date'] = row['date'].isoformat()
                elif hasattr(row['date'], 'strftime'):
                    transaction['date'] = row['date'].strftime('%Y-%m-%d')
                else:
                    transaction['date'] = str(row['date'])
            else:
                transaction['date'] = None
            
            transactions_list.append(transaction)
        
        # Calculate date range
        date_start = None
        date_end = None
        if 'date' in df.columns and not df['date'].isna().all():
            date_min = df['date'].min()
            date_max = df['date'].max()
            if pd.notna(date_min):
                date_start = date_min.isoformat() if hasattr(date_min, 'isoformat') else str(date_min)
            if pd.notna(date_max):
                date_end = date_max.isoformat() if hasattr(date_max, 'isoformat') else str(date_max)
        
        # total_amount = sum of amounts (already absolute after processing)
        total_amount = float(df['amount'].sum())
        
        return {
            "total_transactions": len(df),
            "total_amount": total_amount,  # Total expenses (sum of absolute amounts)
            "date_range": {
                "start": date_start,
                "end": date_end
            },
            "transactions": transactions_list
        }
    
    def categorize_expenses(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Categorize expenses based on description"""
        categorized = defaultdict(list)
        category_totals = defaultdict(float)
        uncategorized = []
        
        for _, row in df.iterrows():
            description = str(row.get('description', '')).lower()
            # Amount is already absolute from process_data
            amount = float(row.get('amount', 0))
            # Ensure it's positive (defensive check)
            amount = abs(amount)
            
            category_found = False
            for category, keywords in self.CATEGORY_KEYWORDS.items():
                if category == 'Other':
                    continue
                # Check if any keyword matches in the description (case-insensitive)
                if any(keyword.lower() in description for keyword in keywords):
                    # Convert date to string if it's a Timestamp/datetime
                    date_val = row.get('date', '')
                    if hasattr(date_val, 'isoformat'):
                        date_val = date_val.isoformat()
                    elif hasattr(date_val, 'strftime'):
                        date_val = date_val.strftime('%Y-%m-%d')
                    else:
                        date_val = str(date_val) if date_val else ''
                    
                    categorized[category].append({
                        'description': row.get('description', ''),
                        'amount': amount,
                        'date': date_val
                    })
                    category_totals[category] += amount
                    category_found = True
                    break
            
            if not category_found:
                # Convert date to string if it's a Timestamp/datetime
                date_val = row.get('date', '')
                if hasattr(date_val, 'isoformat'):
                    date_val = date_val.isoformat()
                elif hasattr(date_val, 'strftime'):
                    date_val = date_val.strftime('%Y-%m-%d')
                else:
                    date_val = str(date_val) if date_val else ''
                
                categorized['Other'].append({
                    'description': row.get('description', ''),
                    'amount': amount,
                    'date': date_val
                })
                category_totals['Other'] += amount
        
        # Calculate percentages
        # total_amount = sum of all expenses (already absolute values)
        total_debits = sum(category_totals.values())
        
        # Ensure we have a valid total (use sum of actual amounts from DataFrame if category totals are 0)
        if total_debits == 0:
            # Fallback: sum all amounts from DataFrame
            total_debits = float(df['amount'].sum()) if 'amount' in df.columns else 0.0
        
        category_percentages = {
            cat: (amt / total_debits * 100) if total_debits > 0 else 0 
            for cat, amt in category_totals.items()
        }
        
        return {
            "categories": dict(categorized),
            "category_totals": dict(category_totals),
            "category_percentages": category_percentages,
            "total_amount": total_debits,  # Total expenses (debits)
            "transaction_count": len(df)
        }
    
    def generate_spending_insights(self, categorized_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate insights from categorized spending data"""
        category_percentages = categorized_data['category_percentages']
        category_totals = categorized_data['category_totals']
        total = categorized_data['total_amount']
        
        # Find top spending categories
        sorted_categories = sorted(
            category_percentages.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        top_category = sorted_categories[0] if sorted_categories else None
        
        insights = {
            "top_category": {
                "name": top_category[0] if top_category else "N/A",
                "percentage": round(top_category[1], 2) if top_category else 0,
                "amount": round(category_totals.get(top_category[0], 0), 2) if top_category else 0
            },
            "category_breakdown": {
                cat: {
                    "percentage": round(perc, 2),
                    "amount": round(category_totals.get(cat, 0), 2)
                }
                for cat, perc in category_percentages.items()
            },
            "total_spent": round(total, 2),
            "transaction_count": categorized_data['transaction_count']
        }
        
        return insights
    
    def generate_visualization_data(self, categorized_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate data for visualizations"""
        category_percentages = categorized_data['category_percentages']
        category_totals = categorized_data['category_totals']
        
        # Prepare data for charts - include all categories, even if amount is 0
        pie_chart_data = [
            {"name": cat, "value": round(amt, 2)}
            for cat, amt in category_totals.items() if amt > 0  # Only show categories with spending
        ]
        
        bar_chart_data = [
            {"name": cat, "value": round(amt, 2), "category": cat, "amount": round(amt, 2), "percentage": round(perc, 2)}
            for cat, (amt, perc) in zip(category_totals.keys(), 
                                       zip(category_totals.values(), category_percentages.values()))
            if amt > 0  # Only show categories with spending
        ]
        
        return {
            "pie_chart": pie_chart_data,
            "bar_chart": sorted(bar_chart_data, key=lambda x: x['amount'], reverse=True),
            "summary_stats": {
                "total_categories": len([cat for cat, amt in category_totals.items() if amt > 0]),
                "largest_category": max(category_totals.items(), key=lambda x: x[1])[0] if category_totals else None,
                "smallest_category": min(category_totals.items(), key=lambda x: x[1])[0] if category_totals else None
            }
        }

