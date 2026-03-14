# eRickshawDekho.com
## SaaS & Marketplace Platform for eRickshaws
### Stack: React 18 + Django 4.2 + PostgreSQL 15

---

## Project Structure

```
erickshaw/
├── backend/                    ← Django REST API
│   ├── erickshaw/
│   │   ├── settings.py         ← DB config, installed apps
│   │   └── urls.py             ← Root URL routing
│   ├── api/
│   │   ├── models.py           ← All database models
│   │   ├── serializers.py      ← DRF serializers
│   │   ├── views.py            ← All API views
│   │   ├── urls.py             ← API URL routing
│   │   └── management/
│   │       └── commands/
│   │           └── seed_data.py ← Demo data seeder
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   ← React + Vite
│   ├── src/
│   │   ├── App.jsx             ← Complete application
│   │   └── main.jsx            ← Entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml          ← Full stack Docker
├── setup_windows.bat
└── setup_mac_linux.sh
```

---

## Features

### Dealer Portal
| Module        | Features |
|---------------|----------|
| Dashboard     | KPI stats, inventory donut chart, sales bar chart, recent leads, upcoming deliveries, task list |
| Inventory     | Add/edit/delete vehicles, filter by brand/fuel/stock, pagination, status badges |
| Leads         | Track walk-in/phone/web leads, inline status updates, add/delete |
| Sales         | Record sales, auto-decrement stock, GST invoice (CGST+SGST), payment tracking |
| Customers     | Customer database, purchase history |
| Finance       | EMI calculator, loan application tracking |
| Reports       | Revenue, conversion rate, sales by fuel type, period filter |
| Marketplace   | Public vehicle browsing, fuel filter, search |

### Invoice System
- GST-compliant: CGST 9% + SGST 9% breakdown
- HSN/SAC code (8703 for rickshaws)
- Auto invoice number generation
- Print-ready layout matching reference

---

## Quick Start — Local (No Docker)

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+

### Step 1 — Database
```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE erickshaw_db;"
```

### Step 2 — Backend
```bash
cd backend

# Create & activate venv
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate      # Mac/Linux

# Install packages
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed demo data (creates demo user + 10 vehicles + leads + sales)
python manage.py seed_data

# Start server
python manage.py runserver
# → API running at http://localhost:8000/api/
```

### Step 3 — Frontend
```bash
cd frontend
npm install
npm run dev
# → App running at http://localhost:3000
```

### Step 4 — Login
```
URL:      http://localhost:3000
Username: demo
Password: demo1234
Admin:    http://localhost:8000/admin  (create superuser with: python manage.py createsuperuser)
```

---

## Quick Start — Docker (One Command)

```bash
# Start everything
docker-compose up --build

# App:    http://localhost:3000
# API:    http://localhost:8000/api/
# Login:  demo / demo1234
```

---

## API Endpoints

```
POST   /api/auth/login/          Login, returns token
POST   /api/auth/register/       Register new dealer
GET    /api/auth/me/             Current user profile
GET    /api/dashboard/           Dashboard stats + charts
GET    /api/marketplace/         Public vehicle listing

GET    /api/vehicles/            List vehicles (with filters)
POST   /api/vehicles/            Add vehicle
GET    /api/vehicles/{id}/       Vehicle detail
PATCH  /api/vehicles/{id}/       Update vehicle
DELETE /api/vehicles/{id}/       Soft delete

GET    /api/leads/               List leads
POST   /api/leads/               Add lead
PATCH  /api/leads/{id}/          Update lead status

GET    /api/sales/               List sales
POST   /api/sales/               Record sale (auto GST calc)
GET    /api/sales/{id}/invoice/  Get invoice data

GET    /api/customers/           List customers
POST   /api/customers/           Add customer

GET    /api/tasks/               Pending tasks
POST   /api/tasks/               Add task
PATCH  /api/tasks/{id}/          Complete task

GET    /api/finance/loans/       Loan applications
POST   /api/finance/loans/       New loan application
POST   /api/finance/emi-calculator/  Calculate EMI

GET    /api/reports/             Sales/lead reports (period filter)
GET    /api/brands/              All vehicle brands
```

---

## Database Models

```
DealerProfile   → User (1:1) | name, gstin, phone, city
Brand           → name, logo
Vehicle         → dealer, brand, model, fuel_type, price, stock_quantity
Lead            → dealer, customer_name, vehicle, source, status
Sale            → dealer, vehicle, customer, invoice_number, GST amounts
Customer        → dealer, name, phone, purchase_history
Task            → dealer, title, due_date, priority
FinanceLoan     → dealer, customer, vehicle, loan_amount, status
```

---

## Environment Profiles

The platform supports three explicit environments:

- `DEV` for local development
- `DEMO` for showcases at `demo.erikshawdekho.com`
- `PROD` for real users at `erikshawdekho.com`

### Backend env templates

- `backend/.env.dev.example`
- `backend/.env.demo.example`
- `backend/.env.prod.example`

### Frontend env templates

- `frontend/.env.development.example`
- `frontend/.env.demo.example`
- `frontend/.env.production.example`

For demo-only white-label branding, use these frontend keys:

- `VITE_DEMO_WHITE_LABEL=true`
- `VITE_DEMO_BRAND_NAME`, `VITE_DEMO_BRAND_TAGLINE`, `VITE_DEMO_PLATFORM_URL`
- `VITE_DEMO_SUPPORT_EMAIL`, `VITE_DEMO_SUPPORT_PHONE`, `VITE_DEMO_SUPPORT_WHATSAPP`, `VITE_DEMO_INVOICE_EMAIL`

For backend demo branding/support messages, use:

- `PLATFORM_NAME`, `PLATFORM_TAGLINE`, `PLATFORM_URL`, `PLATFORM_TEAM_NAME`, `PLATFORM_NOREPLY_EMAIL`
- `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `SUPPORT_WHATSAPP`

### Database separation

- `DEMO` must use `demo_database` (`DEMO_DATABASE_URL`)
- `PROD` must use `prod_database` (`PROD_DATABASE_URL`)
- Never point demo frontend/backend to production DB or API

### Docker stacks

```bash
# Development
docker compose up --build

# Demo (seeded demo data)
docker compose -f docker-compose.demo.yml up --build

# Production
docker compose -f docker-compose.prod.yml up --build
```

Demo stack seeds test data using `python manage.py seed_demo`.
Production stack does not auto-seed demo data.

### Standard migration strategy

Use this release order for reliable deployments:

1. Run `python manage.py check_env_db_consistency`
2. Run `python manage.py migrate --noinput`
3. Run `python manage.py collectstatic --noinput`
4. Run `python manage.py ensure_admin`
5. Run `python manage.py check_auth_integrity`
6. Start web workers (gunicorn)

Notes:

- `seed_demo` is restricted to demo environments (`APP_ENV=demo`) unless `ALLOW_DEMO_SEED=true` is set intentionally.
- `ensure_admin` is idempotent and will not reset an existing password unless `--update-password` is used.
- `check_auth_integrity` verifies active admin availability and migration completeness.

---

## Branching and Releases

This repository follows a lightweight GitFlow-style strategy aligned to the existing CI setup:

- `develop` for integration
- `release/*` for staging hardening and validation
- `main` for production deployments

Full workflow, naming conventions, hotfix process, and protection rules are documented in:

- `BRANCH_STRATEGY.md`

---

## Customise Paths

Edit `atf_config.json` if integrating with AutoTestForge.

For production deployment:
- Set `DEBUG=False` in settings.py
- Use `gunicorn` instead of `runserver`
- Serve frontend build with nginx
- Use environment variables for all secrets
