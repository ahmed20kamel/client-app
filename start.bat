@echo off
title CRM System
color 0A

echo.
echo  ================================
echo   Starting CRM System...
echo  ================================
echo.

cd /d "%~dp0"

echo [1/3] Clearing Next.js cache...
if exist ".next" rmdir /s /q ".next"
echo Done.

echo.
echo [2/3] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Prisma generate failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Starting Next.js dev server...
echo.
echo  App running at: http://localhost:3000
echo  Press Ctrl+C to stop
echo.

call npm run dev

pause
