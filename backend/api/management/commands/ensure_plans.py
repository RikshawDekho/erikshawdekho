"""
ensure_plans.py — Idempotent plan seeding for production.
Run on every deploy to keep Plan records in sync with business logic.

Usage:
    python manage.py ensure_plans
"""

from django.core.management.base import BaseCommand
from api.models import Plan


PLANS = [
    {
        "slug": "free",
        "name": "Free Plan",
        "price": 0,
        "listing_limit": 5,          # 5 vehicle listings
        "priority_ranking": False,
        "featured_badge": False,
        "whatsapp_alerts": False,
        "analytics_access": False,
        "yearly_subscription": False,
        "max_dealers": 0,            # unlimited free accounts
        "is_active": True,
    },
    {
        "slug": "early_dealer",
        "name": "Early Dealer Plan",
        "price": 5000,               # ₹5,000/yr — first 100 dealers
        "listing_limit": 0,          # 0 = unlimited
        "priority_ranking": True,
        "featured_badge": True,
        "whatsapp_alerts": True,
        "analytics_access": True,
        "yearly_subscription": True,
        "max_dealers": 100,          # cap at 100 early-bird slots
        "is_active": True,
    },
    {
        "slug": "pro",
        "name": "Pro Plan",
        "price": 9000,               # ₹9,000/yr — regular price after first 100
        "listing_limit": 0,
        "priority_ranking": True,
        "featured_badge": True,
        "whatsapp_alerts": True,
        "analytics_access": True,
        "yearly_subscription": True,
        "max_dealers": 0,
        "is_active": True,
    },
]


class Command(BaseCommand):
    help = "Ensure plan records exist and are up-to-date. Safe to run on every deploy."

    def handle(self, *args, **options):
        for plan_data in PLANS:
            slug = plan_data.pop("slug")
            obj, created = Plan.objects.update_or_create(slug=slug, defaults=plan_data)
            plan_data["slug"] = slug  # restore for logging
            verb = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(f"{verb} plan: '{obj.name}' (slug={slug}, price=₹{obj.price}, listing_limit={obj.listing_limit or 'unlimited'})")
            )
        self.stdout.write(self.style.SUCCESS("Plans are up to date."))
