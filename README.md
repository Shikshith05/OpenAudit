# OpenAudit - Financial Analysis & Bias Detection Platform

## Problem Statement

Financial tools and AI systems generate vast amounts of data, but most people can't easily understand or use this information effectively. Community groups, individuals, and small organizations often face significant barriers when trying to interpret insights — whether it's identifying hidden bias in AI-driven decisions or managing their personal financial patterns.

This knowledge gap creates two critical challenges:
- **Financial Blindness**: Users struggle to understand spending habits and make data-driven financial decisions
- **Fairness Blindness**: Organizations lack accessible tools to detect bias in decision-making processes

**OpenAudit** is an AI-powered platform that transforms complex financial and bias analysis results into clear, actionable insights that anyone can understand and act upon — no technical background required.

## About OpenAudit

OpenAudit is an open-source, web-based platform that empowers users, organizations, and small businesses to analyze their financial data, understand spending patterns, and detect unfair trends or biases in decision processes — all through a simple, easy-to-use interface.

## 🌟 Features

### 1. 💰 Expense Categorization & Spending Insights
- Automatically classifies transactions into meaningful categories (Entertainment, Food, Travel, Utilities, Education, Healthcare, etc.)
- Shows spending distribution and percentages for each category
- Identifies top spending categories

### 2. 📈 Smart Spending Score
- Calculates a Smart Spending Score (0-10) based on spending patterns
- Compares actual spending against ideal spending percentages
- Provides actionable recommendations for improving financial health

### 3. 🔍 Bias & Inequality Detection
- Detects bias in financial or decision datasets
- Analyzes sensitive attributes (gender, region, income level, etc.)
- Uses statistical tests to identify significant disparities
- Generates recommendations for addressing bias

### 4. 🧠 Plain-Language Financial Reporting
- Natural Language Generation (NLG) creates easy-to-understand reports
- Translates complex data into simple English summaries
- Provides clear insights without technical jargon

### 5. 📊 Interactive Visual Dashboards
- Beautiful pie charts and bar charts for spending visualization
- Category breakdown with progress bars
- Real-time data visualization

### 6. 🔒 Privacy-Focused
- All processing happens on your server
- No data sharing with third parties
- Secure FastAPI backend

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

Optional backend environment variables:
- `OPENAUDIT_CORS_ORIGINS` - Comma-separated list of allowed frontend origins.
- `OPENAUDIT_JWT_SECRET` - Overrides the development JWT signing key.
- `OPENAUDIT_OTP_DELIVERY_MODE` - Controls OTP delivery; defaults to the local `stub` logger.

4. Run the backend server:
```bash
python main.py
```

The backend will be running on `http://localhost:8000`

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be running on `http://localhost:3000`

## 📁 Project Structure

```
OpenAudit/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── services/
│   │   ├── analysis_service.py      # Expense categorization & insights
│   │   ├── scoring_service.py        # Smart Spending Score calculation
│   │   ├── bias_detection.py         # Bias detection algorithms
│   │   └── nlg_service.py             # Natural Language Generation
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ScoreDisplay.jsx
│   │   │   ├── ReportDisplay.jsx
│   │   │   └── BiasDetection.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 📊 Data Format

### Financial Data (CSV or JSON)

Required columns:
- `amount`: Transaction amount (numeric)
- `description`: Transaction description (text)
- `date`: Transaction date (YYYY-MM-DD)

**Sample CSV:**
```csv
amount,description,date
5000.00,Grocery Shopping,2024-01-15
1500.00,Netflix Subscription,2024-01-10
2500.00,Restaurant Dinner,2024-01-12
3000.00,Movie Tickets,2024-01-08
```

### Bias Detection Data (JSON)

**Sample JSON:**
```json
[
  {
    "gender": "male",
    "region": "urban",
    "income_level": "high",
    "approved": 1
  },
  {
    "gender": "female",
    "region": "rural",
    "income_level": "low",
    "approved": 0
  }
]
```

## 🔧 API Endpoints

### Upload File
```
POST /api/upload
Content-Type: multipart/form-data
Body: file (CSV or JSON)
```

### Analyze Financial Data
```
POST /api/analyze
Content-Type: application/json
Body: { "transactions": [...] }
```

### Bias Detection
```
POST /api/bias-detection
Content-Type: application/json
Body: {
  "dataset": [...],
  "sensitive_attributes": ["gender", "region"],
  "decision_attribute": "approved"
}
```

## 🎯 Usage Examples

### 1. Analyzing Financial Data

1. Click on "Upload Data" tab
2. Select a CSV or JSON file with your financial transactions
3. Click "Upload & Analyze"
4. View your spending insights, Smart Spending Score, and visualizations on the Dashboard

### 2. Detecting Bias

1. Click on "Bias Detection" tab
2. Upload a dataset (JSON or CSV)
3. Specify sensitive attributes (e.g., "gender, region, income_level")
4. Specify the decision attribute (e.g., "approved")
5. Click "Analyze for Bias"
6. Review bias metrics and recommendations

## 🛠️ Technologies Used

- **Backend**: FastAPI, Python, Pandas, NumPy, SciPy
- **Frontend**: React, Vite, Recharts, Axios, Lucide React Icons
- **Visualization**: Recharts (Pie Charts, Bar Charts)

## 🤝 Contributing

This is an open-source project. Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

Built with ❤️ for financial transparency and fairness in data-driven decisions.

