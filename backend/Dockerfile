FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default to production settings; override per environment via Railway env var:
# DJANGO_SETTINGS_MODULE=erickshaw.settings.demo   (demo environment)
# DJANGO_SETTINGS_MODULE=erickshaw.settings.staging (staging environment)
ARG DJANGO_SETTINGS_MODULE=erickshaw.settings.production
ENV DJANGO_SETTINGS_MODULE=$DJANGO_SETTINGS_MODULE

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "python manage.py check_env_db_consistency && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py ensure_plans && python manage.py ensure_admin && python manage.py ensure_protected_users && python manage.py check_auth_integrity --warn-only && python manage.py seed_demo && gunicorn erickshaw.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120"]
