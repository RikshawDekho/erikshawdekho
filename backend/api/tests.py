"""
Test suite for ErickshawDekho API.

Philosophy: test the FULL USER JOURNEY, not just "does the endpoint return 200?".
Each test class maps to a user story. If a bug slips through, add a regression
test here so it can never silently regress again.

Bugs that have been regressed here:
  - stock_quantity=0 default → vehicles invisible in marketplace
  - featured section filtering paginated general list instead of ?featured=true
  - admin settings not reflected in platform settings (||  vs ?? in frontend)
  - dealer inventory limit blocking pro plan adds
  - admin featuring an out_of_stock vehicle → still not in ?featured=true (stock filter)
  - existing DB rows had stock_quantity=0 after migration only changed column default
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from api.models import DealerProfile, Vehicle, Brand, Plan, PlatformSettings


# ── Helpers ───────────────────────────────────────────────────────────────────

def _register_dealer(client, username="dealer1", phone="9000000001"):
    """
    Register a dealer and return (access_token, dealer_id).
    NOTE: RegisterSerializer auto-generates username from email prefix (strips
    non-alphanumeric chars), so never look up User by the username we pass in —
    use dealer_id from the response instead.
    """
    res = client.post('/api/auth/register/', {
        'email':       f'{username}@testdealer.com',
        'password':    'testpass123',
        'dealer_name': f'{username} Motors',
        'phone':       phone,
        'city':        'Mumbai',
        'state':       'Maharashtra',
        'pincode':     '400001',
    }, format='json')
    assert res.status_code == 201, f"Register failed: {res.data}"
    return res.data['access'], res.data['dealer']['id']


def _get_results(data):
    """
    Safely extract results list from a DRF paginated or plain response.
    Handles {'results': [], 'count': 0} and plain list responses.
    """
    if isinstance(data, dict):
        return data.get('results', [])
    return data if isinstance(data, list) else []


def _add_vehicle(client, token, brand_id, stock_quantity=None):
    """Add a vehicle and return response data."""
    payload = {
        'brand':        brand_id,
        'model_name':   'Test EV Model',
        'fuel_type':    'electric',
        'vehicle_type': 'passenger',
        'price':        '125000',
        'year':         2024,
    }
    if stock_quantity is not None:
        payload['stock_quantity'] = stock_quantity
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client.post('/api/vehicles/', payload, format='json')


# ── Auth Tests ────────────────────────────────────────────────────────────────

class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_dealer(self):
        res = self.client.post('/api/auth/register/', {
            'email':       'dealer@test.com',
            'password':    'testpass123',
            'dealer_name': 'Test Motors',
            'phone':       '9876543210',
            'city':        'Mumbai',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)

    def test_login(self):
        User.objects.create_user('loginuser', 'login@test.com', 'pass1234')
        res = self.client.post('/api/auth/login/', {
            'username': 'loginuser',
            'password': 'pass1234',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)

    def test_unauthenticated_dashboard(self):
        res = self.client.get('/api/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_marketplace_public(self):
        res = self.client.get('/api/marketplace/')
        self.assertNotEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


# ── Vehicle Lifecycle Tests ───────────────────────────────────────────────────
# REGRESSION: stock_quantity defaulting to 0 made new vehicles invisible
# in marketplace (stock_status='out_of_stock' excluded by marketplace filter).

class VehicleLifecycleTests(TestCase):
    """
    Full journey: dealer adds vehicle → vehicle appears in public marketplace.
    This is the #1 user-facing flow — if this breaks, dealers are invisible.
    """

    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name='TestBrand')
        cache.clear()  # prevent cross-test cache pollution from marketplace caching

    def test_new_vehicle_defaults_to_low_stock(self):
        """
        REGRESSION: stock_quantity defaulted to 0 → out_of_stock → invisible in marketplace.
        A vehicle created without specifying stock_quantity must default to qty=1 (low_stock).
        """
        token, _ = _register_dealer(self.client, 'dealerstock', '9100000001')
        res = _add_vehicle(self.client, token, self.brand.id)  # no stock_quantity
        self.assertEqual(res.status_code, 201, f"Add vehicle failed: {res.data}")
        self.assertEqual(res.data['stock_quantity'], 1,
                         "stock_quantity must default to 1, not 0")
        self.assertEqual(res.data['stock_status'], 'low_stock',
                         "stock_status must be low_stock when qty=1")

    def test_new_vehicle_visible_in_marketplace(self):
        """
        Full journey: register → add vehicle → vehicle appears in public /marketplace/.
        This would have caught the stock_quantity=0 bug on day one.
        """
        token, _ = _register_dealer(self.client, 'dealermkt', '9100000002')
        add_res = _add_vehicle(self.client, token, self.brand.id)
        self.assertEqual(add_res.status_code, 201)
        vehicle_id = add_res.data['id']

        # Check public marketplace — no auth required
        self.client.credentials()  # clear auth
        mkt_res = self.client.get('/api/marketplace/')
        self.assertEqual(mkt_res.status_code, 200)
        ids = [v['id'] for v in _get_results(mkt_res.data)]
        self.assertIn(vehicle_id, ids,
                      "Newly added vehicle must appear in public marketplace")

    def test_vehicle_with_qty_zero_is_out_of_stock(self):
        """Explicit qty=0 → out_of_stock is correct behaviour (dealer chose to mark as OOS)."""
        token, _ = _register_dealer(self.client, 'dealeroos', '9100000003')
        res = _add_vehicle(self.client, token, self.brand.id, stock_quantity=0)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['stock_status'], 'out_of_stock')

    def test_out_of_stock_vehicle_hidden_from_marketplace(self):
        """A vehicle with stock_status=out_of_stock must NOT appear in marketplace."""
        token, _ = _register_dealer(self.client, 'dealerhidden', '9100000004')
        add_res = _add_vehicle(self.client, token, self.brand.id, stock_quantity=0)
        vehicle_id = add_res.data['id']

        self.client.credentials()
        mkt_res = self.client.get('/api/marketplace/')
        ids = [v['id'] for v in _get_results(mkt_res.data)]
        self.assertNotIn(vehicle_id, ids,
                         "out_of_stock vehicle must NOT appear in public marketplace")

    def test_dealer_can_see_own_inventory(self):
        """Dealer must see their own vehicles in /api/vehicles/ (requires auth)."""
        token, _ = _register_dealer(self.client, 'dealerinv', '9100000005')
        _add_vehicle(self.client, token, self.brand.id)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.get('/api/vehicles/')
        self.assertEqual(res.status_code, 200)
        self.assertGreater(len(_get_results(res.data)), 0,
                           "Dealer must see their own vehicles")

    def test_dealer_cannot_see_other_dealers_inventory(self):
        """Dealer A must not see Dealer B's vehicles in their inventory."""
        token_a, _ = _register_dealer(self.client, 'dealera', '9100000006')
        token_b, _ = _register_dealer(self.client, 'dealerb', '9100000007')
        _add_vehicle(self.client, token_b, self.brand.id)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
        res = self.client.get('/api/vehicles/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(_get_results(res.data)), 0,
                         "Dealer A must not see Dealer B's vehicles")


