import os
import dj_database_url
from .base import *  # noqa: F401, F403

# ── Environment identity ───────────────────────────────────────────
APP_ENV     = 'staging'
ENVIRONMENT = 'staging'
IS_DEMO_ENV = False
DEBUG       = False

# ── Secret Key: required ───────────────────────────────────────────
_raw_secret = os.environ.get('SECRET_KEY', '')
if not _raw_secret:
    raise RuntimeError("SECRET_KEY environment variable is required in staging environment")
SECRET_KEY = _raw_secret

# ── Hosts ─────────────────────────────────────────────────────────
ALLOWED_HOSTS = [
    'staging.erikshawdekho.com',
    'staging-api.erikshawdekho.com',
    'healthcheck.railway.app',   # Railway internal healthcheck host
    '.up.railway.app',           # Railway preview domains
    'localhost', '127.0.0.1',
    *[h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()],
]

# ── Database: STAGING_DATABASE_URL or DATABASE_URL ────────────────
# Staging uses its OWN Railway PostgreSQL — never shares with demo or prod.
_db_url = os.environ.get('STAGING_DATABASE_URL') or os.environ.get('DATABASE_URL')
if not _db_url:
    raise RuntimeError("STAGING_DATABASE_URL or DATABASE_URL must be set in staging environment")
DATABASES = {'default': dj_database_url.parse(_db_url, conn_max_age=600)}

# ── Email: SMTP ────────────────────────────────────────────────────
EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT          = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '') or os.environ.get('SENDGRID_API_KEY', '')

# ── CORS ───────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False
_cors = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors.split(',') if o.strip()] or [
    'https://staging.erikshawdekho.com',
]

# ── CSRF ───────────────────────────────────────────────────────────
CSRF_TRUSTED_ORIGINS = [
    'https://staging.erikshawdekho.com',
    'https://staging-api.erikshawdekho.com',
    *[h.strip() for h in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if h.strip()],
]

# ── Security headers (moderate — HSTS not pre-loaded) ─────────────
SECURE_SSL_REDIRECT            = False  # Railway terminates HTTPS at LB; internal traffic is plain HTTP
SECURE_PROXY_SSL_HEADER        = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS            = 3600   # 1 hour — easy to disable if needed
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SESSION_COOKIE_SECURE          = True
CSRF_COOKIE_SECURE             = True
SECURE_CONTENT_TYPE_NOSNIFF    = True
X_FRAME_OPTIONS                = 'DENY'
SESSION_COOKIE_HTTPONLY        = True
SESSION_COOKIE_SAMESITE        = 'Lax'
CSRF_COOKIE_HTTPONLY           = False
CSRF_COOKIE_SAMESITE           = 'Lax'

# ── Sentry: enabled for staging to catch issues before prod ───────
_SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
if _SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        environment='staging',
        traces_sample_rate=0.5,
        send_default_pii=False,
    )
