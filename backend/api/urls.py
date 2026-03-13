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
router.register(r'videos',        views.VideoResourceViewSet, basename='video-resource')
router.register(r'blogs',         views.BlogPostViewSet,      basename='blog-post')

urlpatterns = [
    path('', include(router.urls)),

    # ── Auth ──────────────────────────────────────────────────────
    path('auth/register/',          views.register,          name='register'),
    path('auth/register/driver/',   views.register_driver,   name='register-driver'),
    path('auth/login/',             views.login_view,        name='login'),
    path('auth/me/',                views.me,                name='me'),
    path('auth/forgot-password/',              views.forgot_password,              name='forgot-password'),
    path('auth/reset-password/',               views.reset_password_confirm,       name='reset-password'),
    path('admin-portal/dealers/<int:dealer_id>/reset-password/', views.admin_reset_dealer_password, name='admin-reset-dealer-password'),
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
    path('plans/',                     views.plans_list,                name='plans-list'),
    path('dealer/upgrade-plan/',       views.upgrade_plan,              name='upgrade-plan'),

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

    # ── Dealer API keys ────────────────────────────────────────────
    path('dealer/api-keys/',                       views.dealer_api_keys,          name='dealer-api-keys'),
    path('dealer/api-keys/<int:key_id>/',          views.dealer_api_key_delete,    name='dealer-api-key-delete'),

    # ── Platform settings ──────────────────────────────────────────
    path('platform/settings/',                     views.platform_settings,        name='platform-settings'),

    # ── Marketing campaigns ─────────────────────────────────────────
    path('marketing/send/',                        views.marketing_send,           name='marketing-send'),

    # ── Admin extended ─────────────────────────────────────────────
    path('admin-portal/settings/',                              views.admin_update_settings,    name='admin-update-settings'),
    path('admin-portal/users/<int:user_id>/toggle-active/',     views.admin_toggle_user_active, name='admin-toggle-user-active'),
    path('admin-portal/create-user/',                           views.admin_create_user,        name='admin-create-user'),

    # ── Financer ecosystem ─────────────────────────────────────────
    path('auth/register/financer/',     views.register_financer,      name='register-financer'),
    path('auth/register/customer/',     views.register_customer,      name='register-customer'),
    path('financer/profile/',           views.financer_profile,       name='financer-profile'),
    path('financer/documents/',         views.financer_documents,     name='financer-documents'),
    path('public/financers/',           views.public_financers,       name='public-financers'),

    # ── Public vehicle detail & comparison ─────────────────────────
    path('public/vehicles/<int:vehicle_id>/', views.vehicle_detail_public, name='vehicle-detail-public'),
    path('public/vehicles/compare/',    views.vehicles_compare,       name='vehicles-compare'),
    path('public/dealers-by-brand/',    views.dealers_by_brand,       name='dealers-by-brand'),

    # ── Free tier usage ────────────────────────────────────────────
    path('dealer/free-tier-usage/',     views.free_tier_usage,        name='free-tier-usage'),
]
