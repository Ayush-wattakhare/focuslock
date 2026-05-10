@echo off
REM Clean start script for FocusLock development (Windows)

echo Cleaning build cache...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo Starting development server...
npm run dev
