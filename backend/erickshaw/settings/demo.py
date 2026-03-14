import os
import dj_database_url
from .base import *  # noqa: F401, F403

# ── Environment identity ───────────────────────────────────────────
APP_ENV     = 'demo'
ENVIRONMENT = 'demo'
IS_DEMO_ENV = True
DEBUG       = False

# ── Secret Key: required ───────────────────────────────────────────
_raw_secret = os.environ.get('SECRET_KEY', '')
if not _raw_secret:
    raise RuntimeError("SECRET_KEY environment variable is required in demo environment")
SECRET_KEY = _raw_secret

# ── Hosts ─────────────────────────────────────────────────────────
ALLOWED_HOSTS = ['*']  # Demo env — open to all hosts, not a security concern

# ── Database: DEMO_DATABASE_URL or DATABASE_URL ───────────────────
_db_url = os.environ.get('DEMO_DATABASE_URL') or os.environ.get('DATABASE_URL')
if not _db_url:
    raise RuntimeError("DEMO_DATABASE_URL or DATABASE_URL must be set in demo environment")
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
    'https://demo.erikshawdekho.com',
]

# ── CSRF ───────────────────────────────────────────────────────────
CSRF_TRUSTED_ORIGINS = [
    'https://demo.erikshawdekho.com',
    'https://demo-api.erikshawdekho.com',
    *[h.strip() for h in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if h.strip()],
]

# ── Security headers (moderate — not pre-loaded) ───────────────────
SECURE_SSL_REDIRECT            = False  # Railway terminates HTTPS at LB; internal traffic is plain HTTP
SECURE_PROXY_SSL_HEADER        = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS            = 3600   # 1 hour — safe for demo resets
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SESSION_COOKIE_SECURE          = True
CSRF_COOKIE_SECURE             = True
SECURE_CONTENT_TYPE_NOSNIFF    = True
X_FRAME_OPTIONS                = 'DENY'
SESSION_COOKIE_HTTPONLY        = True
SESSION_COOKIE_SAMESITE        = 'Lax'
CSRF_COOKIE_HTTPONLY           = False  # Must be readable by JS (DRF)
CSRF_COOKIE_SAMESITE           = 'Lax'

# ── Sentry ─────────────────────────────────────────────────────────
_SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
if _SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        environment='demo',
        traces_sample_rate=0.1,
        send_default_pii=False,
    )

# ── Platform URL override for demo ────────────────────────────────
PLATFORM_URL = os.environ.get('PLATFORM_URL', 'https://demo.erikshawdekho.com')
