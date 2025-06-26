#!/bin/bash

# Production Start Script for UniFarm
# Eliminates startup issues and ensures stable server operation

export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0

echo "🚀 Starting UniFarm Production Server..."
echo "📊 Environment: $NODE_ENV"
echo "🌐 Host: $HOST:$PORT"

# Kill any existing server processes
pkill -f "tsx.*server" 2>/dev/null || true
sleep 1

# Start the server
npx tsx server/index.ts