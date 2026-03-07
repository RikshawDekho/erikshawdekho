@echo off
echo ============================================
echo   eRickshawDekho.com — Setup Script
echo   React + Django + PostgreSQL
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install from https://python.org
    pause & exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause & exit /b 1
)

echo [1/6] Creating Python virtual environment...
cd backend
python -m venv .venv
call .venv\Scripts\activate.bat

echo [2/6] Installing Python dependencies...
pip install -r requirements.txt

echo [3/6] Setting up database...
echo.
echo IMPORTANT: Make sure PostgreSQL is running!
echo Create database with: createdb erickshaw_db
echo Or use pgAdmin to create database named: erickshaw_db
echo.
pause

echo [4/6] Running migrations...
python manage.py migrate

echo [5/6] Seeding demo data...
python manage.py seed_data

echo [6/6] Installing frontend dependencies...
cd ..\frontend
npm install

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo To start the application:
echo.
echo   Terminal 1 (Backend):
echo     cd backend
echo     .venv\Scripts\activate
echo     python manage.py runserver
echo.
echo   Terminal 2 (Frontend):
echo     cd frontend
echo     npm run dev
echo.
echo   Open: http://localhost:3000
echo   Login: username=demo  password=demo1234
echo   Admin: http://localhost:8000/admin
echo ============================================
pause
