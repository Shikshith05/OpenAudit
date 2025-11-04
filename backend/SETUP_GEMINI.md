# Quick Gemini API Setup

## Step 1: Get API Key
Go to: https://makersuite.google.com/app/apikey
Copy your API key

## Step 2: Install Package
cd backend
source venv/bin/activate
pip install google-generativeai>=0.3.0

## Step 3: Create .env File
Create file: backend/.env
Add this line:
GEMINI_API_KEY=your_api_key_here

## Step 4: Restart Server
pkill -f "uvicorn main:app"
cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000

## Done! ✅
The audit will now use Gemini AI for comprehensive analysis.