# ── Plan / Listing Limit Tests ────────────────────────────────────────────────

class PlanListingLimitTests(TestCase):
    """
    Ensure plan listing limits are enforced correctly.
    Free plan: max 5 vehicles. Pro/early_dealer: unlimited.
    """

    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name='LimitBrand')
        # Ensure plans exist
        self.free_plan = Plan.objects.get_or_create(
            slug='free',
            defaults={'name': 'Free Plan', 'price': 0, 'listing_limit': 5,
                      'priority_ranking': False, 'featured_badge': False,
                      'whatsapp_alerts': False, 'analytics_access': False,
                      'yearly_subscription': False, 'is_active': True}
        )[0]
        self.pro_plan = Plan.objects.get_or_create(
            slug='early_dealer',
            defaults={'name': 'Early Dealer Plan', 'price': 5000, 'listing_limit': 0,
                      'priority_ranking': True, 'featured_badge': True,
                      'whatsapp_alerts': True, 'analytics_access': True,
                      'yearly_subscription': True, 'is_active': True}
        )[0]

    def _make_dealer_with_plan(self, username, phone, plan):
        token, dealer_id = _register_dealer(self.client, username, phone)
        dealer = DealerProfile.objects.get(id=dealer_id)
        dealer.plan = plan
        dealer.plan_type = 'free' if plan.slug == 'free' else 'pro'
        dealer.save()
        return token

    def test_free_plan_enforces_listing_limit(self):
        """Free plan (limit=5): 6th vehicle add must return 403."""
        token = self._make_dealer_with_plan('freedealer', '9200000001', self.free_plan)
        # Add 5 vehicles successfully
        for i in range(5):
            res = _add_vehicle(self.client, token, self.brand.id)
            self.assertEqual(res.status_code, 201,
                             f"Vehicle {i+1}/5 should succeed on free plan")
        # 6th must be rejected
        res = _add_vehicle(self.client, token, self.brand.id)
        self.assertEqual(res.status_code, 403,
                         "6th vehicle on free plan must be rejected (listing limit)")

    def test_pro_plan_has_no_listing_limit(self):
        """Pro/early_dealer plan (limit=0): should allow more than 5 vehicles."""
        token = self._make_dealer_with_plan('prodealer', '9200000002', self.pro_plan)
        for i in range(7):  # more than the free limit
            res = _add_vehicle(self.client, token, self.brand.id)
            self.assertEqual(res.status_code, 201,
                             f"Vehicle {i+1} should succeed on pro plan (unlimited)")


