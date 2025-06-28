#!/bin/bash

# UniFarm Build Script for Production Deployment
echo "🚀 Starting UniFarm build process..."

# Set production environment
export NODE_ENV=production
export HOST=0.0.0.0
export PORT=${PORT:-3000}

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Build the frontend
echo "🔨 Building frontend..."
npm run build

# Verify build output
if [ -d "dist" ]; then
    echo "✅ Build completed successfully"
    echo "📁 Build directory: dist/"
    echo "📄 Files created:"
    ls -la dist/
else
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Make server files executable
chmod +x server.js production-server.js

echo "✅ Build process completed successfully"
echo "🎯 Ready for deployment with: node server.js"