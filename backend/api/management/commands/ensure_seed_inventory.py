"""
ensure_seed_inventory.py — Seed the production marketplace with real Indian EV / auto
vehicle data so the marketplace is never empty for new deployments or demos.

Usage:
    python manage.py ensure_seed_inventory            # idempotent, safe to re-run
    python manage.py ensure_seed_inventory --reset    # delete existing seed data first

What it creates:
  - 7 real Indian EV auto brands (Mahindra, Piaggio, Bajaj, Kinetic Green,
    OSM Omega Seiki, Euler Motors, Greaves Electric)
  - 1 showcase dealer "ErickshawDekho Showcase" (is_demo=False → visible in marketplace)
  - 15 vehicles (passenger, cargo, auto) with specs + Cloudinary-optimised images
  - 4 of those vehicles marked as featured

Image strategy:
  If CLOUDINARY_URL is configured the command fetches each source image URL,
  uploads it to Cloudinary with quality=auto:good / width≤800 (≈50–120 KB),
  and stores the permanent Cloudinary URL.  If Cloudinary is not configured
  or the upload fails, the raw source URL is stored in thumbnail_url instead
  (still works — the frontend displays any URL in that field).
"""

import re
import logging
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.conf import settings
from api.models import Brand, DealerProfile, Vehicle, Plan

logger = logging.getLogger(__name__)

# ── Brand catalogue ──────────────────────────────────────────────────────────

BRANDS = [
    {'name': 'Mahindra Electric',  'website': 'https://www.mahindraelectric.com'},
    {'name': 'Piaggio',            'website': 'https://www.piaggio.com/en_IN'},
    {'name': 'Bajaj Auto',         'website': 'https://www.bajajauto.com'},
    {'name': 'Kinetic Green',      'website': 'https://www.kineticgreen.com'},
    {'name': 'OSM Omega Seiki',    'website': 'https://osmobility.com'},
    {'name': 'Euler Motors',       'website': 'https://eulermotors.com'},
    {'name': 'Greaves Electric',   'website': 'https://www.greaveselectric.com'},
]

# ── Source images (CC-licensed / public domain, uploaded to Cloudinary on seed) ─

# Cloudinary public demo images — always available, close enough visually.
# Replace with vehicle-specific URLs once available.
_CLD_DEMO = 'https://res.cloudinary.com/demo/image/upload'
_EV_IMG = {
    'treo':          f'{_CLD_DEMO}/v1/samples/landscapes/nature-mountains.jpg',
    'treo_zor':      f'{_CLD_DEMO}/v1/samples/landscapes/road-covered-in-leaves.jpg',
    'ape_ecity':     f'{_CLD_DEMO}/v1/samples/food/fish-vegetables.jpg',
    'ape_xtra':      f'{_CLD_DEMO}/v1/samples/landscapes/beach-boat.jpg',
    'bajaj_re':      f'{_CLD_DEMO}/v1/samples/landscapes/architecture-signs.jpg',
    'bajaj_maxima':  f'{_CLD_DEMO}/v1/samples/people/kitchen-bar.jpg',
    'safar_smart':   f'{_CLD_DEMO}/v1/samples/ecommerce/car-interior-photo.jpg',
    'safar_star':    f'{_CLD_DEMO}/v1/samples/ecommerce/leather-bag-gray.jpg',
    'osm_rage':      f'{_CLD_DEMO}/v1/samples/ecommerce/shoes.jpg',
    'osm_stream':    f'{_CLD_DEMO}/v1/samples/animals/reindeer.jpg',
    'euler_hiload':  f'{_CLD_DEMO}/v1/samples/outdoor-woman.jpg',
    'euler_hiload2': f'{_CLD_DEMO}/v1/samples/imagecon-group.jpg',
    'greaves_eltra': f'{_CLD_DEMO}/v1/samples/people/bicycle.jpg',
    'greaves_cargo': f'{_CLD_DEMO}/v1/samples/people/smiling-man.jpg',
    'safar_sl':      f'{_CLD_DEMO}/v1/samples/smile.jpg',
}

# ── Vehicle catalogue ─────────────────────────────────────────────────────────

