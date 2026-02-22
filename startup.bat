@echo off
REM Bot Agent Platform - Auto Startup Script
REM This script starts all services automatically

echo ========================================
echo Starting Bot Agent Platform...
echo ========================================

REM Change to project directory
cd /d F:\samlay-c\agent-group

echo.
echo [1/3] Starting Docker containers (PostgreSQL & Redis)...
docker-compose up -d

echo.
echo [2/3] Waiting for database to be ready...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Starting Backend with PM2...
cd backend
pm2 resurrect
if %errorlevel% neq 0 (
    echo PM2 not found, starting directly...
    npm run pm2:start
)

echo.
echo ========================================
echo All services started successfully!
echo Backend: http://localhost:8915
echo Login: http://localhost:8915/login.html
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
