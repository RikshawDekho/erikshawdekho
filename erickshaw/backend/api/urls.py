from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'vehicles', views.VehicleViewSet, basename='vehicle')
router.register(r'leads', views.LeadViewSet, basename='lead')
router.register(r'sales', views.SaleViewSet, basename='sale')
router.register(r'customers', views.CustomerViewSet, basename='customer')
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'finance/loans', views.FinanceLoanViewSet, basename='loan')
router.register(r'brands', views.BrandViewSet, basename='brand')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/me/', views.me, name='me'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('marketplace/', views.marketplace_vehicles, name='marketplace'),
    path('finance/emi-calculator/', views.emi_calculator, name='emi-calculator'),
    path('reports/', views.reports, name='reports'),
]
