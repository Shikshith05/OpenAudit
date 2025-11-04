#!/usr/bin/env python3
"""Test the full analyze endpoint flow"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Simulate the analyze endpoint flow
import pandas as pd
from main import normalize_transactions
from services.analysis_service import AnalysisService
from services.scoring_service import ScoringService

# Test data matching bank statement
test_data = """Date,Details,Ref No./Cheque No,Debit,Credit,Balance
31 OCT 2025,TRANSFER TO 4897695162091 - UPI/DR/530412682538/VISHWAS/ES FB/neokred.85/fVxRLR,,100.00,-,2135.42
31 OCT 2025,TRANSFER TO 4897695162091 - UPI/DR/530412662389/VISHWAS/ES FB/neokred.85/kDFqxS,,2000.00,-,2235.42
31 OCT 2025,TRANSFER FROM 4897737162096 - UPI/CR/626655854199/G A AADISH/CNRB/7411866860/Pay,,-,1250.00,4235.42
31 OCT 2025,TRANSFER TO 4897695162091 - UPI/DR/530411681285/Dishanth/SBIN /8217504156/print,,2.00,-,2980.42
31 OCT 2025,TRANSFER TO 4897695162091 - UPI/DR/530483611754/DISTRICT/HD FC/districtmo/UPIIn,,360.80,-,2802.42
30 OCT 2025,TRANSFER TO 4897694162092 - UPI/DR/566949312084/ZERODHA /HDFC/zerodhabro/25609,,300.00,-,3163.22
30 OCT 2025,TRANSFER TO 4897694162092 - UPI/DR/530358047301/ZERODHA /HDFC/zerodhabro/27514,,1000.00,-,3463.22"""

print("=" * 70)
print("TESTING FULL ANALYSIS FLOW")
print("=" * 70)

# Step 1: Read CSV
from io import StringIO
df = pd.read_csv(StringIO(test_data))
print(f"\n1. Loaded DataFrame: {df.shape}")

# Step 2: Normalize transactions
transactions = normalize_transactions(df)
print(f"2. Normalized transactions: {len(transactions)}")
total_from_txns = sum(t.get('amount', 0) for t in transactions)
print(f"   Total from transactions: ₹{total_from_txns:.2f}")

# Step 3: Convert to DataFrame for analysis
df_for_analysis = pd.DataFrame(transactions)
print(f"3. DataFrame for analysis: {df_for_analysis.shape}")
print(f"   Amount column sum: ₹{df_for_analysis['amount'].sum():.2f}")

# Step 4: Process data
analysis_service = AnalysisService()
processed_data = analysis_service.process_data(df_for_analysis)
print(f"4. Processed data:")
print(f"   total_transactions: {processed_data.get('total_transactions')}")
print(f"   total_amount: ₹{processed_data.get('total_amount'):.2f}")

# Step 5: Categorize expenses
categorized_data = analysis_service.categorize_expenses(df_for_analysis)
print(f"5. Categorized data:")
print(f"   total_amount: ₹{categorized_data.get('total_amount'):.2f}")
print(f"   transaction_count: {categorized_data.get('transaction_count')}")

# Step 6: Generate insights
insights = analysis_service.generate_spending_insights(categorized_data)
print(f"6. Insights:")
print(f"   total_spent: ₹{insights.get('total_spent'):.2f}")
print(f"   transaction_count: {insights.get('transaction_count')}")
print(f"   category_breakdown keys: {list(insights.get('category_breakdown', {}).keys())}")

# Step 7: Generate visualizations
visualizations = analysis_service.generate_visualization_data(categorized_data)
print(f"7. Visualizations:")
print(f"   pie_chart entries: {len(visualizations.get('pie_chart', []))}")
print(f"   bar_chart entries: {len(visualizations.get('bar_chart', []))}")

# Final check
if insights.get('total_spent', 0) > 0:
    print(f"\n✅ SUCCESS: Full flow works! Total spent: ₹{insights.get('total_spent'):.2f}")
    print(f"   Expected: ₹3762.80")
else:
    print(f"\n❌ FAILED: total_spent is zero!")

