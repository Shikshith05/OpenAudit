# Database Schema Documentation

## History Database Structure (`history.json`)

The history database stores all financial analysis records for both personal and company users.

### Root Structure
```json
{
  "analyses": [
    // Array of analysis records
  ]
}
```

### Analysis Record Schema

Each analysis record contains the following columns/fields:

#### **Primary Identifiers**
- **`id`** (string): Unique analysis ID (format: `analysis_{timestamp}`)
  - Example: `"analysis_1727788123.456789"`
  - Purpose: Unique identifier for each analysis

- **`user_id`** (string): ID of the user who performed the analysis
  - Example: `"3VSdcBhkiCKfnYe-BLPBpA"`
  - Purpose: Links analysis to user account

- **`account_type`** (string): Type of account that performed analysis
  - Values: `"personal"` or `"company"`
  - Example: `"company"`
  - Purpose: Distinguishes between personal and company analyses

#### **Timestamp**
- **`created_at`** (string): ISO format datetime when analysis was created
  - Format: `"YYYY-MM-DDTHH:MM:SS.microseconds"`
  - Example: `"2025-11-01T14:23:45.123456"`
  - Purpose: Sort and filter analyses by date

#### **Financial Summary**
- **`total_transactions`** (integer): Total number of transactions analyzed
  - Example: `1523`
  - Purpose: Quick overview of data volume

- **`total_amount`** (number): Total amount of all transactions (in rupees)
  - Example: `2456789.50`
  - Purpose: Total spending/revenue amount

- **`date_range`** (object): Date range of transactions analyzed
  - Structure:
    ```json
    {
      "start": "2024-01-01",  // ISO date string (optional)
      "end": "2024-12-31"     // ISO date string (optional)
    }
    ```
  - Purpose: Shows the time period covered by analysis

#### **Analysis Results**
- **`smart_score`** (object): Financial health score
  - Structure:
    ```json
    {
      "score": 7.5,                    // Score out of 10
      "spender_rating": "Moderate",    // Rating: "Excellent", "Good", "Moderate", "Poor"
      "interpretation": "Your spending patterns are moderate.",
      "recommendations": [             // Array of recommendation strings
        "Review subscriptions monthly",
        "Set budget limits for categories"
      ]
    }
    ```
  - Purpose: Stores the calculated financial health score

- **`insights_summary`** (object): Summary of key insights (to save space, not full insights)
  - Structure:
    ```json
    {
      "top_category": {                // Top spending category
        "name": "Food",                 // Category name
        "amount": 50000.00,            // Amount spent in this category
        "percentage": 25.5             // Percentage of total spending
      },
      "category_count": 8              // Number of categories found
    }
    ```
  - Purpose: Quick reference to key insights without storing full analysis

#### **Data Quality Information**
- **`file_errors`** (array): List of errors found during file processing
  - Structure:
    ```json
    [
      {
        "filename": "company_transactions.csv",
        "errors": [
          "Missing required columns. Expected: Amount, Description, Date",
          "Found 5 rows with missing Amount values"
        ]
      }
    ]
    ```
  - Purpose: Track data quality issues for each file analyzed

- **`file_warnings`** (array): List of warnings found during file processing
  - Structure:
    ```json
    [
      {
        "filename": "company_transactions.csv",
        "warnings": [
          "Found 12 duplicate rows. These will be removed before processing.",
          "Removed 3 rows with missing Amount or Description values.",
          "Processed 1520 valid rows out of 1523 total rows."
        ]
      }
    ]
    ```
  - Purpose: Track non-critical issues and data cleaning actions

### Complete Example Record

```json
{
  "id": "analysis_1727788123.456789",
  "user_id": "3VSdcBhkiCKfnYe-BLPBpA",
  "account_type": "company",
  "created_at": "2025-11-01T14:23:45.123456",
  "total_transactions": 1523,
  "total_amount": 2456789.50,
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "smart_score": {
    "score": 7.5,
    "spender_rating": "Moderate",
    "interpretation": "Your spending patterns are moderate.",
    "recommendations": [
      "Review subscriptions monthly",
      "Set budget limits for categories"
    ]
  },
  "insights_summary": {
    "top_category": {
      "name": "Food",
      "amount": 50000.00,
      "percentage": 25.5
    },
    "category_count": 8
  },
  "file_errors": [],
  "file_warnings": [
    {
      "filename": "company_transactions.csv",
      "warnings": [
        "Found 12 duplicate rows. These will be removed before processing.",
        "Removed 3 rows with missing Amount or Description values.",
        "Processed 1520 valid rows out of 1523 total rows."
      ]
    }
  ]
}
```

## Column Headers Summary

### Required Fields (Always Present)
1. `id` - Unique analysis identifier
2. `user_id` - User who created the analysis
3. `account_type` - Type of account ("personal" or "company")
4. `created_at` - When analysis was created
5. `total_transactions` - Number of transactions
6. `total_amount` - Total financial amount
7. `date_range` - Start and end dates (may be empty)

### Optional Fields (Conditional)
8. `smart_score` - Financial health score (present if analysis successful)
9. `insights_summary` - Key insights summary (present if analysis successful)
10. `file_errors` - List of errors (empty array if no errors)
11. `file_warnings` - List of warnings (empty array if no warnings)

## File Location
- **Path**: `backend/database/history.json`
- **Format**: JSON
- **Structure**: Root object with `analyses` array containing all analysis records

