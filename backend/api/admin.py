from django.contrib import admin
from .models import DealerProfile, Brand, Vehicle, Lead, Sale, Customer, Task, FinanceLoan

@admin.register(DealerProfile)
class DealerAdmin(admin.ModelAdmin):
    list_display = ['dealer_name', 'user', 'city', 'phone', 'is_verified']

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name']

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['model_name', 'brand', 'dealer', 'fuel_type', 'price', 'stock_status']
    list_filter = ['fuel_type', 'stock_status', 'brand']

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['customer_name', 'phone', 'vehicle', 'source', 'status', 'created_at']
    list_filter = ['status', 'source']

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer_name', 'vehicle', 'sale_price', 'sale_date']

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'city', 'total_purchases']

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'dealer', 'due_date', 'priority', 'is_completed']

@admin.register(FinanceLoan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ['customer_name', 'loan_amount', 'status', 'bank_name']
