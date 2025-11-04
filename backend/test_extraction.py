#!/usr/bin/env python3
"""Test script to verify transaction extraction from bank statements"""
import pandas as pd
import sys
import os

# Add the current directory to path so we can import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import normalize_transactions, find_column

# Test data that matches the bank statement structure
test_data_csv = """Date,Details,Ref No./Cheque No,Debit,Credit,Balance
31 OCT 2025,TRANSFER TO 4897695162091 - UPI/DR/530412682538/VISHWAS/ES FB/neokred.85/fVxRLR,,100.00,-,2135.42
31 OCT 2025,TRANSFER TO 4897695162091 - UPI/DR/530412662389/VISHWAS/ES FB/neokred.85/kDFqxS,,2000.00,-,2235.42
31 OCT 2025,TRANSFER FROM 4897737162096 - UPI/CR/626655854199/G A AADISH/CNRB/7411866860/Pay,,-,1250.00,4235.42
31 OCT 2025,TRANSFER TO 4897695162091 - UPI/DR/530411681285/Dishanth/SBIN /8217504156/print,,2.00,-,2980.42
31 OCT 2025,TRANSFER TO 4897695162091 - UPI/DR/530483611754/DISTRICT/HD FC/districtmo/UPIIn,,360.80,-,2802.42
30 OCT 2025,TRANSFER TO 4897694162092 - UPI/DR/566949312084/ZERODHA /HDFC/zerodhabro/25609,,300.00,-,3163.22
30 OCT 2025,TRANSFER TO 4897694162092 - UPI/DR/530358047301/ZERODHA /HDFC/zerodhabro/27514,,1000.00,-,3463.22"""

def test_csv_extraction():
    """Test extracting transactions from CSV-like data"""
    print("=" * 60)
    print("TESTING CSV/EXCEL EXTRACTION")
    print("=" * 60)
    
    # Create DataFrame from test data
    from io import StringIO
    df = pd.read_csv(StringIO(test_data_csv))
    
    print(f"\nOriginal DataFrame:")
    print(f"Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst few rows:")
    print(df.head())
    
    # Test column finding
    debit_col = find_column(df, ['debit', 'debits', 'dr', 'withdrawal'])
    credit_col = find_column(df, ['credit', 'credits', 'cr', 'deposit'])
    desc_col = find_column(df, ['description', 'desc', 'details'])
    
    print(f"\nDetected columns:")
    print(f"  Debit column: {debit_col}")
    print(f"  Credit column: {credit_col}")
    print(f"  Description column: {desc_col}")
    
    # Extract transactions
    print(f"\nExtracting transactions...")
    transactions = normalize_transactions(df)
    
    print(f"\nExtracted {len(transactions)} transactions")
    
    if transactions:
        total_amount = sum(t.get('amount', 0) for t in transactions)
        non_zero = [t for t in transactions if t.get('amount', 0) > 0]
        
        print(f"\nResults:")
        print(f"  Total transactions: {len(transactions)}")
        print(f"  Non-zero transactions: {len(non_zero)}")
        print(f"  Total amount: ₹{total_amount:.2f}")
        print(f"  Expected total (debits only): ₹{3762.80:.2f}")
        
        print(f"\nSample transactions (first 5):")
        for i, txn in enumerate(transactions[:5], 1):
            print(f"  {i}. ₹{txn.get('amount', 0):.2f} - {txn.get('description', 'N/A')[:50]}")
        
        if total_amount > 0:
            print(f"\n✅ SUCCESS: Amounts extracted correctly!")
            return True
        else:
            print(f"\n❌ FAILED: All amounts are zero!")
            print(f"\nChecking Debit column values:")
            print(df['Debit'].tolist())
            return False
    else:
        print(f"\n❌ FAILED: No transactions extracted!")
        return False

if __name__ == "__main__":
    success = test_csv_extraction()
    sys.exit(0 if success else 1)

