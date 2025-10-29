#!/bin/bash

echo "🚀 Starting ChromaDB for RAG Chat Interface..."

# Create chromadb_data directory if it doesn't exist
mkdir -p chromadb_data

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start ChromaDB using docker-compose
echo "📦 Starting ChromaDB container..."
docker compose -f docker-compose.chromadb.yml up -d