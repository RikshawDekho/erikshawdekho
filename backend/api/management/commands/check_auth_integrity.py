import os

from django.contrib.auth import authenticate, get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.models import Q


class Command(BaseCommand):
    help = "Validate auth-table integrity and admin login readiness after deployment."

    def add_arguments(self, parser):
        parser.add_argument(
            "--warn-only",
            action="store_true",
            help="Print problems as warnings and continue without failing.",
        )
        parser.add_argument(
            "--username",
            default=None,
            help="Admin username to validate with password (optional).",
        )
        parser.add_argument(
            "--password-env",
            default="ADMIN_PASSWORD",
            help="Environment variable name that stores admin password for validation.",
        )

    def handle(self, *args, **options):
        warn_only = options.get("warn_only", False)
        username_opt = options.get("username")
        password_env = options.get("password_env")

        issues = []
        warnings = []

        User = get_user_model()

        try:
            total_users = User.objects.count()
            self.stdout.write(f"Auth integrity: total users = {total_users}")
        except Exception as exc:
            issues.append(f"Unable to query auth users table: {exc}")
            total_users = None

        admins_qs = User.objects.filter(Q(is_superuser=True) | Q(is_staff=True))
        if total_users is not None:
            active_admins_qs = admins_qs.filter(is_active=True)
            admin_count = active_admins_qs.count()
            if admin_count == 0:
                issues.append("No active admin/superadmin account found.")
            else:
                usernames = list(active_admins_qs.values_list("username", flat=True)[:5])
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Auth integrity: active admin users found = {admin_count} ({', '.join(usernames)})"
                    )
                )

        # Check unapplied migrations because auth failures often come from partial deployments.
        try:
            executor = MigrationExecutor(connection)
            targets = executor.loader.graph.leaf_nodes()
            plan = executor.migration_plan(targets)
            if plan:
                issues.append(f"Unapplied migrations detected: {len(plan)}")
            else:
                self.stdout.write(self.style.SUCCESS("Auth integrity: migrations are fully applied."))
        except Exception as exc:
            issues.append(f"Unable to evaluate migration state: {exc}")

        # Optional live credential check when password is provided via env.
        admin_username = (
            username_opt
            or os.environ.get("ADMIN_USERNAME")
            or os.environ.get("DJANGO_SUPERUSER_USERNAME")
        )
        admin_password = os.environ.get(password_env)

        if admin_username and admin_password:
            user = authenticate(username=admin_username, password=admin_password)
            if not user:
                issues.append(
                    f"Credential check failed for admin username '{admin_username}' using env '{password_env}'."
                )
            elif not user.is_active:
                issues.append(f"Credential check user '{admin_username}' is inactive.")
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Auth integrity: credential check passed for '{admin_username}'."
                    )
                )
        else:
            warnings.append(
                "Skipped credential authentication check (set ADMIN_USERNAME and ADMIN_PASSWORD to enable)."
            )

        for msg in warnings:
            self.stdout.write(self.style.WARNING(f"WARNING: {msg}"))

        if issues:
            for msg in issues:
                self.stdout.write(self.style.ERROR(f"ERROR: {msg}"))
            if warn_only:
                self.stdout.write(self.style.WARNING("warn-only mode enabled; continuing despite errors."))
                return
            raise CommandError("Auth integrity checks failed.")

        self.stdout.write(self.style.SUCCESS("Auth integrity checks passed."))
