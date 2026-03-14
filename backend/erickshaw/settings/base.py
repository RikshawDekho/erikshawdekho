import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# backend/ — three levels up from backend/erickshaw/settings/base.py
BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR / ".env")
load_dotenv()

# ── Security ───────────────────────────────────────────────────────
# Each env file must set SECRET_KEY; here we provide a dev-only fallback.
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-only-do-not-use-in-production')

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

# CorsMiddleware must be first; SecurityMiddleware must be second
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

# ── Password Validation ────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── JWT ────────────────────────────────────────────────────────────
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
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_PAGINATION_CLASS':   'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/hour',
        'user': '10000/hour',
        'auth': '20/minute',
    },
}

# ── CORS base ──────────────────────────────────────────────────────
CORS_ALLOW_CREDENTIALS = True

# ── Internationalisation ───────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'Asia/Kolkata'
USE_I18N = USE_TZ = True

# ── Static & Media ─────────────────────────────────────────────────
STATIC_URL    = '/static/'
STATIC_ROOT   = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL     = '/media/'
MEDIA_ROOT    = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Email base ─────────────────────────────────────────────────────
DEFAULT_FROM_EMAIL     = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@erikshawdekho.com')
ADMIN_EMAIL            = os.environ.get('ADMIN_EMAIL', 'admin@erikshawdekho.com')

# ── Twilio (WhatsApp + SMS) ────────────────────────────────────────
TWILIO_ACCOUNT_SID    = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN     = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_FROM  = os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')
TWILIO_SMS_FROM       = os.environ.get('TWILIO_SMS_FROM', '')

# ── Firebase Cloud Messaging ───────────────────────────────────────
FIREBASE_CREDENTIALS_JSON = os.environ.get('FIREBASE_CREDENTIALS_JSON', '')

# ── Platform branding ──────────────────────────────────────────────
PLATFORM_NAME          = os.environ.get('PLATFORM_NAME', 'eRickshawDekho')
PLATFORM_TAGLINE       = os.environ.get('PLATFORM_TAGLINE', 'Bharosemand Platform')
PLATFORM_URL           = os.environ.get('PLATFORM_URL', 'https://www.erikshawdekho.com')
SUPPORT_PHONE          = os.environ.get('SUPPORT_PHONE', '+91-XXXXXXXXXX')
SUPPORT_EMAIL          = os.environ.get('SUPPORT_EMAIL', 'support@erikshawdekho.com')
SUPPORT_WHATSAPP       = os.environ.get('SUPPORT_WHATSAPP', 'https://wa.me/91XXXXXXXXXX')
PLATFORM_TEAM_NAME     = os.environ.get('PLATFORM_TEAM_NAME', f'{PLATFORM_NAME} Team')
PLATFORM_NOREPLY_EMAIL = os.environ.get('PLATFORM_NOREPLY_EMAIL', DEFAULT_FROM_EMAIL)

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
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'api': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
