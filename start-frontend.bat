@echo off
echo ========================================
echo Starting Sodash Frontend
echo ========================================
echo.

cd /d "%~dp0client"

echo Starting Vite dev server...
call bun run dev

pause
