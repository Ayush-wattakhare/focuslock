#!/bin/bash
# Clean start script for FocusLock development

echo "🧹 Cleaning build cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "🚀 Starting development server..."
npm run dev
