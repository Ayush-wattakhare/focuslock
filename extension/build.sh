#!/bin/bash

# FocusLock Browser Extension Build Script

echo "Building FocusLock Browser Extensions..."

# Create dist directory
mkdir -p dist

# Build Chrome extension
echo "Building Chrome extension..."
cd chrome
zip -r ../dist/focuslock-chrome.zip . -x "*.DS_Store" -x "__MACOSX/*"
cd ..
echo "✓ Chrome extension built: dist/focuslock-chrome.zip"

# Build Firefox extension
echo "Building Firefox extension..."
cd firefox
zip -r ../dist/focuslock-firefox.zip . -x "*.DS_Store" -x "__MACOSX/*"
cd ..
echo "✓ Firefox extension built: dist/focuslock-firefox.zip"

echo ""
echo "Build complete! Extension packages are in the dist/ directory."
echo ""
echo "Next steps:"
echo "1. Chrome: Upload dist/focuslock-chrome.zip to Chrome Web Store"
echo "2. Firefox: Upload dist/focuslock-firefox.zip to Firefox Add-ons"
