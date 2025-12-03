@echo off
REM SOLPOKER X - Clean Startup Script

echo ╔════════════════════════════════════════════════════════════════╗
echo ║         SOLPOKER X - Complete Startup                          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo Killing all Node processes...
taskkill /F /IM node.exe /IM npm.exe 2>nul
timeout /t 2 /nobreak

echo.
echo Starting BACKEND on PORT 5000...
echo Press Ctrl+C to stop
cd /d "c:\Users\kyson\OneDrive\Desktop\solpoker\server"
cmd /k "npm run dev"
