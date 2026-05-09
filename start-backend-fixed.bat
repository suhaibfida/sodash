@echo off
echo ========================================
echo Sodash Backend Startup
echo ========================================
echo.

cd /d "%~dp0api"

echo Step 1: Installing dependencies...
call bun install
echo.

echo Step 2: Installing Prisma adapter...
call bun add @prisma/adapter-pg pg
echo.

echo Step 3: Generating Prisma client...
call bun prisma generate
echo.

echo Step 4: Starting server...
echo.
call bun run dev

pause
