import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Ensure an admin account exists. Idempotent; does not reset password unless requested."

    def add_arguments(self, parser):
        parser.add_argument("--username", default=None, help="Admin username (default from env or 'admin').")
        parser.add_argument("--email", default=None, help="Admin email (default from env or admin@erikshawdekho.com).")
        parser.add_argument("--password", default=None, help="Admin password (default from env).")
        parser.add_argument(
            "--update-password",
            action="store_true",
            help="If set, update existing admin password to provided value.",
        )

    def handle(self, *args, **options):
        username = (
            options.get("username")
            or os.environ.get("ADMIN_USERNAME")
            or os.environ.get("DJANGO_SUPERUSER_USERNAME")
            or "admin"
        )
        email = (
            options.get("email")
            or os.environ.get("ADMIN_EMAIL")
            or os.environ.get("DJANGO_SUPERUSER_EMAIL")
            or "admin@erikshawdekho.com"
        )
        password = (
            options.get("password")
            or os.environ.get("ADMIN_PASSWORD")
            or os.environ.get("DJANGO_SUPERUSER_PASSWORD")
        )
        update_password = options.get("update_password", False)

        User = get_user_model()
        user = User.objects.filter(username=username).first()

        if user is None:
            if not password:
                raise CommandError(
                    "Admin user does not exist and no ADMIN_PASSWORD/DJANGO_SUPERUSER_PASSWORD was provided."
                )
            user = User.objects.create_superuser(username=username, email=email, password=password)
            if not user.is_active:
                user.is_active = True
                user.save(update_fields=["is_active"])
            self.stdout.write(self.style.SUCCESS(f"Created admin user '{username}'."))
            return

        updated_fields = []
        if email and user.email != email:
            user.email = email
            updated_fields.append("email")
        if not user.is_staff:
            user.is_staff = True
            updated_fields.append("is_staff")
        if not user.is_superuser:
            user.is_superuser = True
            updated_fields.append("is_superuser")
        if not user.is_active:
            user.is_active = True
            updated_fields.append("is_active")

        if update_password:
            if not password:
                raise CommandError("--update-password was set but no password value was provided.")
            if not user.check_password(password):
                user.set_password(password)
                updated_fields.append("password")
        elif not user.has_usable_password() and password:
            user.set_password(password)
            updated_fields.append("password")

        if updated_fields:
            if "password" in updated_fields:
                # Password hash update requires full save.
                user.save()
            else:
                user.save(update_fields=updated_fields)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Admin user '{username}' verified/updated fields: {', '.join(updated_fields)}"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS(f"Admin user '{username}' already valid."))
