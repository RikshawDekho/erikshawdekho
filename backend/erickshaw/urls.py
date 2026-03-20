from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, JsonResponse


def home(request):
    return HttpResponse("eRickshawDekho Backend Running")


def health(request):
    return JsonResponse({'status': 'ok'})


def health_plain(request):
    """Middleware-bypassing health check for Railway. No auth, no CSRF, no SSL checks."""
    from django.http import HttpResponse
    return HttpResponse('ok', content_type='text/plain', status=200)


urlpatterns = [
    path('', home),
    path('health/', health_plain),
    path('api/health/', health),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)