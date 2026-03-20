"""
seed_staging — Predictable, minimal fixture data for automated/AUT tests.

Safety gate: only runs when APP_ENV=staging or ALLOW_STAGING_SEED=true.
All data is fixed (no randomisation) so test assertions are reliable.

Usage:
    python manage.py seed_staging            # seed if tables empty
    python manage.py seed_staging --reset    # wipe staging data and reseed
"""
import os
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from api.models import (
    UserProfile, DealerProfile, Plan,
    Brand, Vehicle, Lead, Sale, Customer, Task,
    FinancerProfile, FinancerPlan, FinancerSubscription,
    PlatformSettings,
)


STAGING_USERS = {
    'admin':           ('Admin',     'User',       'admin@staging.test',         'admin'),
    'test_dealer':     ('Test',      'Dealer',     'dealer@staging.test',        'dealer'),
    'test_financer':   ('Test',      'Financer',   'financer@staging.test',      'financer'),
    'test_customer':   ('Test',      'Customer',   'customer@staging.test',      'customer'),
}

TEST_PASSWORD = 'testpass123'


class Command(BaseCommand):
    help = 'Seed staging database with fixed, predictable test fixture data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Clear all staging data first, then reseed.',
        )

    def handle(self, *args, **options):
        # ── Safety gate ────────────────────────────────────────────
        app_env = os.environ.get('APP_ENV', '') or os.environ.get('ENVIRONMENT', '')
        allow   = str(os.environ.get('ALLOW_STAGING_SEED', '')).lower() == 'true'
        if app_env.lower() != 'staging' and not allow:
            raise CommandError(
                "seed_staging refused: APP_ENV is not 'staging'.\n"
                "Set ALLOW_STAGING_SEED=true to override (e.g. local testing)."
            )

        if options['reset']:
            self._wipe()

        # Skip if data already present and not resetting
        if not options['reset'] and DealerProfile.objects.exists():
            self.stdout.write(self.style.WARNING('Staging DB already has data — skipping. Use --reset to force.'))
            return

        self._seed()
        self.stdout.write(self.style.SUCCESS('Staging seed complete.'))

    # ── Wipe ───────────────────────────────────────────────────────
    def _wipe(self):
        self.stdout.write('Wiping staging data...')
        # Delete in reverse dependency order
        Sale.objects.all().delete()
        Lead.objects.all().delete()
        Customer.objects.all().delete()
        Task.objects.all().delete()
        Vehicle.objects.all().delete()
        Brand.objects.all().delete()
        FinancerSubscription.objects.all().delete()
        FinancerProfile.objects.filter(user__username='test_financer').delete()
        DealerProfile.objects.filter(user__username='test_dealer').delete()
        Plan.objects.all().delete()
        FinancerPlan.objects.all().delete()
        for username in STAGING_USERS:
            User.objects.filter(username=username).delete()
        self.stdout.write('  Wipe done.')

    # ── Seed ───────────────────────────────────────────────────────
    def _seed(self):
        now = timezone.now()

        # ── Users ──────────────────────────────────────────────────
        self.stdout.write('  Creating users...')
        users = {}
        for username, (first, last, email, role) in STAGING_USERS.items():
            user, _ = User.objects.get_or_create(username=username)
            user.set_password(TEST_PASSWORD)
            user.first_name = first
            user.last_name  = last
            user.email      = email
            if role == 'admin':
                user.is_staff = True
                user.is_superuser = True
            user.save()
            UserProfile.objects.update_or_create(
                user=user,
                defaults={'user_type': role, 'phone': f'+91 99000 0000{list(STAGING_USERS).index(username)}'},
            )
            users[username] = user

        # ── Plans ──────────────────────────────────────────────────
        self.stdout.write('  Creating plans...')
        free_plan, _ = Plan.objects.update_or_create(
            slug='free',
            defaults={
                'name': 'Free',
                'price': Decimal('0.00'),
                'listing_limit': 3,
                'analytics_access': False,
                'is_active': True,
            },
        )
        pro_plan, _ = Plan.objects.update_or_create(
            slug='early_dealer',
            defaults={
                'name': 'Early Dealer',
                'price': Decimal('5000.00'),
                'listing_limit': 0,  # unlimited
                'analytics_access': True,
                'yearly_subscription': True,
                'is_active': True,
            },
        )

        # ── Dealer profile ─────────────────────────────────────────
        self.stdout.write('  Creating dealer...')
        dealer, _ = DealerProfile.objects.update_or_create(
            user=users['test_dealer'],
            defaults={
                'dealer_name':     'Test Dealer Showroom',
                'phone':           '+91 99000 00001',
                'address':         '1 Test Lane, Test City',
                'city':            'TestCity',
                'state':           'TestState',
                'pincode':         '110001',
                'gstin':           '07TESTA1234B1Z1',
                'is_verified':     True,
                'plan':            pro_plan,
                'plan_type':       'pro',
                'plan_started_at': now,
                'plan_expires_at': now + timedelta(days=365),
            },
        )

        # ── Brands ─────────────────────────────────────────────────
        self.stdout.write('  Creating brands...')
        brand_a, _ = Brand.objects.get_or_create(name='TestBrand Alpha')
        brand_b, _ = Brand.objects.get_or_create(name='TestBrand Beta')

        # ── Vehicles ───────────────────────────────────────────────
        self.stdout.write('  Creating vehicles...')
        v1, _ = Vehicle.objects.get_or_create(
            dealer=dealer, brand=brand_a, model_name='Alpha Cargo 100',
            defaults={
                'fuel_type': 'electric', 'vehicle_type': 'cargo',
                'price': Decimal('95000'), 'stock_quantity': 10,
                'range_km': 100, 'battery_capacity': '100Ah 48V',
                'max_speed': 25, 'payload_kg': 500,
                'hsn_code': '8703', 'is_active': True,
                'thumbnail_url': 'https://via.placeholder.com/400x300?text=Alpha+Cargo',
            },
        )
        v2, _ = Vehicle.objects.get_or_create(
            dealer=dealer, brand=brand_b, model_name='Beta Passenger 80',
            defaults={
                'fuel_type': 'electric', 'vehicle_type': 'passenger',
                'price': Decimal('110000'), 'stock_quantity': 5,
                'range_km': 80, 'battery_capacity': '80Ah 48V',
                'max_speed': 25, 'seating_capacity': 3,
                'hsn_code': '8703', 'is_active': True,
                'thumbnail_url': 'https://via.placeholder.com/400x300?text=Beta+Passenger',
            },
        )
        v3, _ = Vehicle.objects.get_or_create(
            dealer=dealer, brand=brand_a, model_name='Alpha Auto 60',
            defaults={
                'fuel_type': 'electric', 'vehicle_type': 'auto',
                'price': Decimal('75000'), 'stock_quantity': 0,  # out of stock
                'range_km': 60, 'battery_capacity': '60Ah 48V',
                'hsn_code': '8703', 'is_active': True,
                'thumbnail_url': 'https://via.placeholder.com/400x300?text=Alpha+Auto',
            },
        )

        # ── Customers ──────────────────────────────────────────────
        self.stdout.write('  Creating customers...')
        c1, _ = Customer.objects.get_or_create(
            dealer=dealer, phone='9900000001',
            defaults={
                'name': 'Ravi Test Kumar', 'email': 'ravi@test.com',
                'address': '10 Ravi Nagar, TestCity', 'city': 'TestCity',
                'total_purchases': 1, 'total_spent': Decimal('95000'),
            },
        )
        c2, _ = Customer.objects.get_or_create(
            dealer=dealer, phone='9900000002',
            defaults={
                'name': 'Sunita Test Sharma', 'email': 'sunita@test.com',
                'address': '20 Sunita Colony, TestCity', 'city': 'TestCity',
                'total_purchases': 0, 'total_spent': Decimal('0'),
            },
        )

        # ── Leads: one of each status ──────────────────────────────
        self.stdout.write('  Creating leads...')
        lead_statuses = [
            ('new',        'Arjun Test New',        '9911000001', v1),
            ('interested', 'Priya Test Interested',  '9911000002', v2),
            ('follow_up',  'Mohan Test Follow',      '9911000003', v1),
            ('converted',  'Seema Test Converted',   '9911000004', v2),
            ('lost',       'Vikram Test Lost',        '9911000005', v3),
        ]
        leads = []
        for status, name, phone, vehicle in lead_statuses:
            lead, _ = Lead.objects.get_or_create(
                dealer=dealer, phone=phone, vehicle=vehicle,
                defaults={
                    'customer_name': name,
                    'source': 'walk_in',
                    'status': status,
                    'notes': f'Test lead — status={status}',
                },
            )
            leads.append(lead)

        # ── Sales ──────────────────────────────────────────────────
        self.stdout.write('  Creating sales...')
        sales_data = [
            ('STG-INV-001', c1, v1, leads[3], 'cash',          Decimal('95000')),
            ('STG-INV-002', c2, v2, None,      'loan',          Decimal('110000')),
            ('STG-INV-003', c1, v2, None,      'upi',           Decimal('110000')),
        ]
        for inv_no, customer, vehicle, lead, method, price in sales_data:
            Sale.objects.get_or_create(
                invoice_number=inv_no,
                defaults={
                    'dealer':          dealer,
                    'lead':            lead,
                    'vehicle':         vehicle,
                    'customer_name':   customer.name,
                    'customer_phone':  customer.phone,
                    'sale_price':      price,
                    'payment_method':  method,
                    'cgst_rate':       Decimal('2.5'),
                    'sgst_rate':       Decimal('2.5'),
                    'place_of_supply': 'TestState',
                    'chassis_number':  f'TEST-CHASSIS-{inv_no}',
                    'battery_count':   1,
                    'battery_serial_number': f'TEST-BAT-{inv_no}',
                    'is_delivered':    True,
                },
            )

        # ── Tasks ──────────────────────────────────────────────────
        self.stdout.write('  Creating tasks...')
        Task.objects.get_or_create(
            dealer=dealer, title='Follow up with Mohan Test Follow',
            defaults={'priority': 'high', 'due_date': date.today() + timedelta(days=1), 'is_completed': False},
        )
        Task.objects.get_or_create(
            dealer=dealer, title='Completed staging task',
            defaults={'priority': 'low', 'due_date': date.today(), 'is_completed': True},
        )

        # ── Financer ───────────────────────────────────────────────
        self.stdout.write('  Creating financer...')
        financer_plan_free, _ = FinancerPlan.objects.update_or_create(
            slug='free',
            defaults={
                'name': 'Free',
                'price_per_year': Decimal('0'),
                'max_finance_applications': 10,
                'is_active': True,
            },
        )
        financer, _ = FinancerProfile.objects.update_or_create(
            user=users['test_financer'],
            defaults={
                'company_name':     'Test NBFC Finance Ltd',
                'contact_person':   'Test Financer',
                'phone':            '+91 99000 00002',
                'city':             'TestCity',
                'state':            'TestState',
                'is_verified':      True,
                'interest_rate_min': Decimal('9.5'),
                'interest_rate_max': Decimal('16.0'),
                'max_loan_amount':   Decimal('300000'),
                'min_loan_amount':   Decimal('50000'),
            },
        )
        FinancerSubscription.objects.update_or_create(
            financer=financer,
            defaults={
                'plan':            financer_plan_free,
                'is_active':       True,
                'applications_used': 0,
            },
        )

        # ── PlatformSettings ───────────────────────────────────────
        self.stdout.write('  Creating PlatformSettings...')
        PlatformSettings.objects.update_or_create(
            pk=1,
            defaults={
                'support_phone':    '+91 99000 00000',
                'support_whatsapp': '+91 99000 00000',
                'support_email':    'support@staging.test',
                'support_name':     'eRickshawDekho Staging Support',
            },
        )