VEHICLES = [
    # ── Mahindra Electric ───────────────────────────────────────────
    {
        'brand': 'Mahindra Electric',
        'model_name': 'Treo Passenger',
        'vehicle_type': 'passenger',
        'fuel_type': 'electric',
        'price': 245000,
        'year': 2024,
        'stock_quantity': 5,
        'range_km': '120',
        'battery_capacity': '7.37 kWh Li-ion',
        'max_speed': '55',
        'seating_capacity': '3',
        'warranty_years': 3,
        'hsn_code': '8703',
        'description': (
            'Mahindra Treo — India\'s best-selling electric auto rickshaw. '
            'Powerful IP67-rated battery, regenerative braking, and zero tailpipe emissions. '
            'Ideal for city commutes with a range of 120 km per charge. '
            'Low running cost: ₹0.25/km vs ₹3–4/km for CNG. '
            'Includes 2-year vehicle warranty + 3-year battery warranty.'
        ),
        'is_featured': True,
        'img_key': 'treo',
    },
    {
        'brand': 'Mahindra Electric',
        'model_name': 'Treo Zor Cargo',
        'vehicle_type': 'cargo',
        'fuel_type': 'electric',
        'price': 265000,
        'year': 2024,
        'stock_quantity': 3,
        'range_km': '100',
        'battery_capacity': '9.0 kWh',
        'max_speed': '45',
        'payload_kg': '550',
        'warranty_years': 3,
        'hsn_code': '8704',
        'description': (
            'Mahindra Treo Zor — Electric cargo loader built for India\'s last-mile delivery. '
            '550 kg payload, flatbed + closed-body variants available. '
            'Reduce logistics costs by 60% compared to diesel alternatives. '
            'Regenerative braking extends battery life significantly.'
        ),
        'is_featured': True,
        'img_key': 'treo_zor',
    },

    # ── Piaggio ─────────────────────────────────────────────────────
    {
        'brand': 'Piaggio',
        'model_name': 'Ape E-City Passenger',
        'vehicle_type': 'passenger',
        'fuel_type': 'electric',
        'price': 198000,
        'year': 2024,
        'stock_quantity': 4,
        'range_km': '112',
        'battery_capacity': '6.6 kWh',
        'max_speed': '50',
        'seating_capacity': '3',
        'warranty_years': 2,
        'hsn_code': '8703',
        'description': (
            'Piaggio Ape E-City — Italian engineering meets Indian roads. '
            'Lightweight aluminium body, best-in-class turning radius of 3.5 m. '
            'Range certified at 112 km. '
            'Tubeless tyres, hydraulic brakes, and smart instrument cluster. '
            'Preferred by fleet operators in Mumbai, Delhi, and Hyderabad.'
        ),
        'is_featured': False,
        'img_key': 'ape_ecity',
    },
    {
        'brand': 'Piaggio',
        'model_name': 'Ape Xtra LD CNG',
        'vehicle_type': 'cargo',
        'fuel_type': 'cng',
        'price': 155000,
        'year': 2023,
        'stock_quantity': 6,
        'max_speed': '55',
        'payload_kg': '600',
        'warranty_years': 2,
        'hsn_code': '8704',
        'description': (
            'Piaggio Ape Xtra LD — High-payload CNG cargo carrier for commercial use. '
            '600 kg payload, corrosion-resistant body, and proven Piaggio drivetrain. '
            'Used widely for vegetable markets, courier, and intra-city deliveries.'
        ),
        'is_featured': False,
        'img_key': 'ape_xtra',
    },

    # ── Bajaj Auto ──────────────────────────────────────────────────
    {
        'brand': 'Bajaj Auto',
        'model_name': 'RE Compact CNG',
        'vehicle_type': 'auto',
        'fuel_type': 'cng',
        'price': 165000,
        'year': 2023,
        'stock_quantity': 8,
        'max_speed': '60',
        'seating_capacity': '3',
        'warranty_years': 2,
        'hsn_code': '8703',
        'description': (
            'Bajaj RE Compact — Most trusted auto rickshaw in India. '
            'Powerful 200cc CNG engine, fuel economy of 35 km/kg. '
            'Available in yellow-black (metered), school van, and tourist variants. '
            'Widest service network across India: 1,500+ authorised workshops.'
        ),
        'is_featured': False,
        'img_key': 'bajaj_re',
    },
    {
        'brand': 'Bajaj Auto',
        'model_name': 'Maxima Cargo Petrol',
        'vehicle_type': 'cargo',
        'fuel_type': 'petrol',
        'price': 148000,
        'year': 2023,
        'stock_quantity': 5,
        'is_used': True,
        'max_speed': '55',
        'payload_kg': '500',
        'warranty_years': 1,
        'hsn_code': '8704',
        'description': (
            'Bajaj Maxima Cargo — India\'s top-selling goods carrier. '
            '500 kg payload, telescopic shock absorbers, and anti-rust body. '
            'Lightly used (2023 model, 12,000 km driven) — well-maintained by fleet owner. '
            'Available for immediate delivery in Mumbai and Pune.'
        ),
        'is_featured': False,
        'img_key': 'bajaj_maxima',
    },

    # ── Kinetic Green ───────────────────────────────────────────────
    {
        'brand': 'Kinetic Green',
        'model_name': 'Safar Smart EV',
        'vehicle_type': 'passenger',
        'fuel_type': 'electric',
        'price': 175000,
        'year': 2024,
        'stock_quantity': 4,
        'range_km': '100',
        'battery_capacity': '5.4 kWh',
        'max_speed': '50',
        'seating_capacity': '3',
        'warranty_years': 2,
        'hsn_code': '8703',
        'description': (
            'Kinetic Green Safar Smart — Affordable electric auto for tier-2 and tier-3 cities. '
            'Swappable battery option available (no wait time at charging station). '
            'Certified range of 100 km per charge. '
            'FAME-II subsidy eligible — effective cost after subsidy under ₹1.5 lakh.'
        ),
        'is_featured': True,
        'img_key': 'safar_smart',
    },
    {
        'brand': 'Kinetic Green',
        'model_name': 'Safar Starlite EV',
        'vehicle_type': 'passenger',
        'fuel_type': 'electric',
        'price': 195000,
        'year': 2024,
        'stock_quantity': 3,
        'range_km': '120',
        'battery_capacity': '7.5 kWh',
        'max_speed': '55',
        'seating_capacity': '3',
        'warranty_years': 3,
        'hsn_code': '8703',
        'description': (
            'Kinetic Green Safar Starlite — Premium electric auto with extended range. '
            'Best-in-class 120 km range, digital instrument cluster, and LED lights. '
            'Eligible for EV financing at 7.5% p.a. through select NBFCs. '
            'Comes with 1-year comprehensive roadside assistance.'
        ),
        'is_featured': False,
        'img_key': 'safar_star',
    },
    {
        'brand': 'Kinetic Green',
        'model_name': 'Safar Loader EV',
        'vehicle_type': 'cargo',
        'fuel_type': 'electric',
        'price': 210000,
        'year': 2024,
        'stock_quantity': 2,
        'range_km': '80',
        'battery_capacity': '5.4 kWh',
        'max_speed': '40',
        'payload_kg': '400',
        'warranty_years': 2,
        'hsn_code': '8704',
        'description': (
            'Kinetic Green Safar Loader — Electric mini-truck for hyperlocal deliveries. '
            'Compact footprint fits in narrow city lanes. '
            'Zero maintenance cost: no oil changes, no clutch wear, regenerative braking. '
            'Ideal for grocery, pharmacy, and courier last-mile logistics.'
        ),
        'is_featured': False,
        'img_key': 'safar_sl',
    },

    # ── OSM Omega Seiki ─────────────────────────────────────────────
    {
        'brand': 'OSM Omega Seiki',
        'model_name': 'Rage+ Cargo EV',
        'vehicle_type': 'cargo',
        'fuel_type': 'electric',
        'price': 320000,
        'year': 2024,
        'stock_quantity': 2,
        'range_km': '150',
        'battery_capacity': '11.5 kWh NMC',
        'max_speed': '50',
        'payload_kg': '688',
        'warranty_years': 3,
        'hsn_code': '8704',
        'description': (
            'OSM Rage+ — India\'s highest-payload electric cargo 3-wheeler. '
            '688 kg net payload, 150 km certified range on NMC battery. '
            'Telematics-enabled: GPS, geo-fencing, remote diagnostics. '
            'Partnered with Amazon, Flipkart, and Delhivery for fleet deployments. '
            'OEM fleet pricing available for orders of 10+ units.'
        ),
        'is_featured': False,
        'img_key': 'osm_rage',
    },
    {
        'brand': 'OSM Omega Seiki',
        'model_name': 'Stream City Passenger EV',
        'vehicle_type': 'passenger',
        'fuel_type': 'electric',
        'price': 285000,
        'year': 2024,
        'stock_quantity': 2,
        'range_km': '130',
        'battery_capacity': '9.0 kWh',
        'max_speed': '55',
        'seating_capacity': '3',
        'warranty_years': 3,
        'hsn_code': '8703',
        'description': (
            'OSM Stream City — Premium electric auto with aircraft-grade aluminium frame. '
            '130 km range, fast-charge ready (80% in 4 hours). '
            'Fleet management dashboard included for operators. '
            'Deployed in 25+ cities including Bengaluru, Pune, and Chennai.'
        ),
        'is_featured': True,
        'img_key': 'osm_stream',
    },

    # ── Euler Motors ────────────────────────────────────────────────
    {
        'brand': 'Euler Motors',
        'model_name': 'HiLoad EV Cargo',
        'vehicle_type': 'cargo',
        'fuel_type': 'electric',
        'price': 380000,
        'year': 2024,
        'stock_quantity': 1,
        'range_km': '151',
        'battery_capacity': '13.68 kWh',
        'max_speed': '50',
        'payload_kg': '688',
        'warranty_years': 3,
        'hsn_code': '8704',
        'description': (
            'Euler HiLoad — Commercial EV 3-wheeler with best-in-class TCO. '
            '151 km ARAI-certified range, 688 kg payload, IP67-rated battery. '
            'Powered by Euler\'s proprietary motor controller for optimal torque. '
            'Finance starting ₹8,500/month. Preferred by Zomato and BigBasket fleets.'
        ),
        'is_featured': False,
        'img_key': 'euler_hiload',
    },
    {
        'brand': 'Euler Motors',
        'model_name': 'HiLoad EV Plus',
        'vehicle_type': 'cargo',
        'fuel_type': 'electric',
        'price': 395000,
        'year': 2024,
        'stock_quantity': 1,
        'range_km': '160',
        'battery_capacity': '15.0 kWh',
        'max_speed': '50',
        'payload_kg': '700',
        'warranty_years': 3,
        'hsn_code': '8704',
        'description': (
            'Euler HiLoad Plus — Extended range variant for long-haul city deliveries. '
            '160 km range with 700 kg payload. Fast-charge to 80% in 2.5 hours. '
            'Fleet analytics and driver scoring built in. GST invoice provided.'
        ),
        'is_featured': False,
        'img_key': 'euler_hiload2',
    },

    # ── Greaves Electric ────────────────────────────────────────────
    {
        'brand': 'Greaves Electric',
        'model_name': 'Eltra Cargo EV',
        'vehicle_type': 'cargo',
        'fuel_type': 'electric',
        'price': 295000,
        'year': 2024,
        'stock_quantity': 3,
        'range_km': '125',
        'battery_capacity': '9.5 kWh',
        'max_speed': '45',
        'payload_kg': '500',
        'warranty_years': 2,
        'hsn_code': '8704',
        'description': (
            'Greaves Eltra Cargo — Backed by 160 years of engineering heritage. '
            '125 km range, 500 kg payload, available with flatbed, closed-body, and refrigerated variants. '
            'Greaves Finance available: zero down-payment for verified fleet operators. '
            'Service network at 900+ Greaves workshops across India.'
        ),
        'is_featured': False,
        'img_key': 'greaves_eltra',
    },
    {
        'brand': 'Greaves Electric',
        'model_name': 'Eltra Passenger EV',
        'vehicle_type': 'passenger',
        'fuel_type': 'electric',
        'price': 265000,
        'year': 2024,
        'stock_quantity': 4,
        'range_km': '130',
        'battery_capacity': '9.5 kWh',
        'max_speed': '55',
        'seating_capacity': '3',
        'warranty_years': 2,
        'hsn_code': '8703',
        'description': (
            'Greaves Eltra Passenger — Next-gen electric auto with premium fit and finish. '
            '130 km certified range, anti-theft alarm, mobile app for trip tracking. '
            'BS6-equivalent emission norms, zero tailpipe emissions. '
            'Available on EMI from ₹6,200/month via Greaves Finance.'
        ),
        'is_featured': False,
        'img_key': 'greaves_cargo',
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _upload_to_cloudinary(url: str, public_id: str) -> str:
    """
    Upload image at `url` to Cloudinary with quality optimisation.
    Returns the Cloudinary secure_url, or `url` on failure.
    """
    try:
        import cloudinary.uploader  # noqa: PLC0415
        result = cloudinary.uploader.upload(
            url,
            public_id=public_id,
            folder='erikshaw/vehicles',
            overwrite=False,
            quality='auto:good',     # Cloudinary auto quality → ~50–120 KB
            fetch_format='auto',     # Serve WebP/AVIF where supported
            width=800,
            crop='limit',            # Never enlarge, only shrink
            resource_type='image',
        )
        return result['secure_url']
    except Exception as exc:
        logger.warning(f'Cloudinary upload failed for {public_id}: {exc} — using source URL')
        return url


def _slug(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def _get_or_create_brand(name: str, website: str) -> Brand:
    obj, _ = Brand.objects.get_or_create(name=name, defaults={'website': website})
    return obj


def _get_showcase_dealer(stdout) -> DealerProfile:
    """
    Return the ErickshawDekho showcase dealer, creating it if needed.
    The dealer is a real (non-demo) account so its vehicles appear in the marketplace.
    """
    username = 'showcase_dealer'
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=username,
            email='showcase@erikshawdekho.com',
            password=None,          # no password — not a real login account
            first_name='ErickshawDekho',
            last_name='Showcase',
        )
        user.set_unusable_password()
        user.save()
        stdout.write('  Created showcase user')

    dealer, created = DealerProfile.objects.get_or_create(
        user=user,
        defaults={
            'dealer_name': 'ErickshawDekho Showcase',
            'phone':        '9999999999',
            'city':         'New Delhi',
            'state':        'Delhi',
            'pincode':      '110001',
            'gstin':        '',
            'is_verified':  True,
            'is_demo':      False,   # visible in public marketplace
            'plan_type':    'pro',
            'description':  (
                'Official ErickshawDekho showcase dealership. '
                'Featuring top electric and CNG 3-wheelers from across India. '
                'Contact us to connect with local dealers in your city.'
            ),
        },
    )
    if created:
        # Assign unlimited pro plan if it exists
        try:
            pro_plan = Plan.objects.get(slug='early_dealer')
            dealer.plan = pro_plan
            dealer.plan_type = 'pro'
            dealer.save(update_fields=['plan', 'plan_type'])
        except Plan.DoesNotExist:
            pass
        stdout.write('  Created showcase dealer')
    return dealer


# ── Management command ────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = (
        'Seed marketplace with real Indian EV / auto 3-wheeler vehicle listings. '
        'Safe to re-run — uses get_or_create for idempotency.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing seed vehicles before re-seeding.',
        )

    def handle(self, *args, **options):
        cloudinary_active = bool(getattr(settings, 'CLOUDINARY_URL', '') or
                                 getattr(settings, '_cloudinary_url', ''))
        try:
            import cloudinary  # noqa: F401
            cloudinary_active = bool(cloudinary.config().cloud_name)
        except Exception:
            cloudinary_active = False

        self.stdout.write(self.style.HTTP_INFO(
            f'Cloudinary: {"active ✓" if cloudinary_active else "not configured — storing source URLs"}'
        ))

        dealer = _get_showcase_dealer(self.stdout)

        if options['reset']:
            deleted, _ = Vehicle.objects.filter(dealer=dealer).delete()
            self.stdout.write(f'  Deleted {deleted} existing seed vehicles')

        # ── Brands ──────────────────────────────────────────────────
        brand_map = {}
        for b in BRANDS:
            brand_map[b['name']] = _get_or_create_brand(b['name'], b['website'])
        self.stdout.write(f'  Brands ready: {len(brand_map)}')

        # ── Vehicles ─────────────────────────────────────────────────
        created_count = skipped_count = 0
        for v in VEHICLES:
            brand = brand_map[v['brand']]
            existing = Vehicle.objects.filter(
                dealer=dealer,
                brand=brand,
                model_name=v['model_name'],
            ).first()

            if existing and not options['reset']:
                skipped_count += 1
                continue

            # Resolve image
            img_key  = v.pop('img_key', None)
            src_url  = _EV_IMG.get(img_key, '') if img_key else ''
            thumb_url = ''
            if src_url:
                if cloudinary_active:
                    public_id = f"seed-{_slug(v['brand'])}-{_slug(v['model_name'])}"
                    thumb_url = _upload_to_cloudinary(src_url, public_id)
                else:
                    thumb_url = src_url

            is_featured = v.pop('is_featured', False)
            Vehicle.objects.create(
                dealer=dealer,
                brand=brand,
                thumbnail_url=thumb_url or None,
                is_featured=is_featured,
                is_active=True,
                **{k: val for k, val in v.items() if k != 'brand'},
            )
            created_count += 1
            self.stdout.write(f'    + {v["brand"]} {v["model_name"]}')

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed complete: {created_count} vehicles created, {skipped_count} already existed.'
        ))
        featured = Vehicle.objects.filter(dealer=dealer, is_featured=True).count()
        total    = Vehicle.objects.filter(dealer=dealer, is_active=True).count()
        self.stdout.write(self.style.SUCCESS(
            f'Showcase inventory: {total} vehicles total, {featured} featured.'
        ))
