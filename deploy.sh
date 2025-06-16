#!/bin/bash

# Deployment script for Render
echo "🚀 Starting deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create downloads directory if not exists
mkdir -p downloads

echo "✅ Deployment completed successfully!"
echo "🌐 Application will be available at your Render URL"
