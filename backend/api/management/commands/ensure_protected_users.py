"""
ensure_protected_users — idempotent command to guarantee platform test/admin accounts exist.

Protected accounts (NEVER deleted by any reset/seed operation):
  1. admin           / password from ADMIN_PASSWORD env (default: admin1234 in demo)
  2. demo            / password from DEMO_DEALER_PASSWORD env (default: demo1234)
  3. codingmaniac007 / password from DEMO_FINANCER_PASSWORD env (default: demo@1234)

Run on every deploy via Dockerfile CMD (same pattern as ensure_admin).
"""
import os
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from api.models import DealerProfile, FinancerProfile, UserProfile


PROTECTED = [
    {
        'username': 'admin',
        'email': 'admin@erikshawdekho.com',
        'password_env': 'ADMIN_PASSWORD',
        'password_default': 'admin1234',
        'is_staff': True, 'is_superuser': True,
        'role': 'admin',
    },
    {
        'username': 'demo',
        'email': 'demo@erikshawdekho.com',
        'password_env': 'DEMO_DEALER_PASSWORD',
        'password_default': 'demo1234',
        'is_staff': False, 'is_superuser': False,
        'role': 'dealer',
        'dealer': {
            'dealer_name': 'Demo Dealer',
            'city': 'Lucknow',
            'state': 'Uttar Pradesh',
            'phone': '9999999999',
            'is_verified': True,
            'is_demo': True,
        },
    },
    {
        'username': 'codingmaniac007',
        'email': 'codingmaniac007@gmail.com',
        'password_env': 'DEMO_FINANCER_PASSWORD',
        'password_default': 'demo@1234',
        'is_staff': False, 'is_superuser': False,
        'role': 'financer',
        'financer': {
            'company_name': 'Demo Finance Co.',
            'contact_person': 'Demo Financer',
            'phone': '8888888888',
            'city': 'Lucknow',
            'state': 'Uttar Pradesh',
            'is_verified': True,
            'is_demo': True,
        },
    },
]

FORCE_UPDATE = os.environ.get('FORCE_PROTECTED_PASSWORD_UPDATE', 'false').lower() == 'true'


class Command(BaseCommand):
    help = 'Ensure protected platform accounts exist and have correct credentials.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Print actions without writing')

    def handle(self, *args, **options):
        dry = options.get('dry_run', False)
        for cfg in PROTECTED:
            username = cfg['username']
            email = cfg['email']
            password = os.environ.get(cfg['password_env'], cfg['password_default'])
            if not password:
                self.stdout.write(self.style.WARNING(f'[{username}] No password set (env {cfg["password_env"]} not found). Skipping password.'))

            user, created = User.objects.get_or_create(
                username=username,
                defaults={'email': email, 'is_staff': cfg['is_staff'], 'is_superuser': cfg['is_superuser'], 'is_active': True}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'[{username}] Created user.'))
            else:
                self.stdout.write(f'[{username}] Already exists.')

            # Ensure flags
            changed = False
            if user.is_staff != cfg['is_staff']:
                user.is_staff = cfg['is_staff']; changed = True
            if user.is_superuser != cfg['is_superuser']:
                user.is_superuser = cfg['is_superuser']; changed = True
            if user.email != email:
                user.email = email; changed = True
            if not user.is_active:
                user.is_active = True; changed = True

            if password and (created or FORCE_UPDATE):
                if not dry:
                    user.set_password(password)
                changed = True
                self.stdout.write(f'[{username}] Password set.')

            if changed and not dry:
                user.save()

            # UserProfile
            if not dry:
                up, _ = UserProfile.objects.get_or_create(user=user)
                if cfg['role'] and not up.user_type:
                    up.user_type = cfg['role']
                    up.save(update_fields=['user_type'])

            # Dealer profile
            if 'dealer' in cfg and not dry:
                dp_defaults = {k: v for k, v in cfg['dealer'].items()}
                dp, dp_created = DealerProfile.objects.get_or_create(user=user, defaults=dp_defaults)
                if dp_created:
                    self.stdout.write(self.style.SUCCESS(f'[{username}] Created dealer profile.'))
                else:
                    # Always ensure is_demo flag
                    if not dp.is_demo:
                        dp.is_demo = True
                        dp.save(update_fields=['is_demo'])

            # Financer profile
            if 'financer' in cfg and not dry:
                fp_defaults = {k: v for k, v in cfg['financer'].items()}
                fp, fp_created = FinancerProfile.objects.get_or_create(user=user, defaults=fp_defaults)
                if fp_created:
                    self.stdout.write(self.style.SUCCESS(f'[{username}] Created financer profile.'))
                else:
                    if not fp.is_demo:
                        fp.is_demo = True
                        fp.save(update_fields=['is_demo'])

        self.stdout.write(self.style.SUCCESS('ensure_protected_users done.'))
