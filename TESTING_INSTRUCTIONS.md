# Testing Instructions - Personal Portal Analysis

## ✅ What I Fixed

1. **Debit Column Detection**: Now correctly detects and extracts from "Debit" column in CSV/Excel files
2. **Credit Transaction Skipping**: Automatically skips rows where Debit is "-" (credit transactions)
3. **Amount Extraction**: Properly extracts amounts like 100.00, 2000.00, etc.
4. **Full Flow**: Tested end-to-end - extraction → processing → analysis → insights

## 🔍 How to Test

1. **Start the backend server**:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Check the backend terminal** - You'll see debug logs like:
   - `[FILE DEBUG]` - Shows columns detected from your file
   - `[UPLOAD DEBUG]` - Shows amounts extracted from file
   - `[ANALYZE DEBUG]` - Shows amounts before analysis
   - `[ANALYZE FINAL]` - Shows final total_spent value

3. **Upload your bank statement file** (CSV/Excel/PDF)

4. **Watch the terminal** - The debug logs will show:
   - What columns were detected
   - What amounts were extracted
   - What the final total_spent is

## 🐛 If It Still Shows Zero

**Check the backend terminal logs**. The debug output will tell you:
- If the Debit column was detected correctly
- If amounts were extracted from the Debit column
- Where in the pipeline the amounts might be getting lost

## 📋 Example Expected Output

When you upload a file with:
- 31 OCT 2025: Debit ₹100.00
- 31 OCT 2025: Debit ₹2000.00
- 31 OCT 2025: Debit ₹2.00
- etc.

You should see in terminal:
```
[FILE DEBUG] Columns: ['Date', 'Details', 'Debit', 'Credit', 'Balance']
[FILE DEBUG] Extracted 6 transactions, total=3762.80, non-zero=6
[UPLOAD DEBUG] Total amount: 3762.80, Non-zero transactions: 6
[ANALYZE FINAL] total_spent in insights: 3762.80
```

And in the dashboard:
- **Total Spent: ₹3,762.80**
- **Transactions: 6**
- Charts showing category breakdown

## ⚠️ Important Notes

1. **CSV/Excel files**: Must have a "Debit" column. If your file uses different column names, it will try to detect automatically.

2. **PDF files**: Should be bank statements with table structure (Date, Details, Debit, Credit, Balance).

3. **Credit transactions**: Automatically skipped (only debit/expense transactions are analyzed).

4. **Server restart**: The server auto-reloads, but if you see old behavior, fully restart it.

## 🔧 Troubleshooting

If amounts are still zero:
1. Check terminal logs - they show exactly what's happening
2. Verify your file has a "Debit" column (or similar)
3. Check if amounts in Debit column are numeric (100.00, not text)
4. Make sure Debit column doesn't have "-" for all rows (those are credits)

The test script confirms everything works - if your file isn't working, the debug logs will show why!

