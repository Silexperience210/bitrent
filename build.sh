#!/bin/bash
# Build script for Vercel deployment

echo "🔨 Building BitRent for Vercel..."

# Install dependencies with legacy peer deps
npm install --legacy-peer-deps

# Ensure backend dependencies are installed
cd packages/backend
npm install --legacy-peer-deps
cd ../..

# Copy backend API routes to root api folder
echo "📋 Preparing API routes..."
if [ -d "packages/backend/api" ]; then
  cp -r packages/backend/api/* api/ 2>/dev/null || true
fi

# Copy frontend to public
echo "📦 Preparing frontend..."
if [ -d "packages/frontend/public" ]; then
  cp -r packages/frontend/public/* public/ 2>/dev/null || true
fi

echo "✅ Build complete!"
