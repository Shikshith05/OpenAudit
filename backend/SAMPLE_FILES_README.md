# Sample Bank Statement Files for Testing

## Files Created:

1. **`sample_bank_statement.csv`**
   - Date format: `31 OCT 2025` (with spaces)
   - Contains 10 transactions (6 debits, 4 credits)
   - Total Debit Amount: **₹3,762.80**
   - Expected Results:
     - Total Spent: ₹3,762.80
     - Transactions: 6 (credits are skipped)
     - Categories: Payments, Utilities, Savings

2. **`sample_bank_statement_v2.csv`**
   - Date format: `31-OCT-2025` (with hyphens)
   - Contains 7 transactions (6 debits, 1 credit)
   - Total Debit Amount: **₹3,762.80**
   - Same expected results as above

## How to Use:

1. **Upload to Personal Portal:**
   - Go to Personal Login
   - Click "Upload Your Bank Statement"
   - Upload either CSV file
   - Should show ₹3,762.80 as Total Spent

2. **Upload to Company Portal:**
   - Same process for company accounts
   - Should work identically

## Expected Dashboard Results:

- **Total Spent:** ₹3,762.80
- **Transactions:** 6 (only debit transactions counted)
- **Top Categories:**
  - Payments (UPI transfers)
  - Utilities (DISTRICT transactions)
  - Savings (ZERODHA transactions)

## Transaction Breakdown:

### Debit Transactions (6):
1. ₹100.00 - TRANSFER TO ... VISHWAS ...
2. ₹2000.00 - TRANSFER TO ... VISHWAS ...
3. ₹2.00 - TRANSFER TO ... Dishanth ...
4. ₹360.80 - TRANSFER TO ... DISTRICT ...
5. ₹300.00 - TRANSFER TO ... ZERODHA ...
6. ₹1000.00 - TRANSFER TO ... ZERODHA ...

### Credit Transactions (Skipped):
- These are automatically skipped during analysis
- They show as "TRANSFER FROM" in Details column

## Testing:

If you upload these files and they work correctly, then:
✅ The extraction logic is working
✅ The issue might be with your actual bank statement format

If these files also show zero:
⚠️ Check the backend terminal logs for debug output
⚠️ The issue might be in the file upload or analysis pipeline

