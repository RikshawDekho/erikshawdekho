import os
from urllib.parse import urlparse

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


def _normalize_env(raw_value):
    val = (raw_value or "").strip().lower()
    aliases = {
        "dev": "dev",
        "development": "dev",
        "demo": "demo",
        "staging": "demo",
        "prod": "prod",
        "production": "prod",
    }
    return aliases.get(val, "prod")


def _db_name_from_url(url):
    if not url:
        return ""
    parsed = urlparse(url)
    return parsed.path.lstrip("/")


class Command(BaseCommand):
    help = "Validate APP_ENV and database mapping consistency to prevent demo/prod cross-wiring."

    def add_arguments(self, parser):
        parser.add_argument(
            "--warn-only",
            action="store_true",
            help="Print problems as warnings and continue without failing.",
        )

    def handle(self, *args, **options):
        warn_only = options.get("warn_only", False)

        app_env = _normalize_env(
            getattr(settings, "APP_ENV", None)
            or os.environ.get("APP_ENV")
            or os.environ.get("ENVIRONMENT")
        )

        selected_url = {
            "dev": os.environ.get("DEV_DATABASE_URL"),
            "demo": os.environ.get("DEMO_DATABASE_URL"),
            "prod": os.environ.get("PROD_DATABASE_URL"),
        }.get(app_env)
        fallback_url = os.environ.get("DATABASE_URL")
        effective_url = selected_url or fallback_url

        db_cfg = settings.DATABASES.get("default", {})
        db_name = str(db_cfg.get("NAME") or "").strip()
        db_host = str(db_cfg.get("HOST") or "").strip()
        if not db_name:
            db_name = _db_name_from_url(effective_url)

        lower_db_name = db_name.lower()
        lower_db_host = db_host.lower()

        issues = []
        warnings = []

        if app_env in {"demo", "prod"} and not (selected_url or fallback_url or db_name):
            issues.append("No database configuration detected for non-dev environment.")

        if app_env == "prod":
            if "demo" in lower_db_name or "staging" in lower_db_name:
                issues.append(
                    f"Production environment is pointing to a demo-like database name: '{db_name}'."
                )
            if "demo" in lower_db_host or "staging" in lower_db_host:
                issues.append(
                    f"Production environment is pointing to a demo-like database host: '{db_host}'."
                )
            demo_url = os.environ.get("DEMO_DATABASE_URL")
            if demo_url and effective_url and demo_url == effective_url:
                issues.append("Production environment is using DEMO_DATABASE_URL as effective DATABASE_URL.")
            if not os.environ.get("PROD_DATABASE_URL") and not os.environ.get("DATABASE_URL"):
                warnings.append("PROD_DATABASE_URL is not set; relying on DB_* fields only.")

        if app_env == "demo":
            if "prod" in lower_db_name or "production" in lower_db_name or "live" in lower_db_name:
                issues.append(
                    f"Demo environment is pointing to a prod-like database name: '{db_name}'."
                )
            if "prod" in lower_db_host or "production" in lower_db_host or "live" in lower_db_host:
                issues.append(
                    f"Demo environment is pointing to a prod-like database host: '{db_host}'."
                )
            prod_url = os.environ.get("PROD_DATABASE_URL")
            if prod_url and effective_url and prod_url == effective_url:
                issues.append("Demo environment is using PROD_DATABASE_URL as effective DATABASE_URL.")
            if not os.environ.get("DEMO_DATABASE_URL") and not os.environ.get("DATABASE_URL"):
                warnings.append("DEMO_DATABASE_URL is not set; relying on DB_* fields only.")

        self.stdout.write(self.style.SUCCESS("Environment/DB consistency check summary:"))
        self.stdout.write(f"  APP_ENV: {app_env}")
        self.stdout.write(f"  DB_NAME: {db_name or '[unknown]'}")
        self.stdout.write(f"  DB_HOST: {db_host or '[unknown]'}")

        for msg in warnings:
            self.stdout.write(self.style.WARNING(f"WARNING: {msg}"))

        if issues:
            for msg in issues:
                self.stdout.write(self.style.ERROR(f"ERROR: {msg}"))
            if warn_only:
                self.stdout.write(self.style.WARNING("warn-only mode enabled; continuing despite errors."))
                return
            raise CommandError("Environment/database consistency checks failed.")

        self.stdout.write(self.style.SUCCESS("Environment/database consistency checks passed."))
