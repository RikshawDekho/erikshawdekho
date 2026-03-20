import os
import dj_database_url
from .base import *  # noqa: F401, F403

# ── Environment identity ───────────────────────────────────────────
APP_ENV     = 'dev'
ENVIRONMENT = 'development'
IS_DEMO_ENV = False

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

# ── Secret Key: insecure fallback allowed in dev ───────────────────
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-only-do-not-use-in-production')

# ── Hosts: all local variants ─────────────────────────────────────
ALLOWED_HOSTS = [
    'localhost', '127.0.0.1', '0.0.0.0',
    *[h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()],
]

# ── Database: env URL, then individual vars, then local defaults ───
_db_url = os.environ.get('DEV_DATABASE_URL') or os.environ.get('DATABASE_URL')
if _db_url:
    DATABASES = {'default': dj_database_url.parse(_db_url, conn_max_age=600)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME':     os.environ.get('DB_NAME',     'erikshaw_db'),
            'USER':     os.environ.get('DB_USER',     'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
            'HOST':     os.environ.get('DB_HOST',     'localhost'),
            'PORT':     os.environ.get('DB_PORT',     '5432'),
        }
    }

# ── Email: console backend (no SMTP needed in dev) ─────────────────
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ── CORS: allow everything in dev ─────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True

# ── CSRF ───────────────────────────────────────────────────────────
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000', 'http://localhost:8000',
    'http://127.0.0.1:3000', 'http://127.0.0.1:8000',
]

# ── Security: no HTTPS enforcement in dev ─────────────────────────
SECURE_SSL_REDIRECT    = False
SESSION_COOKIE_SECURE  = False
CSRF_COOKIE_SECURE     = False
X_FRAME_OPTIONS        = 'SAMEORIGIN'

# ── Logging: more verbose for dev ─────────────────────────────────
LOGGING['loggers']['django']['level'] = 'INFO'   # noqa: F405
LOGGING['loggers']['api']['level']    = 'DEBUG'  # noqa: F405
LOGGING['handlers']['console']['formatter'] = 'simple'  # noqa: F405
