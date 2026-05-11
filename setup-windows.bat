@echo off
REM Space Intel - Quick Setup Script for Windows

echo.
echo ========================================
echo   SpaceIntel - Setup Script (Windows)
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [1/4] Checking Docker...
docker --version
echo.

REM Start Docker Compose services
echo [2/4] Starting Docker services (Postgres, Redis, Qdrant)...
cd /d "%~dp0"
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start Docker services
    pause
    exit /b 1
)
echo [OK] Docker services started
echo.

REM Wait for services to be ready
echo [3/4] Waiting for services to be ready...
timeout /t 5 /nobreak
echo.

REM Display status
echo [4/4] Service Status:
docker-compose ps
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Backend Setup (new terminal):
echo    cd spaceintel-backend
echo    python -m venv venv
echo    venv\Scripts\activate
echo    pip install -r requirements.txt
echo    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo 2. Frontend Setup (new terminal):
echo    cd spaceintel-frontend
echo    npm install
echo    npm run dev
echo.
echo 3. Open browser to:
echo    - Frontend: http://localhost:3000
echo    - Backend: http://localhost:8000
echo    - Qdrant: http://localhost:6333/dashboard
echo.
echo To stop services:
echo   docker-compose down
echo.
pause
