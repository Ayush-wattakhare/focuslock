# FocusLock Browser Extension Build Script (PowerShell)

Write-Host "Building FocusLock Browser Extensions..." -ForegroundColor Cyan

# Create dist directory
New-Item -ItemType Directory -Force -Path "dist" | Out-Null

# Build Chrome extension
Write-Host "Building Chrome extension..." -ForegroundColor Yellow
Compress-Archive -Path "chrome\*" -DestinationPath "dist\focuslock-chrome.zip" -Force
Write-Host "✓ Chrome extension built: dist\focuslock-chrome.zip" -ForegroundColor Green

# Build Firefox extension
Write-Host "Building Firefox extension..." -ForegroundColor Yellow
Compress-Archive -Path "firefox\*" -DestinationPath "dist\focuslock-firefox.zip" -Force
Write-Host "✓ Firefox extension built: dist\focuslock-firefox.zip" -ForegroundColor Green

Write-Host ""
Write-Host "Build complete! Extension packages are in the dist\ directory." -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Chrome: Upload dist\focuslock-chrome.zip to Chrome Web Store"
Write-Host "2. Firefox: Upload dist\focuslock-firefox.zip to Firefox Add-ons"
