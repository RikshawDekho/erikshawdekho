import dj_database_url
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv()

# ── Environment ────────────────────────────────────────────────────
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'production' if not DEBUG else 'development')

# ── Sentry (early init to capture startup errors) ─────────────────
_SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
if _SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        environment=ENVIRONMENT,
        traces_sample_rate=0.2,
        send_default_pii=False,
    )

# ── Core ───────────────────────────────────────────────────────────
_raw_secret = os.environ.get('SECRET_KEY', '')
if not _raw_secret:
    if not DEBUG:
        raise RuntimeError("SECRET_KEY environment variable is required in production")
    _raw_secret = 'django-insecure-dev-only-do-not-use-in-production'
SECRET_KEY = _raw_secret

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "erikshawdekho-production.up.railway.app",
    "erikshawdekho.com",
    "www.erikshawdekho.com",
    "api.erikshawdekho.com",
    *[h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()],
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'api',
]

# SecurityMiddleware must be first (after CorsMiddleware which needs to be very first)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'erickshaw.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [], 'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

WSGI_APPLICATION = 'erickshaw.wsgi.application'

# ── Database ───────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "erikshaw_db"),
            "USER": os.environ.get("DB_USER", "postgres"),
            "PASSWORD": os.environ.get("DB_PASSWORD", "postgres"),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "5432"),
        }
    }

# ── Password Validation ────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── JWT Configuration ──────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'AUTH_HEADER_TYPES':      ('Bearer',),
    'USER_ID_FIELD':          'id',
    'USER_ID_CLAIM':          'user_id',
}

# ── REST Framework ─────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',  # Django admin
    ],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_PAGINATION_CLASS':   'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/hour',
        'user': '2000/hour',
        'auth': '10/minute',
    },
}

# ── CSRF & CORS ────────────────────────────────────────────────────
CSRF_TRUSTED_ORIGINS = [
    "https://api.erikshawdekho.com",
    "https://erikshawdekho.com",
    "https://www.erikshawdekho.com",
    "https://erikshawdekho-production.up.railway.app",
]

CORS_ALLOW_CREDENTIALS = True
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    _cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
    if _cors_origins:
        CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
    else:
        CORS_ALLOWED_ORIGINS = [
            "https://www.erikshawdekho.com",
            "https://erikshawdekho.com",
            "https://erikshawdekho.vercel.app",
        ]

# ── Security Headers (production only) ────────────────────────────
if not DEBUG:
    # Force HTTPS
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # HSTS — tells browsers to always use HTTPS for 1 year
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Cookies only over HTTPS
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # Browser security headers
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

    # Session hardening
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_HTTPONLY = False  # Must be False so JS can read it (DRF CSRF)
    CSRF_COOKIE_SAMESITE = 'Lax'
else:
    # Allow HTTP in dev
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    X_FRAME_OPTIONS = 'SAMEORIGIN'

# ── Internationalisation ───────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'Asia/Kolkata'
USE_I18N = USE_TZ = True

# ── Static & Media Files ───────────────────────────────────────────
STATIC_URL    = '/static/'
STATIC_ROOT   = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL     = '/media/'
MEDIA_ROOT    = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Email ──────────────────────────────────────────────────────────
if DEBUG:
    # Print emails to console in development
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND   = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST      = os.environ.get('EMAIL_HOST', 'smtp.sendgrid.net')
    EMAIL_PORT      = int(os.environ.get('EMAIL_PORT', 587))
    EMAIL_USE_TLS   = True
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'apikey')
    EMAIL_HOST_PASSWORD = os.environ.get('SENDGRID_API_KEY', '')
DEFAULT_FROM_EMAIL  = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@erikshawdekho.com')
ADMIN_EMAIL         = os.environ.get('ADMIN_EMAIL', 'admin@erikshawdekho.com')

# ── Logging ────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose' if not DEBUG else 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO' if DEBUG else 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'api': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# ── Twilio (WhatsApp + SMS) ────────────────────────────────────────
TWILIO_ACCOUNT_SID    = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN     = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_FROM  = os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')
TWILIO_SMS_FROM       = os.environ.get('TWILIO_SMS_FROM', '')

# ── Firebase Cloud Messaging ───────────────────────────────────────
FIREBASE_CREDENTIALS_JSON = os.environ.get('FIREBASE_CREDENTIALS_JSON', '')

# ── Platform branding ─────────────────────────────────────────────
PLATFORM_NAME    = 'eRickshawDekho'
PLATFORM_URL     = os.environ.get('PLATFORM_URL', 'https://www.erikshawdekho.com')
SUPPORT_PHONE    = os.environ.get('SUPPORT_PHONE', '+91-XXXXXXXXXX')
SUPPORT_EMAIL    = os.environ.get('SUPPORT_EMAIL', 'support@erikshawdekho.com')
SUPPORT_WHATSAPP = os.environ.get('SUPPORT_WHATSAPP', 'https://wa.me/91XXXXXXXXXX')
