#!/bin/bash

# RagCoon Optimized Startup Script
# This script ensures proper memory configuration and clean startup

echo "🦝 Starting RagCoon with memory optimizations..."

# Kill any existing Next.js processes to prevent conflicts
echo "Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

# Check if Ollama is running
echo "Checking Ollama status..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Ollama is not running. Starting Ollama..."
    ollama serve &
    sleep 3
fi

# Check if database directory exists
echo "Checking database directory..."
if [ ! -d "./data" ]; then
    echo "Creating data directory..."
    mkdir -p ./data
fi

# Clean up old build artifacts that might cause issues
echo "Cleaning build cache..."
rm -rf .next/cache 2>/dev/null || true

# Set memory options explicitly
export NODE_OPTIONS="--max-old-space-size=8192 --expose-gc"

echo ""
echo "🚀 Starting development server with 8GB heap size..."
echo "📊 Memory limit: 8GB"
echo "🗑️  Garbage collection: Enabled"
echo ""

# Start the dev server
npm run dev