# ── Featured Vehicles Tests ───────────────────────────────────────────────────
# REGRESSION: DriverLandingPage was filtering vehicles.filter(v => v.is_featured)
# from the paginated general list. Featured vehicles at the end of the list were
# cut off. Fix: use ?featured=true endpoint directly.

class FeaturedVehiclesTests(TestCase):
    """
    Ensure the ?featured=true endpoint returns ONLY featured vehicles,
    and that featured vehicles appear regardless of general list ordering.
    """

    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name='FeatBrand')
        cache.clear()

    def test_featured_endpoint_returns_only_featured(self):
        """?featured=true must return only vehicles where is_featured=True."""
        token, dealer_id = _register_dealer(self.client, 'featdealer', '9300000001')
        dealer = DealerProfile.objects.get(id=dealer_id)

        # Add 3 vehicles, mark 1 as featured directly
        for i in range(3):
            _add_vehicle(self.client, token, self.brand.id)

        vehicles = list(Vehicle.objects.filter(dealer=dealer).order_by('id'))
        vehicles[0].is_featured = True
        vehicles[0].save(update_fields=['is_featured'])

        self.client.credentials()
        res = self.client.get('/api/marketplace/?featured=true')
        self.assertEqual(res.status_code, 200)
        ids = [v['id'] for v in _get_results(res.data)]
        self.assertIn(vehicles[0].id, ids,
                      "Featured vehicle must appear in ?featured=true response")
        self.assertNotIn(vehicles[1].id, ids,
                         "Non-featured vehicle must NOT appear in ?featured=true")

    def test_unfeatured_vehicle_not_in_featured_endpoint(self):
        """Vehicles without is_featured=True must not appear in ?featured=true."""
        token, _ = _register_dealer(self.client, 'unfeatdealer', '9300000002')
        res = _add_vehicle(self.client, token, self.brand.id)
        vehicle_id = res.data['id']

        self.client.credentials()
        mkt_res = self.client.get('/api/marketplace/?featured=true')
        ids = [v['id'] for v in _get_results(mkt_res.data)]
        self.assertNotIn(vehicle_id, ids,
                         "Non-featured vehicle must not appear in ?featured=true")

    def test_out_of_stock_featured_vehicle_not_in_marketplace(self):
        """
        REGRESSION: Admin features a vehicle that has stock_status='out_of_stock'.
        Even though is_featured=True, the vehicle must not appear in ?featured=true
        because the marketplace always filters out out_of_stock inventory.
        Migration 0032 fixes existing rows by setting stock_quantity=1 on deploy.
        """
        token, dealer_id = _register_dealer(self.client, 'oosfeatdealer', '9300000003')
        # Add vehicle with qty=0 (simulates pre-migration state)
        add_res = _add_vehicle(self.client, token, self.brand.id, stock_quantity=0)
        vehicle_id = add_res.data['id']
        self.assertEqual(add_res.data['stock_status'], 'out_of_stock')

        # Feature it directly (as admin would)
        v = Vehicle.objects.get(id=vehicle_id)
        v.is_featured = True
        v.save(update_fields=['is_featured'])

        self.client.credentials()
        feat_res = self.client.get('/api/marketplace/?featured=true')
        ids = [v['id'] for v in _get_results(feat_res.data)]
        self.assertNotIn(vehicle_id, ids,
                         "out_of_stock vehicle must not appear even if is_featured=True")

    def test_low_stock_featured_vehicle_in_marketplace(self):
        """
        After data migration fix: a vehicle with stock_quantity=1 (low_stock) that is
        featured must appear in ?featured=true.
        """
        token, dealer_id = _register_dealer(self.client, 'lowfeatdealer', '9300000004')
        add_res = _add_vehicle(self.client, token, self.brand.id, stock_quantity=1)
        vehicle_id = add_res.data['id']
        self.assertEqual(add_res.data['stock_status'], 'low_stock')

        v = Vehicle.objects.get(id=vehicle_id)
        v.is_featured = True
        v.save(update_fields=['is_featured'])

        self.client.credentials()
        cache.clear()
        feat_res = self.client.get('/api/marketplace/?featured=true')
        ids = [v['id'] for v in _get_results(feat_res.data)]
        self.assertIn(vehicle_id, ids,
                      "low_stock featured vehicle must appear in ?featured=true")


