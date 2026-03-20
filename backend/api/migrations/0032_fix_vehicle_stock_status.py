"""
Data migration: fix stock_status for vehicles that were added when stock_quantity
defaulted to 0. Migration 0031 changed the column default to 1 but did not
update existing rows. This migration sets stock_quantity=1 and
stock_status='low_stock' for every active vehicle that still has qty=0, making
them visible in the public marketplace.

Root cause documented in tests.py:
  "stock_quantity=0 default → vehicles invisible in marketplace"
"""

from django.db import migrations


def fix_stock_status(apps, schema_editor):
    Vehicle = apps.get_model('api', 'Vehicle')
    updated = Vehicle.objects.filter(
        stock_quantity=0,
        is_active=True,
    ).update(stock_quantity=1, stock_status='low_stock')
    if updated:
        print(f"  Fixed {updated} vehicle(s): stock_quantity 0→1, stock_status→low_stock")


def reverse_fix(apps, schema_editor):
    # Reversing is a no-op — we can't know which vehicles were genuinely 0 vs fixed.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0031_vehicle_stock_quantity_default_1'),
    ]

    operations = [
        migrations.RunPython(fix_stock_status, reverse_code=reverse_fix),
    ]
