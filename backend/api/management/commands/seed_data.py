from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import DealerProfile, Brand, Vehicle, Lead, Sale, Customer, Task, DealerReview, UserProfile
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
import random


class Command(BaseCommand):
    help = 'Seed database with demo data (two demo accounts + sample data)'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding demo data...')

        now = timezone.now()

        # ── Demo Account 1: Pro plan, "lifetime" (expires 2099) ───────
        user, created = User.objects.get_or_create(username='demo')
        if created or True:
            user.set_password('demo1234')
            user.first_name = 'Demo'
            user.last_name  = 'Dealer'
            user.email      = 'demo@erikshawdekho.com'
            user.save()

        dealer, _ = DealerProfile.objects.get_or_create(
            user=user,
            defaults={
                'dealer_name': 'Kumar Electric Vehicles',
                'phone':   '+91 98765 43210',
                'address': '1st Floor, ABC Complex, Main Street, Karol Bagh',
                'city':    'Delhi',
                'state':   'Delhi',
                'pincode': '110005',
                'gstin':   '07ABCDE1234F1Z1',
                'is_verified':   True,
                'plan_type':     DealerProfile.PLAN_PRO,
                'plan_started_at': now,
                'plan_expires_at': now.replace(year=2099, month=12, day=31),
            }
        )
        # Ensure plan is always set correctly even if profile already existed
        DealerProfile.objects.filter(pk=dealer.pk).update(
            plan_type='pro',
            plan_started_at=now,
            plan_expires_at=now.replace(year=2099, month=12, day=31),
            is_verified=True,
        )
        dealer.refresh_from_db()

        # ── Demo Account 2: Expired plan (30 days ago) ─────────────────
        user2, created2 = User.objects.get_or_create(username='demo_expired')
        if created2 or True:
            user2.set_password('demo1234')
            user2.first_name = 'Expired'
            user2.last_name  = 'Demo'
            user2.email      = 'expired@erikshawdekho.com'
            user2.save()

        dealer2, _ = DealerProfile.objects.get_or_create(
            user=user2,
            defaults={
                'dealer_name': 'Sharma Auto (Trial Expired)',
                'phone':   '+91 87654 32109',
                'address': 'Shop 12, Nehru Market, Lajpat Nagar',
                'city':    'Delhi',
                'state':   'Delhi',
                'pincode': '110024',
                'gstin':   '',
                'is_verified':   True,
                'plan_type':     DealerProfile.PLAN_FREE,
                'plan_started_at': now - timedelta(days=44),
                'plan_expires_at': now - timedelta(days=30),
            }
        )
        DealerProfile.objects.filter(pk=dealer2.pk).update(
            plan_type='free',
            plan_started_at=now - timedelta(days=44),
            plan_expires_at=now - timedelta(days=30),
            is_verified=True,
        )
        dealer2.refresh_from_db()

        # ── Brands ─────────────────────────────────────────────────────
        brands_data = ['Yatri', 'Mahindra', 'Piaggio', 'Bajaj', 'Kinetic', 'Atul', 'Saarthi']
        brands = {}
        for bname in brands_data:
            b, _ = Brand.objects.get_or_create(name=bname)
            brands[bname] = b

        # ── Vehicles for demo (Pro dealer) ─────────────────────────────
        vehicles_data = [
            {'brand': 'Yatri',    'model': 'YatriKing Pro',        'fuel': 'electric', 'price': 150000, 'stock': 12,
             'range': 120, 'battery': '60V 28Ah', 'speed': 25, 'payload': 400, 'desc': 'Best-selling electric passenger rickshaw with advanced BMS and 2-year warranty.'},
            {'brand': 'Piaggio',  'model': 'Piaggio Ape e-City',   'fuel': 'electric', 'price': 210000, 'stock': 8,
             'range': 90, 'battery': '48V 100Ah', 'speed': 30, 'payload': 500, 'desc': 'Italian engineering meets Indian roads. Ideal for city commutes.'},
            {'brand': 'Mahindra', 'model': 'Mahindra Treo',        'fuel': 'electric', 'price': 220000, 'stock': 3,
             'range': 130, 'battery': '48V 120Ah', 'speed': 55, 'payload': 350, 'desc': 'Mahindra Treo — India\'s most trusted electric auto. Low maintenance.'},
            {'brand': 'Kinetic',  'model': 'Kinetic Safar Smart',  'fuel': 'electric', 'price': 160000, 'stock': 0,
             'range': 100, 'battery': '48V 80Ah', 'speed': 25, 'payload': 400, 'desc': 'Affordable electric rickshaw with digital dashboard.'},
            {'brand': 'Bajaj',    'model': 'Bajaj Compact RE',     'fuel': 'petrol',   'price': 275000, 'stock': 15,
             'range': None, 'battery': '', 'speed': 70, 'payload': 450, 'desc': 'Powerful petrol auto with Bajaj reliability and wide service network.'},
            {'brand': 'Atul',     'model': 'Atul Gemini',          'fuel': 'electric', 'price': 135000, 'stock': 7,
             'range': 80, 'battery': '60V 24Ah', 'speed': 25, 'payload': 380, 'desc': 'Entry-level electric rickshaw. Great for first-time buyers.'},
            {'brand': 'Saarthi',  'model': 'Saarthi E3W',          'fuel': 'electric', 'price': 145000, 'stock': 5,
             'range': 95, 'battery': '60V 32Ah', 'speed': 25, 'payload': 400, 'desc': 'Reliable city EV with comfortable seating and LED lighting.'},
            {'brand': 'Bajaj',    'model': 'Bajaj RE CNG',         'fuel': 'cng',      'price': 245000, 'stock': 6,
             'range': None, 'battery': '', 'speed': 65, 'payload': 450, 'desc': 'CNG auto with low running cost and wide CNG station coverage.'},
            {'brand': 'Mahindra', 'model': 'Mahindra Treo Zor',    'fuel': 'electric', 'price': 265000, 'stock': 4,
             'range': 145, 'battery': '48V 130Ah', 'speed': 55, 'payload': 600, 'desc': 'Heavy-duty cargo loader. Zor means power!'},
            {'brand': 'Piaggio',  'model': 'Piaggio Ape Xtra LDX', 'fuel': 'petrol',   'price': 290000, 'stock': 2,
             'range': None, 'battery': '', 'speed': 75, 'payload': 700, 'desc': 'Max payload petrol loader for commercial use.'},
        ]
        vehicle_objs = []
        for i, vd in enumerate(vehicles_data):
            v, _ = Vehicle.objects.get_or_create(
                dealer=dealer, brand=brands[vd['brand']], model_name=vd['model'],
                defaults={
                    'fuel_type':        vd['fuel'],
                    'price':            Decimal(str(vd['price'])),
                    'stock_quantity':   vd['stock'],
                    'year':             2024,
                    'seating_capacity': 3,
                    'warranty_years':   2,
                    'is_featured':      i < 4,
                    'range_km':         vd.get('range'),
                    'battery_capacity': vd.get('battery', ''),
                    'max_speed':        vd.get('speed'),
                    'payload_kg':       vd.get('payload'),
                    'description':      vd.get('desc', ''),
                }
            )
            vehicle_objs.append(v)

        # ── Vehicles for demo_expired (a couple only) ──────────────────
        for i, vd in enumerate(vehicles_data[:2]):
            Vehicle.objects.get_or_create(
                dealer=dealer2, brand=brands[vd['brand']], model_name=vd['model'],
                defaults={
                    'fuel_type': vd['fuel'], 'price': Decimal(str(vd['price'])),
                    'stock_quantity': 2, 'year': 2023,
                    'description': vd.get('desc', ''),
                }
            )

        # ── Customers ──────────────────────────────────────────────────
        customers_data = [
            ('Ramesh Kumar',   '+91 99887 76655', 'Delhi'),
            ('Sunita Thakur',  '+91 88776 65544', 'Ghaziabad'),
            ('Ankush Patel',   '+91 77665 54433', 'Noida'),
            ('Lalit Sharma',   '+91 66554 43322', 'Faridabad'),
            ('Ganesh Bisht',   '+91 55443 32211', 'Delhi'),
            ('Lal Raghav',     '+91 44332 21100', 'Gurgaon'),
            ('Vinod Sharma',   '+91 33221 10099', 'Delhi'),
        ]
        cust_objs = []
        for cname, cphone, ccity in customers_data:
            c, _ = Customer.objects.get_or_create(
                dealer=dealer, phone=cphone,
                defaults={'name': cname, 'city': ccity}
            )
            cust_objs.append(c)

        # ── Leads ──────────────────────────────────────────────────────
        lead_statuses = ['new', 'interested', 'follow_up', 'converted', 'interested', 'follow_up', 'converted']
        lead_sources  = ['walk_in', 'phone', 'website', 'phone', 'walk_in', 'referral', 'website']
        for i, c in enumerate(cust_objs):
            Lead.objects.get_or_create(
                dealer=dealer, phone=c.phone,
                defaults={
                    'customer_name': c.name,
                    'vehicle':       random.choice(vehicle_objs[:5]),
                    'source':        lead_sources[i],
                    'status':        lead_statuses[i],
                    'follow_up_date': date.today() + timedelta(days=random.randint(1, 10)),
                }
            )

        # ── Sales ──────────────────────────────────────────────────────
        for i in range(5):
            c   = cust_objs[i]
            v   = vehicle_objs[i]
            inv = f'00{450 + i}'
            Sale.objects.get_or_create(
                dealer=dealer, invoice_number=f'INV-{inv}',
                defaults={
                    'vehicle': v, 'customer_name': c.name,
                    'customer_phone': c.phone, 'customer_address': c.city,
                    'sale_price': v.price, 'quantity': 1,
                    'delivery_date': date.today() + timedelta(days=random.randint(1, 14)),
                    'is_delivered': i < 2,
                    'payment_method': random.choice(['cash', 'upi', 'loan', 'bank_transfer']),
                }
            )

        # ── Tasks ──────────────────────────────────────────────────────
        tasks_data = [
            ('Call Mr. Sharma for EMI dues',         date.today(),                  'high'),
            ('Follow up with Krishan Lal',           date.today() + timedelta(days=2), 'medium'),
            ('Schedule Mahindra Treo delivery',      date.today() + timedelta(days=3), 'high'),
            ('Send insurance docs to Ramesh Kumar',  date.today() + timedelta(days=5), 'low'),
        ]
        for title, due, priority in tasks_data:
            Task.objects.get_or_create(
                dealer=dealer, title=title,
                defaults={'due_date': due, 'priority': priority}
            )

        # ── Sample dealer reviews ──────────────────────────────────────
        sample_reviews = [
            ('Suresh Yadav',    '9876501234', 5, 'Bahut badhiya service mili. Vehicle ka quality top hai. Kumar ji ne sab kuch explain kiya.'),
            ('Ravi Shankar',    '9988776655', 4, 'Good experience. Delivery on time. Finance ka process thoda lamba tha.'),
            ('Priya Gupta',     '8877665544', 5, 'Excellent showroom. Staff is very helpful. Bought Mahindra Treo, very happy.'),
            ('Mohammed Akram',  '7766554433', 4, 'Nice collection of electric vehicles. Fair pricing. Would recommend.'),
            ('Deepak Chauhan',  '6655443322', 5, 'Best dealer in Delhi for eRickshaw. After sales service is superb!'),
        ]
        for rname, rphone, rating, comment in sample_reviews:
            DealerReview.objects.get_or_create(
                dealer=dealer, reviewer_phone=rphone,
                defaults={'reviewer_name': rname, 'rating': rating, 'comment': comment}
            )

        # ── Demo Account 3: Akram — Driver/Buyer (marketplace user) ─────
        akram, created3 = User.objects.get_or_create(username='akram')
        if created3 or True:
            akram.set_password('akram1234')
            akram.first_name = 'Mohammed'
            akram.last_name  = 'Akram'
            akram.email      = 'akram@erikshawdekho.com'
            akram.save()

        UserProfile.objects.update_or_create(
            user=akram,
            defaults={
                'user_type': 'driver',
                'phone':     '+91 77665 44334',
                'city':      'Delhi',
            }
        )

        # Akram's reviews on the main dealer (as a driver who bought a vehicle)
        akram_reviews = [
            ('9876543210', 5, 'Kumar Electric ne mujhe bahut achhi service di. Maine Mahindra Treo liya — bilkul sahi kharid!'),
            ('7766554433', 4, 'Good dealer. Pricing thodi zyada thi lekin quality mein koi compromise nahi.'),
        ]
        for idx, (rphone, rating, comment) in enumerate(akram_reviews):
            DealerReview.objects.update_or_create(
                dealer=dealer, reviewer_phone=rphone,
                defaults={
                    'reviewer_name': 'Mohammed Akram',
                    'rating': rating,
                    'comment': comment,
                }
            )

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Demo data seeded!\n'
            f'\n  ── Account 1: Dealer (Pro Plan — lifetime) ──\n'
            f'  Login:    username=demo  password=demo1234\n'
            f'  Plan:     Pro (expires 31 Dec 2099)\n'
            f'  Features: All unlocked — 10 vehicles, 7 leads, 5 sales, 5+ reviews\n'
            f'\n  ── Account 2: Dealer (Expired Plan) ──\n'
            f'  Login:    username=demo_expired  password=demo1234\n'
            f'  Plan:     Free trial — expired 30 days ago\n'
            f'  Features: Locked (dashboard + plans page only)\n'
            f'\n  ── Account 3: Driver/Buyer ──\n'
            f'  Login:    username=akram  password=akram1234\n'
            f'  Type:     Driver (marketplace browse + review flow)\n'
            f'\n  API: http://localhost:8000/api/\n'
        ))
