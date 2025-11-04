# Gemini API Setup Guide

## 📋 Step 1: Get Your Gemini API Key

1. **Go to**: https://makersuite.google.com/app/apikey
2. **Sign in** with your Google account
3. **Click** "Create API Key" or "Get API Key"
4. **Copy** your API key (it looks like: `AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

## 🔧 Step 2: Install the Package

First, make sure the `google-generativeai` package is installed:

```bash
cd backend
source venv/bin/activate
pip install google-generativeai>=0.3.0
```

## 📝 Step 3: Set Your API Key (Choose ONE method)

### **Option A: Using .env File** (Recommended ✅)

1. **Create or edit** `backend/.env` file:
   ```bash
   cd backend
   nano .env
   # or
   # Use your text editor to create/edit .env file
   ```

2. **Add this line** to the `.env` file:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
   
   Example:
   ```
   GEMINI_API_KEY=AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

3. **Save the file**

### **Option B: Environment Variable** (Alternative)

**For macOS/Linux:**
```bash
export GEMINI_API_KEY=your_actual_api_key_here
cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**To make it permanent**, add to `~/.zshrc` or `~/.bashrc`:
```bash
echo 'export GEMINI_API_KEY=your_actual_api_key_here' >> ~/.zshrc
source ~/.zshrc
```

### **Option C: Update start_backend.sh** (Temporary)

Edit `start_backend.sh`:
```bash
#!/bin/bash
export GEMINI_API_KEY=your_actual_api_key_here
cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🚀 Step 4: Restart the Server

**Kill the current server:**
```bash
pkill -f "uvicorn main:app"
```

**Start the server again:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or use the startup script:
```bash
./start_backend.sh
```

## ✅ Step 5: Verify It's Working

After restarting, check the backend terminal. You should see:
```
[AUDIT] Gemini API configured successfully
```

If you see:
```
[AUDIT WARNING] GEMINI_API_KEY not found. Audit service will use fallback mode.
```

Then the API key wasn't loaded correctly. Check:
- ✅ Is `.env` file in the `backend/` directory?
- ✅ Does it contain `GEMINI_API_KEY=your_key` (no spaces around `=`)?
- ✅ Is the API key correct?

## 📝 Example .env File

Create `backend/.env`:
```
GEMINI_API_KEY=AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Important:**
- ❌ Don't add spaces: `GEMINI_API_KEY = ...` (wrong)
- ✅ Correct: `GEMINI_API_KEY=...` (correct)
- ✅ Don't use quotes: `GEMINI_API_KEY="..."` (not needed)
- ✅ Use your actual API key from Google

## 🔍 Testing

1. **Restart the server**
2. **Go to Company Portal → Audit tab**
3. **Upload files and run audit**
4. **Check backend terminal** - should see `[AUDIT] Starting AI audit...`
5. **If using Gemini**, should see `[AUDIT] Audit completed successfully`

## 🛠️ Troubleshooting

### **Issue: "ModuleNotFoundError: No module named 'google'"**
**Solution:**
```bash
cd backend
source venv/bin/activate
pip install google-generativeai>=0.3.0
```

### **Issue: API key not loading**
**Solution:**
1. Make sure `.env` file is in `backend/` directory (same level as `main.py`)
2. Check file name is exactly `.env` (not `.env.txt` or `env`)
3. Restart the server after creating/editing `.env`

### **Issue: "API key invalid"**
**Solution:**
1. Check you copied the full API key
2. Make sure there are no spaces or extra characters
3. Verify the key at https://makersuite.google.com/app/apikey

## 📖 Quick Reference

**File Location:**
```
backend/.env
```

**Content:**
```
GEMINI_API_KEY=your_api_key_here
```

**Restart Command:**
```bash
pkill -f "uvicorn main:app"
cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## ✨ Once Setup Complete

- ✅ Full AI-powered audit analysis
- ✅ Comprehensive fraud detection
- ✅ Intelligent risk assessment
- ✅ Industry-specific insights
- ✅ Professional audit reports

Your audit system will now use Gemini AI for accurate, comprehensive analysis!

