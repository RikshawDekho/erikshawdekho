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

## Environment Variables (optional)

Create `backend/.env`:
```
DB_NAME=erickshaw_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=your-secret-key-here
```

---

## Customise Paths

Edit `atf_config.json` if integrating with AutoTestForge.

For production deployment:
- Set `DEBUG=False` in settings.py
- Use `gunicorn` instead of `runserver`
- Serve frontend build with nginx
- Use environment variables for all secrets
