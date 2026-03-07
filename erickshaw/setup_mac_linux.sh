#!/bin/bash
set -e

echo "============================================"
echo "  eRickshawDekho.com — Setup Script"
echo "  React + Django + PostgreSQL"
echo "============================================"
echo ""

# Check dependencies
command -v python3 >/dev/null 2>&1 || { echo "Python3 required. Install it first."; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "Node.js required. Install from nodejs.org"; exit 1; }
command -v psql    >/dev/null 2>&1 || { echo "PostgreSQL required. Install and start it."; exit 1; }

echo "[1/6] Creating Python virtual environment..."
cd backend
python3 -m venv .venv
source .venv/bin/activate

echo "[2/6] Installing Python packages..."
pip install -r requirements.txt

echo "[3/6] Creating PostgreSQL database..."
createdb erickshaw_db 2>/dev/null && echo "Database created." || echo "Database may already exist, continuing..."

echo "[4/6] Running migrations..."
python manage.py migrate

echo "[5/6] Seeding demo data..."
python manage.py seed_data

echo "[6/6] Installing frontend packages..."
cd ../frontend
npm install

echo ""
echo "============================================"
echo "  ✓ Setup Complete!"
echo "============================================"
echo ""
echo "Start Backend:   cd backend && source .venv/bin/activate && python manage.py runserver"
echo "Start Frontend:  cd frontend && npm run dev"
echo ""
echo "App URL:    http://localhost:3000"
echo "Login:      demo / demo1234"
echo "Admin:      http://localhost:8000/admin"
echo "============================================"
