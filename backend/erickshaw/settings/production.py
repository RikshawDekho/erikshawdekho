import os
import dj_database_url
from .base import *  # noqa: F401, F403

# ── Environment identity ───────────────────────────────────────────
APP_ENV     = 'prod'
ENVIRONMENT = 'production'
IS_DEMO_ENV = False
DEBUG       = False

# ── Secret Key: required — no fallback ────────────────────────────
_raw_secret = os.environ.get('SECRET_KEY', '')
if not _raw_secret:
    raise RuntimeError("SECRET_KEY environment variable is required in production")
SECRET_KEY = _raw_secret

# ── Hosts ─────────────────────────────────────────────────────────
ALLOWED_HOSTS = [
    'erikshawdekho.com',
    'www.erikshawdekho.com',
    'api.erikshawdekho.com',
    'healthcheck.railway.app',   # Railway internal healthcheck host
    '.up.railway.app',           # Railway preview domains
    *[h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()],
]

# ── Database: PROD_DATABASE_URL or DATABASE_URL ───────────────────
_db_url = os.environ.get('PROD_DATABASE_URL') or os.environ.get('DATABASE_URL')
if not _db_url:
    raise RuntimeError("PROD_DATABASE_URL or DATABASE_URL must be set in production")
DATABASES = {'default': dj_database_url.parse(_db_url, conn_max_age=0)}

# ── Email: SMTP ────────────────────────────────────────────────────
EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT          = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '') or os.environ.get('SENDGRID_API_KEY', '')
EMAIL_TIMEOUT       = 10  # Fail fast — don't block registration/login for 60+ seconds on SMTP timeout

# ── CORS ───────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False
_cors = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors.split(',') if o.strip()] or [
    'https://www.erikshawdekho.com',
    'https://erikshawdekho.com',
    'https://erikshawdekho.vercel.app',
]

# ── CSRF ───────────────────────────────────────────────────────────
CSRF_TRUSTED_ORIGINS = [
    'https://api.erikshawdekho.com',
    'https://erikshawdekho.com',
    'https://www.erikshawdekho.com',
    'https://erikshawdekho-production.up.railway.app',
    *[h.strip() for h in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if h.strip()],
]

# ── Security headers ───────────────────────────────────────────────
# Railway terminates HTTPS at its load balancer and forwards plain HTTP
# to the container. SECURE_SSL_REDIRECT must be False or Django redirects
# every request to HTTPS → infinite loop → 502. Railway handles SSL.
SECURE_SSL_REDIRECT            = False
SECURE_PROXY_SSL_HEADER        = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS            = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD            = True
SESSION_COOKIE_SECURE          = True
CSRF_COOKIE_SECURE             = True
SECURE_CONTENT_TYPE_NOSNIFF    = True
SECURE_BROWSER_XSS_FILTER      = True
X_FRAME_OPTIONS                = 'DENY'
SESSION_COOKIE_HTTPONLY        = True
SESSION_COOKIE_SAMESITE        = 'Lax'
CSRF_COOKIE_HTTPONLY           = False  # Must be readable by JS (DRF)
CSRF_COOKIE_SAMESITE           = 'Lax'

# ── Cloudinary (media file storage) ───────────────────────────────
_cloudinary_url = os.environ.get('CLOUDINARY_URL', '')
if _cloudinary_url:
    import cloudinary
    cloudinary.config(
        cloudinary_url=_cloudinary_url,
        secure=True,
    )
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    CLOUDINARY_STORAGE = {
        'CLOUDINARY_URL': _cloudinary_url,
        # Auto-compress every upload: quality auto (~50-100 KB for thumbnails),
        # serve WebP/AVIF where supported, cap width at 800px.
        'TRANSFORMATION': [
            {
                'quality': 'auto:good',
                'fetch_format': 'auto',
                'width': 800,
                'crop': 'limit',
            }
        ],
        'STATIC_TRANSFORMATION': None,   # don't touch static files
        'UNSIGNED_PRESET': None,
    }

# ── Sentry ─────────────────────────────────────────────────────────
_SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
if _SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        environment='production',
        traces_sample_rate=0.2,
        send_default_pii=False,
    )
