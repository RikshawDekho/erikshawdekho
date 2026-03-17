from django.core.management.base import BaseCommand
from api.models import FinancerPlan


PLANS = [
    {
        'slug': 'free',
        'name': 'Free Trial',
        'price_per_year': 0,
        'max_dealer_associations': 2,
        'max_finance_applications': 5,
        'commission_per_lead': 3000,
        'is_active': True,
        'features_json': [
            'Up to 2 dealer associations',
            'Up to 5 finance applications',
            '₹3,000 commission per financed lead',
        ],
    },
    {
        'slug': 'pro',
        'name': 'Pro Plan',
        'price_per_year': 5000,
        'max_dealer_associations': 0,   # 0 = unlimited
        'max_finance_applications': 0,  # 0 = unlimited
        'commission_per_lead': 2000,
        'is_active': True,
        'features_json': [
            'Unlimited dealer associations',
            'Unlimited finance applications',
            'Unlimited buyer leads',
            '₹2,000 commission per financed lead',
            '₹5,000/year subscription',
        ],
    },
]


class Command(BaseCommand):
    help = 'Ensure FinancerPlan records exist with correct values'

    def handle(self, *args, **options):
        for data in PLANS:
            slug = data.pop('slug')
            # Also handle stale records that have the right name but wrong slug
            name = data.get('name')
            FinancerPlan.objects.filter(name=name).exclude(slug=slug).update(slug=slug)
            obj, created = FinancerPlan.objects.update_or_create(
                slug=slug,
                defaults=data,
            )
            data['slug'] = slug  # restore for logging
            verb = 'Created' if created else 'Updated'
            self.stdout.write(f'{verb} financer plan: {obj.name}')
        self.stdout.write(self.style.SUCCESS('Financer plans are up to date.'))
