#!/bin/bash

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the development server
echo "Starting frontend server on http://localhost:3000"
npm run dev

