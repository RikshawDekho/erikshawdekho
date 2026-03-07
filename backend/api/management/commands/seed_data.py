from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import DealerProfile, Brand, Vehicle, Lead, Sale, Customer, Task
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
import random


class Command(BaseCommand):
    help = 'Seed database with demo data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding demo data...')

        # Create demo user
        user, created = User.objects.get_or_create(username='demo')
        if created:
            user.set_password('demo1234')
            user.first_name = 'Demo'
            user.last_name = 'Dealer'
            user.save()

        dealer, _ = DealerProfile.objects.get_or_create(
            user=user,
            defaults={
                'dealer_name': 'Kumar Electric Vehicles',
                'phone': '+91 98765 43210',
                'address': '1st Floor, ABC Complex, Main Street',
                'city': 'Delhi',
                'state': 'Delhi',
                'pincode': '110001',
                'gstin': '07ABCDE1234F1Z1',
                'is_verified': True,
            }
        )

        # Create brands
        brands_data = ['Yatri', 'Mahindra', 'Piaggio', 'Bajaj', 'Kinetic', 'Atul', 'Saarthi']
        brands = {}
        for bname in brands_data:
            b, _ = Brand.objects.get_or_create(name=bname)
            brands[bname] = b

        # Create vehicles
        vehicles_data = [
            {'brand': 'Yatri',    'model': 'YatriKing Pro',      'fuel': 'electric', 'price': 150000, 'stock': 12},
            {'brand': 'Piaggio',  'model': 'Piaggio Ape e-City', 'fuel': 'electric', 'price': 210000, 'stock': 8},
            {'brand': 'Mahindra', 'model': 'Mahindra Treo',      'fuel': 'electric', 'price': 220000, 'stock': 3},
            {'brand': 'Kinetic',  'model': 'Kinetic Safar Smart','fuel': 'electric', 'price': 160000, 'stock': 0},
            {'brand': 'Bajaj',    'model': 'Bajaj Compact RE',   'fuel': 'petrol',   'price': 275000, 'stock': 15},
            {'brand': 'Atul',     'model': 'Atul Gemini',        'fuel': 'electric', 'price': 135000, 'stock': 7},
            {'brand': 'Saarthi',  'model': 'Saarthi E3W',        'fuel': 'electric', 'price': 145000, 'stock': 5},
            {'brand': 'Bajaj',    'model': 'Bajaj RE CNG',       'fuel': 'cng',      'price': 245000, 'stock': 6},
            {'brand': 'Mahindra', 'model': 'Mahindra Treo Zor',  'fuel': 'electric', 'price': 265000, 'stock': 4},
            {'brand': 'Piaggio',  'model': 'Piaggio Ape Xtra LDX','fuel':'petrol',   'price': 290000, 'stock': 2},
        ]
        vehicle_objs = []
        for i, vd in enumerate(vehicles_data):
            v, _ = Vehicle.objects.get_or_create(
                dealer=dealer, brand=brands[vd['brand']], model_name=vd['model'],
                defaults={
                    'fuel_type': vd['fuel'], 'price': Decimal(str(vd['price'])),
                    'stock_quantity': vd['stock'], 'year': 2024,
                    'seating_capacity': 3, 'warranty_years': 2,
                    'is_featured': i < 4,
                    'range_km': random.randint(80, 150) if vd['fuel'] == 'electric' else None,
                }
            )
            vehicle_objs.append(v)

        # Create customers
        customers_data = [
            ('Ramesh Kumar', '+91 99887 76655', 'Delhi'),
            ('Sunita Thakur', '+91 88776 65544', 'Ghaziabad'),
            ('Ankush Patel',  '+91 77665 54433', 'Noida'),
            ('Lalit Sharma',  '+91 66554 43322', 'Faridabad'),
            ('Ganesh Bisht',  '+91 55443 32211', 'Delhi'),
            ('Lal Raghav',    '+91 44332 21100', 'Gurgaon'),
            ('Vinod Sharma',  '+91 33221 10099', 'Delhi'),
        ]
        cust_objs = []
        for cname, cphone, ccity in customers_data:
            c, _ = Customer.objects.get_or_create(
                dealer=dealer, phone=cphone,
                defaults={'name': cname, 'city': ccity}
            )
            cust_objs.append(c)

        # Create leads
        lead_statuses = ['new', 'interested', 'follow_up', 'converted', 'interested', 'follow_up', 'converted']
        lead_sources  = ['walk_in', 'phone', 'website', 'phone', 'walk_in', 'referral', 'website']
        for i, c in enumerate(cust_objs):
            Lead.objects.get_or_create(
                dealer=dealer, phone=c.phone,
                defaults={
                    'customer_name': c.name,
                    'vehicle': random.choice(vehicle_objs[:5]),
                    'source': lead_sources[i],
                    'status': lead_statuses[i],
                    'follow_up_date': date.today() + timedelta(days=random.randint(1, 10)),
                }
            )

        # Create sales
        for i in range(5):
            c = cust_objs[i]
            v = vehicle_objs[i]
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

        # Create tasks
        tasks_data = [
            ('Call Mr. Sharma for EMI dues', date.today(), 'high'),
            ('Follow up with Krishan Lal', date.today() + timedelta(days=2), 'medium'),
            ('Schedule Mahindra Treo delivery', date.today() + timedelta(days=3), 'high'),
            ('Send insurance docs to Ramesh Kumar', date.today() + timedelta(days=5), 'low'),
        ]
        for title, due, priority in tasks_data:
            Task.objects.get_or_create(
                dealer=dealer, title=title,
                defaults={'due_date': due, 'priority': priority}
            )

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Demo data seeded!\n'
            f'  Login: username=demo  password=demo1234\n'
            f'  URL: http://localhost:8000/api/\n'
        ))
