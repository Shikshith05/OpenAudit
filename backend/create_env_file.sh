#!/bin/bash
# Script to help create .env file

echo "=========================================="
echo "   Gemini API Key Setup Helper"
echo "=========================================="
echo ""
echo "Enter your Gemini API key (or press Enter to skip):"
read -s api_key

if [ -z "$api_key" ]; then
    echo "No API key provided. Skipping .env file creation."
    echo "You can create it manually later."
    exit 0
fi

echo "GEMINI_API_KEY=$api_key" > .env
echo ""
echo "✅ .env file created successfully!"
echo "   Location: $(pwd)/.env"
echo ""
echo "Now restart your server to use Gemini API."
