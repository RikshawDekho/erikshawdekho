from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'vehicles',      views.VehicleViewSet,     basename='vehicle')
router.register(r'leads',         views.LeadViewSet,        basename='lead')
router.register(r'sales',         views.SaleViewSet,        basename='sale')
router.register(r'customers',     views.CustomerViewSet,    basename='customer')
router.register(r'tasks',         views.TaskViewSet,        basename='task')
router.register(r'finance/loans', views.FinanceLoanViewSet, basename='loan')
router.register(r'brands',        views.BrandViewSet,       basename='brand')

urlpatterns = [
    path('', include(router.urls)),

    # ── Auth ──────────────────────────────────────────────────────
    path('auth/register/',          views.register,          name='register'),
    path('auth/register/driver/',   views.register_driver,   name='register-driver'),
    path('auth/login/',             views.login_view,        name='login'),
    path('auth/me/',                views.me,                name='me'),
    path('auth/token/refresh/',     TokenRefreshView.as_view(), name='token-refresh'),

    # ── Dealer SaaS dashboard ─────────────────────────────────────
    path('dashboard/',              views.dashboard,         name='dashboard'),
    path('finance/emi-calculator/', views.emi_calculator,   name='emi-calculator'),
    path('reports/',                views.reports,           name='reports'),

    # ── Public marketplace ────────────────────────────────────────
    path('marketplace/',            views.marketplace_vehicles, name='marketplace'),
    path('stats/',                  views.platform_stats,    name='platform-stats'),

    # ── Public dealer directory ───────────────────────────────────
    path('dealers/',                          views.dealer_list,           name='dealer-list'),
    path('dealers/<int:dealer_id>/',          views.dealer_detail,         name='dealer-detail'),
    path('dealers/<int:dealer_id>/reviews/',  views.submit_dealer_review,  name='dealer-reviews'),
    path('dealers/apply/',                    views.apply_dealer,          name='dealer-apply'),
]
