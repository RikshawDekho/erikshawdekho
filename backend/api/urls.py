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
    path('public/enquiry/',         views.public_enquiry,    name='public-enquiry'),

    # ── Public dealer directory ───────────────────────────────────
    path('dealers/',                          views.dealer_list,           name='dealer-list'),
    path('dealers/<int:dealer_id>/',          views.dealer_detail,         name='dealer-detail'),
    path('dealers/<int:dealer_id>/reviews/',  views.submit_dealer_review,  name='dealer-reviews'),
    path('dealers/apply/',                    views.apply_dealer,          name='dealer-apply'),

    # ── Dealer enquiries (authenticated, see assigned public enquiries) ───
    path('dealer/enquiries/',          views.dealer_enquiries,          name='dealer-enquiries'),
    path('dealer/enquiries/unread/',   views.dealer_unread_count,       name='dealer-unread-count'),

    # ── Notifications ─────────────────────────────────────────────
    path('notifications/preferences/', views.notification_preferences, name='notification-preferences'),
    path('notifications/fcm-token/',   views.update_fcm_token,         name='update-fcm-token'),

    # ── Admin portal ───────────────────────────────────────────────
    path('admin-portal/stats/',                    views.admin_stats,         name='admin-stats'),
    path('admin-portal/users/',                    views.admin_users,         name='admin-users'),
    path('admin-portal/users/<int:user_id>/',      views.admin_users,         name='admin-user-delete'),
    path('admin-portal/dealers/',                  views.admin_dealers,       name='admin-dealers'),
    path('admin-portal/dealers/<int:dealer_id>/',  views.admin_dealers,       name='admin-dealer-detail'),
    path('admin-portal/applications/',             views.admin_applications,  name='admin-applications'),
    path('admin-portal/applications/<int:app_id>/',views.admin_applications,  name='admin-application-detail'),
    path('admin-portal/enquiries/',                views.admin_enquiries,     name='admin-enquiries'),
]
