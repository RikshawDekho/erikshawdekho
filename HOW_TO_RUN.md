# erikshawDekho — How to Run
# Linux/WSL · Python 3.10 · Your exact folder structure
# ══════════════════════════════════════════════════════

## WHAT I CAN SEE IN YOUR STRUCTURE

✗  `{backend` folder at the bottom  →  DELETE IT (junk from build)
✗  `models.py`, `views.py`, `serializers.py` at root  →  IGNORE (wrong place)
✓  `venv/` at root  →  CORRECT, use it
✓  `eRickshawDekho_Project/erickshaw/backend/`  →  Your real Django app
✓  `eRickshawDekho_Project/erickshaw/frontend/`  →  Your real React app
✓  You're on Linux/WSL (venv has `bin/` not `Scripts/`)

---

## PASTE THESE COMMANDS — one terminal at a time

### TERMINAL 1 — Setup (run once only)

```bash
# 1. Delete junk folder
rm -rf "eRickshawDekho_Project/erickshaw/{backend"

# 2. Install PostgreSQL (if not installed)
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# 3. Start PostgreSQL
sudo service postgresql start

# 4. Create database + set password
sudo -u postgres psql -c "CREATE DATABASE erikshaw_db;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# 5. Activate your venv (it's at the workspace root)
source venv/bin/activate

# 6. Install Python packages
pip install django==4.2 djangorestframework django-cors-headers psycopg2-binary pillow

# 7. REPLACE settings.py with the fixed version (see below)
#    Copy the downloaded settings.py into:
#    eRickshawDekho_Project/erickshaw/backend/erickshaw/settings.py

# 8. REPLACE views.py with the fixed version (see below)
#    Copy the downloaded views.py into:
#    eRickshawDekho_Project/erickshaw/backend/api/views.py

# 9. Run migrations
cd eRickshawDekho_Project/erickshaw/backend
python manage.py migrate

# 10. Seed demo data
python manage.py seed_data

# 11. Start Django
python manage.py runserver
```

You should see:
```
Django version 4.2.x, using settings 'erickshaw.settings'
Starting development server at http://127.0.0.1:8000/
```

Test: open http://localhost:8000/api/ → you see the API root ✓

---

### TERMINAL 2 — React Frontend (open a new terminal)

```bash
# Check Node.js
node --version    # needs v18+

# If Node not installed:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Go to frontend
cd eRickshawDekho_Project/erickshaw/frontend

# Install packages (first time only, takes ~1 min)
npm install

# Start React
npm run dev
```

You should see:
```
  VITE v5.x  ready

  ➜  Local:   http://localhost:3000/
```

---

## OPEN THE APP

http://localhost:3000

Login:
  Username:  demo
  Password:  demo1234

---

## EVERY DAY (after first-time setup)

```bash
# Terminal 1
sudo service postgresql start   # skip if already running
source venv/bin/activate
cd eRickshawDekho_Project/erickshaw/backend
python manage.py runserver

# Terminal 2
cd eRickshawDekho_Project/erickshaw/frontend
npm run dev
```

---

## TROUBLESHOOTING

| Error | Fix |
|-------|-----|
| `could not connect to server` | `sudo service postgresql start` |
| `FATAL: password authentication failed` | `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"` |
| `No module named 'django'` | `source venv/bin/activate` |
| `No module named 'corsheaders'` | `pip install django-cors-headers` |
| `database "erikshaw_db" does not exist` | `sudo -u postgres psql -c "CREATE DATABASE erikshaw_db;"` |
| `Cannot find module` in React | `cd frontend && npm install` |
| CORS error in browser | Django not running — start Terminal 1 first |
| Port 8000 already in use | `python manage.py runserver 8001` then edit App.jsx line 4 |

---

## FILES TO REPLACE (download from outputs)

| File to download | Copy it to |
|-----------------|------------|
| `settings.py`   | `eRickshawDekho_Project/erickshaw/backend/erickshaw/settings.py` |
| `views.py`      | `eRickshawDekho_Project/erickshaw/backend/api/views.py` |
