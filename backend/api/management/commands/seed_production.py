"""
seed_production — One-time production bootstrap.

Creates Plans, FinancerPlans, and PlatformSettings only.
Does NOT create any users or fake data.

Safety gates:
  1. APP_ENV must be 'prod'
  2. --confirm-production flag must be passed

Usage (run once via Railway shell after first deploy):
    python manage.py seed_production --confirm-production
"""
import os
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from api.models import Plan, FinancerPlan, PlatformSettings


class Command(BaseCommand):
    help = 'Bootstrap production database with Plans and PlatformSettings (no fake data).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm-production',
            action='store_true',
            dest='confirm',
            help='Required safety flag to run this command.',
        )

    def handle(self, *args, **options):
        # ── Safety gate 1: environment ─────────────────────────────
        app_env = os.environ.get('APP_ENV', '') or os.environ.get('ENVIRONMENT', '')
        if app_env.lower() not in ('prod', 'production'):
            raise CommandError(
                f"seed_production refused: APP_ENV='{app_env}' is not 'prod'.\n"
                "This command must only run in the production environment."
            )

        # ── Safety gate 2: explicit confirmation flag ──────────────
        if not options['confirm']:
            raise CommandError(
                "seed_production refused: missing --confirm-production flag.\n"
                "Run: python manage.py seed_production --confirm-production"
            )

        self.stdout.write(self.style.WARNING('Bootstrapping production database...'))

        # ── Dealer Plans ───────────────────────────────────────────
        self.stdout.write('  Creating dealer Plans...')
        Plan.objects.update_or_create(
            slug='free',
            defaults={
                'name':             'Free',
                'price':            Decimal('0.00'),
                'listing_limit':    3,
                'priority_ranking': False,
                'featured_badge':   False,
                'whatsapp_alerts':  False,
                'analytics_access': False,
                'yearly_subscription': False,
                'max_dealers':      0,
                'is_active':        True,
            },
        )
        Plan.objects.update_or_create(
            slug='early_dealer',
            defaults={
                'name':             'Early Dealer',
                'price':            Decimal('5000.00'),
                'listing_limit':    0,           # unlimited
                'priority_ranking': True,
                'featured_badge':   True,
                'whatsapp_alerts':  True,
                'analytics_access': True,
                'yearly_subscription': True,
                'max_dealers':      0,
                'is_active':        True,
            },
        )
        self.stdout.write('  Dealer plans: Free + Early Dealer ✓')

        # ── Financer Plans ─────────────────────────────────────────
        self.stdout.write('  Creating FinancerPlans...')
        FinancerPlan.objects.update_or_create(
            slug='free',
            defaults={
                'name':                     'Free',
                'price_per_year':           Decimal('0.00'),
                'max_dealer_associations':  5,
                'max_finance_applications': 10,
                'success_commission_pct':   Decimal('0.00'),
                'is_active':                True,
                'features_json': [
                    'Up to 5 dealer associations',
                    'Up to 10 finance applications',
                    'Basic dashboard',
                ],
            },
        )
        FinancerPlan.objects.update_or_create(
            slug='starter',
            defaults={
                'name':                     'Starter',
                'price_per_year':           Decimal('5000.00'),
                'max_dealer_associations':  20,
                'max_finance_applications': 0,  # unlimited
                'success_commission_pct':   Decimal('0.00'),
                'is_active':                True,
                'features_json': [
                    'Up to 20 dealer associations',
                    'Unlimited applications',
                    'WhatsApp notifications',
                    'Analytics dashboard',
                ],
            },
        )
        FinancerPlan.objects.update_or_create(
            slug='growth',
            defaults={
                'name':                     'Growth',
                'price_per_year':           Decimal('0.00'),
                'max_dealer_associations':  0,  # unlimited
                'max_finance_applications': 0,  # unlimited
                'success_commission_pct':   Decimal('1.50'),
                'is_active':                True,
                'features_json': [
                    'Unlimited dealer associations',
                    'Unlimited applications',
                    '1.5% commission on successful disbursement',
                    'Priority support',
                    'Custom branding',
                ],
            },
        )
        self.stdout.write('  Financer plans: Free + Starter + Growth ✓')

        # ── PlatformSettings singleton ─────────────────────────────
        self.stdout.write('  Creating PlatformSettings...')
        PlatformSettings.objects.update_or_create(
            pk=1,
            defaults={
                'support_phone':    os.environ.get('SUPPORT_PHONE', ''),
                'support_whatsapp': os.environ.get('SUPPORT_WHATSAPP', ''),
                'support_email':    os.environ.get('SUPPORT_EMAIL', 'support@erikshawdekho.com'),
                'support_name':     os.environ.get('PLATFORM_TEAM_NAME', 'eRickshawDekho Support'),
            },
        )
        self.stdout.write('  PlatformSettings ✓')

        self.stdout.write(self.style.SUCCESS(
            '\nProduction bootstrap complete.\n'
            'Next steps:\n'
            '  1. Log in to Django admin to verify Plans and PlatformSettings.\n'
            '  2. Update support_phone and support_whatsapp via admin if not set in env.\n'
            '  3. ensure_admin already ran via Dockerfile CMD — check admin login works.\n'
        ))
