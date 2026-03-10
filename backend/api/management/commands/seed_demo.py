"""
Management command: seed_demo
Creates realistic demo data for localhost testing.
Usage: python manage.py seed_demo
       python manage.py seed_demo --reset   (clears existing data first)
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, date
import random, uuid

from api.models import (
    DealerProfile, Brand, Vehicle, Lead, Sale, Customer,
    Task, FinanceLoan, DealerReview, PublicEnquiry
)


BRANDS = ["Yatri", "Bajaj", "Kinetic", "Saarthi", "Lohia", "OSM", "Mahindra", "Terra Motors"]

VEHICLE_MODELS = [
    ("Yatri",       "YatriKing Pro",    120000, "electric", "passenger"),
    ("Bajaj",       "Compact RE",       95000,  "electric", "passenger"),
    ("Kinetic",     "Safar Smart",      110000, "electric", "passenger"),
    ("Saarthi",     "City Rider",       89000,  "electric", "passenger"),
    ("Lohia",       "Humsafar Plus",    105000, "electric", "cargo"),
    ("OSM",         "Rage+ Flex",       135000, "electric", "passenger"),
    ("Mahindra",    "Treo Yaari",       115000, "electric", "passenger"),
    ("Terra Motors","Terra V8",         98000,  "electric", "passenger"),
]

CUSTOMER_NAMES = [
    "Ramesh Kumar",   "Suresh Yadav",     "Ganesh Bisht",
    "Lalit Sharma",   "Ankush Patel",     "Vijay Singh",
    "Mohan Lal",      "Santosh Gupta",    "Rajendra Prasad",
    "Dinesh Verma",   "Anil Chauhan",     "Pradeep Mishra",
    "Arvind Tiwari",  "Harish Joshi",     "Deepak Rawat",
]

PHONES = [
    "9876543210", "9988776655", "8877665544", "7766554433",
    "9090909090", "8080808080", "7070707070", "9123456789",
    "9234567890", "9345678901", "9456789012", "9567890123",
    "9678901234", "9789012345", "9890123456",
]

CITIES = ["Delhi", "Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Ghaziabad"]

LEAD_NOTES = [
    "Interested in buying for commercial use",
    "Looking for cargo variant",
    "Wants EMI options",
    "Comparing with competitor models",
    "Ready to buy this week",
    "Needs test drive",
    "Referral from existing customer",
    "Enquired about warranty terms",
]


class Command(BaseCommand):
    help = "Seed the database with realistic demo data for local testing"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing demo data before seeding")

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("🌱 Seeding demo data..."))

        # ── Create/get superadmin ──────────────────────────────
        admin, _ = User.objects.get_or_create(username="admin", defaults={
            "email": "admin@erikshawdekho.com", "is_superuser": True, "is_staff": True,
        })
        if not admin.check_password("admin1234"):
            admin.set_password("admin1234")
            admin.save()
        self.stdout.write(f"  ✓ Superadmin: username=admin  password=admin1234")

        # ── Create/get demo dealer ─────────────────────────────
        demo_user, created = User.objects.get_or_create(username="demo", defaults={
            "email": "demo@erikshawdekho.com",
            "first_name": "Kumar",
            "last_name": "Bhai",
        })
        if created or not demo_user.check_password("demo1234"):
            demo_user.set_password("demo1234")
            demo_user.save()

        dealer, _ = DealerProfile.objects.get_or_create(user=demo_user, defaults={
            "dealer_name":         "Kumar Bhai Electric",
            "phone":               "9898992326",
            "city":                "Delhi",
            "state":               "Delhi",
            "address":             "1st Floor, ABC Complex, Main Market, Rohini",
            "gstin":               "07AAACZ1234A1Z5",
            "pincode":             "110085",
            "is_verified":         True,
            "plan_type":           "pro",
            "plan_started_at":     timezone.now(),
            "plan_expires_at":     timezone.now() + timedelta(days=365),
            "description":         "Delhi's most trusted eRickshaw dealer since 2018. Authorised for Yatri, Bajaj and Kinetic brands.",
            "sales_manager_name":  "Rajesh Kumar",
            "bank_name":           "HDFC Bank Ltd.",
            "bank_account_number": "50200099887766",
            "bank_ifsc":           "HDFC0001234",
            "bank_upi":            "kumarbhai@hdfc",
            "invoice_footer_note": "Subject to Delhi jurisdiction. GST compliant invoice valid for RTO registration.",
        })
        # Always update plan if expired
        if dealer.plan_expires_at and dealer.plan_expires_at < timezone.now():
            dealer.plan_expires_at = timezone.now() + timedelta(days=365)
            dealer.save()

        self.stdout.write(f"  ✓ Demo dealer: username=demo  password=demo1234")

        if options["reset"]:
            Vehicle.objects.filter(dealer=dealer).delete()
            Lead.objects.filter(dealer=dealer).delete()
            Sale.objects.filter(dealer=dealer).delete()
            Customer.objects.filter(dealer=dealer).delete()
            Task.objects.filter(dealer=dealer).delete()
            FinanceLoan.objects.filter(dealer=dealer).delete()
            self.stdout.write("  ✓ Existing demo records cleared")

        # ── Brands ────────────────────────────────────────────
        brand_objs = {}
        for b in BRANDS:
            obj, _ = Brand.objects.get_or_create(name=b)
            brand_objs[b] = obj
        self.stdout.write(f"  ✓ {len(brand_objs)} brands ready")

        # ── Vehicles ──────────────────────────────────────────
        if Vehicle.objects.filter(dealer=dealer).count() < 5:
            for brand_name, model, price, fuel, vtype in VEHICLE_MODELS:
                Vehicle.objects.get_or_create(
                    dealer=dealer,
                    model_name=model,
                    defaults={
                        "brand":            brand_objs[brand_name],
                        "fuel_type":        fuel,
                        "vehicle_type":     vtype,
                        "price":            price,
                        "stock_quantity":   random.randint(3, 12),
                        "year":             2024,
                        "range_km":         random.choice([80, 100, 120, 150]),
                        "battery_capacity": random.choice(["60Ah 48V", "80Ah 48V", "100Ah 48V", "120Ah 60V"]),
                        "max_speed":        random.choice([25, 30, 35]),
                        "seating_capacity": 3,
                        "payload_kg":       random.choice([300, 350, 400]),
                        "warranty_years":   2,
                        "hsn_code":         "8703",
                        "is_featured":      random.choice([True, False]),
                        "is_active":        True,
                    }
                )
            self.stdout.write(f"  ✓ {len(VEHICLE_MODELS)} vehicles created")

        vehicles = list(Vehicle.objects.filter(dealer=dealer, is_active=True))

        # ── Customers ─────────────────────────────────────────
        if Customer.objects.filter(dealer=dealer).count() < 5:
            for i, (name, phone) in enumerate(zip(CUSTOMER_NAMES[:10], PHONES[:10])):
                Customer.objects.get_or_create(
                    dealer=dealer, phone=phone,
                    defaults={
                        "name":            name,
                        "email":           f"{name.lower().replace(' ', '.')}@gmail.com",
                        "city":            random.choice(CITIES),
                        "address":         f"House {random.randint(1,99)}, Sector {random.randint(1,20)}, {random.choice(CITIES)}",
                        "total_purchases": random.randint(1, 3),
                        "total_spent":     random.randint(1, 3) * random.choice([89000, 110000, 120000, 135000]),
                    }
                )
            self.stdout.write(f"  ✓ 10 customers created")

        # ── Leads ─────────────────────────────────────────────
        statuses = ["new", "interested", "follow_up", "converted", "lost"]
        sources  = ["walk_in", "phone", "website", "referral", "marketplace"]
        if Lead.objects.filter(dealer=dealer).count() < 8:
            for i in range(15):
                name, phone = CUSTOMER_NAMES[i % len(CUSTOMER_NAMES)], PHONES[i % len(PHONES)]
                Lead.objects.create(
                    dealer=dealer,
                    customer_name=name,
                    phone=phone,
                    email=f"{name.split()[0].lower()}@gmail.com",
                    vehicle=random.choice(vehicles) if vehicles else None,
                    source=random.choice(sources),
                    status=random.choice(statuses),
                    notes=random.choice(LEAD_NOTES),
                    follow_up_date=date.today() + timedelta(days=random.randint(0, 14)),
                )
            self.stdout.write(f"  ✓ 15 leads created")

        # ── Sales ─────────────────────────────────────────────
        if Sale.objects.filter(dealer=dealer).count() < 5:
            chassis_prefix = ["ME4", "MA3", "MB8", "MC1"]
            for i in range(8):
                v = random.choice(vehicles)
                name, phone = CUSTOMER_NAMES[i % len(CUSTOMER_NAMES)], PHONES[i % len(PHONES)]
                sale_date = timezone.now() - timedelta(days=random.randint(0, 60))
                price = float(v.price) * random.uniform(0.98, 1.05)
                Sale.objects.create(
                    dealer=dealer,
                    vehicle=v,
                    customer_name=name,
                    customer_phone=phone,
                    customer_email=f"{name.split()[0].lower()}@gmail.com",
                    customer_address=f"House {random.randint(1,99)}, Sector {random.randint(1,20)}, Delhi",
                    invoice_number=f"INV-{uuid.uuid4().hex[:8].upper()}",
                    sale_price=round(price, 2),
                    quantity=1,
                    cgst_rate=2.5,
                    sgst_rate=2.5,
                    payment_method=random.choice(["cash", "upi", "loan"]),
                    delivery_date=(date.today() + timedelta(days=random.randint(1, 10))),
                    is_delivered=random.choice([True, False, False]),
                    chassis_number=f"{random.choice(chassis_prefix)}JF502DB8{random.randint(100000,999999)}",
                    engine_number=f"JF50E{random.randint(1000000,9999999)}",
                    vehicle_color=random.choice(["Pearl White", "Metallic Blue", "Black", "Green"]),
                    year_of_manufacture=2024,
                    battery_serial_number=f"AR2024{random.randint(100000,999999)}",
                    battery_make=random.choice(["Amara Raja", "Exide", "Luminous"]),
                    battery_capacity_ah=random.choice(["100Ah 48V", "80Ah 48V", "120Ah 60V"]),
                    battery_warranty_months=12,
                    motor_serial_number=f"MT2024{random.randint(100000,999999)}",
                    vehicle_warranty_months=12,
                    place_of_supply="Delhi",
                )
            self.stdout.write(f"  ✓ 8 sales created")

        # ── Tasks ─────────────────────────────────────────────
        if Task.objects.filter(dealer=dealer).count() < 3:
            task_items = [
                ("Follow up with Ramesh Kumar about Yatri King Pro", False),
                ("Collect cheque from Suresh Yadav", False),
                ("Submit Q1 GST returns", False),
                ("Stock check — Kinetic Safar Smart", True),
                ("Call Ganesh Bisht re: EMI approval", False),
            ]
            for title, done in task_items:
                Task.objects.create(
                    dealer=dealer,
                    title=title,
                    is_completed=done,
                    due_date=date.today() + timedelta(days=random.randint(1, 10)),
                )
            self.stdout.write(f"  ✓ 5 tasks created")

        # ── Finance Loans ──────────────────────────────────────
        if FinanceLoan.objects.filter(dealer=dealer).count() < 3:
            for i in range(5):
                v = random.choice(vehicles)
                name, phone = CUSTOMER_NAMES[i], PHONES[i]
                amount = float(v.price) * 0.85
                FinanceLoan.objects.create(
                    dealer=dealer,
                    customer_name=name,
                    vehicle=v,
                    loan_amount=round(amount, 2),
                    interest_rate=random.choice([8.5, 9.0, 10.5, 12.0]),
                    tenure_months=random.choice([12, 24, 36]),
                    bank_name=random.choice(["HDFC Bank", "SBI", "Axis Bank", "ICICI Bank"]),
                    status=random.choice(["pending", "approved", "disbursed"]),
                )
            self.stdout.write(f"  ✓ 5 finance loans created")

        # ── Reviews ───────────────────────────────────────────
        if DealerReview.objects.filter(dealer=dealer).count() < 3:
            review_data = [
                ("Ramesh Kumar",  "9876543210", 5, "Excellent service! Got my eRickshaw same day. Very professional."),
                ("Suresh Yadav",  "9988776655", 4, "Good experience. Price was fair. After-sales service is good."),
                ("Ganesh Bisht",  "8877665544", 5, "Best dealer in Delhi! Kumar bhai helped with RTO paperwork too."),
                ("Lalit Sharma",  "7766554433", 3, "Average experience. Delivery was delayed by 2 days."),
                ("Vijay Singh",   "9090909090", 5, "Highly recommend! Battery quality is excellent."),
            ]
            for name, phone, rating, comment in review_data:
                DealerReview.objects.get_or_create(
                    dealer=dealer, reviewer_name=name,
                    defaults={"reviewer_phone": phone, "rating": rating, "comment": comment}
                )
            self.stdout.write(f"  ✓ 5 reviews created")

        # ── Public Enquiries ──────────────────────────────────
        if PublicEnquiry.objects.filter(dealer=dealer).count() < 3:
            for i in range(8):
                name, phone = CUSTOMER_NAMES[i], PHONES[i]
                PublicEnquiry.objects.create(
                    dealer=dealer,
                    customer_name=name,
                    phone=phone,
                    city=random.choice(CITIES),
                    vehicle=random.choice(vehicles) if vehicles and random.random() > 0.3 else None,
                    notes=random.choice(LEAD_NOTES),
                    is_processed=random.choice([True, False]),
                )
            self.stdout.write(f"  ✓ 8 public enquiries created")

        self.stdout.write(self.style.SUCCESS(
            "\n✅ Demo data seeded successfully!\n"
            "   Dealer login:    username=demo      password=demo1234\n"
            "   Admin login:     username=admin     password=admin1234\n"
            "   Frontend:        http://localhost:3001\n"
            "   Backend API:     http://localhost:8000/api/\n"
        ))