# ── Admin Settings Tests ──────────────────────────────────────────────────────
# REGRESSION: Footer was showing hardcoded BRANDING defaults instead of
# admin-configured values because || (falsy) treated empty string as falsy.

class AdminSettingsTests(TestCase):
    """
    Ensure admin-saved contact settings are immediately visible via
    /api/platform/settings/ (the endpoint the footer reads from).
    """

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'adminpass')

    def _admin_token(self):
        res = self.client.post('/api/auth/login/', {
            'username': 'admin', 'password': 'adminpass'
        }, format='json')
        return res.data['access']

    def test_admin_settings_reflected_in_platform_settings(self):
        """
        Full journey: admin PATCHes contact info → /api/platform/settings/ returns
        the new values. This validates the footer data pipeline.
        """
        token = self._admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        patch_res = self.client.patch('/api/admin-portal/settings/', {
            'support_email':    'test@erikshawdekho.com',
            'support_phone':    '+91 98765 43210',
            'support_whatsapp': '919876543210',
        }, format='json')
        self.assertEqual(patch_res.status_code, 200,
                         f"Admin settings PATCH failed: {patch_res.data}")

        # Platform settings endpoint must reflect the update immediately
        self.client.credentials()
        settings_res = self.client.get('/api/platform/settings/')
        self.assertEqual(settings_res.status_code, 200)
        self.assertEqual(settings_res.data['support_email'], 'test@erikshawdekho.com',
                         "Platform settings must reflect admin-saved email immediately")
        self.assertEqual(settings_res.data['support_phone'], '+91 98765 43210',
                         "Platform settings must reflect admin-saved phone immediately")

    def test_platform_settings_accessible_without_auth(self):
        """Footer fetches /api/platform/settings/ without auth — must be public."""
        res = self.client.get('/api/platform/settings/')
        self.assertNotEqual(res.status_code, 401,
                            "Platform settings must be publicly accessible (footer reads it)")

    def test_homepage_content_accessible_without_auth(self):
        """/api/public/homepage/ must be public — landing page reads it without auth."""
        res = self.client.get('/api/public/homepage/')
        self.assertNotEqual(res.status_code, 401,
                            "Homepage content must be publicly accessible")


# ── Demo Dealer Isolation Tests ───────────────────────────────────────────────

class DemoDealerIsolationTests(TestCase):
    """
    Demo dealers and their vehicles must be invisible in the public marketplace.
    This ensures demo data never pollutes production-facing pages.
    """

    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name='DemoBrand')
        cache.clear()

    def test_demo_dealer_vehicles_not_in_marketplace(self):
        """Vehicles belonging to is_demo=True dealers must not appear in marketplace."""
        token, dealer_id = _register_dealer(self.client, 'demodealerx', '9400000001')
        dealer = DealerProfile.objects.get(id=dealer_id)
        dealer.is_demo = True
        dealer.save(update_fields=['is_demo'])

        add_res = _add_vehicle(self.client, token, self.brand.id)
        vehicle_id = add_res.data['id']

        self.client.credentials()
        mkt_res = self.client.get('/api/marketplace/')
        ids = [v['id'] for v in _get_results(mkt_res.data)]
        self.assertNotIn(vehicle_id, ids,
                         "Demo dealer's vehicles must not appear in public marketplace")
