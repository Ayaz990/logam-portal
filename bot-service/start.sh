#!/bin/bash

echo "🤖 Starting Logam Meet Bot Service..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file from .env.example"
    exit 1
fi

echo "✅ Starting bot..."
echo "Press Ctrl+C to stop"
echo ""

node index.js
