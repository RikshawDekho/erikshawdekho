import secrets
from django.contrib import admin
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    UserProfile, DealerProfile, Brand, Vehicle,
    Lead, Sale, Customer, Task, FinanceLoan,
    DealerApplication, DealerReview, PublicEnquiry,
    NotificationLog, Plan, DealerAPIKey, PlatformSettings,
    FinancerProfile, FinancerDocument, CustomerProfile,
    FinancerPlan, FinancerSubscription,
    FinancerDealerAssociation, FinancerRequiredDocument,
    FinanceApplication, FinanceApplicationDocument,
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'user_type', 'phone', 'city', 'created_at']
    list_filter   = ['user_type']
    search_fields = ['user__username', 'phone', 'city']


@admin.register(DealerProfile)
class DealerAdmin(admin.ModelAdmin):
    list_display  = ['dealer_name', 'user', 'city', 'state', 'phone', 'gstin', 'is_verified', 'created_at']
    list_filter   = ['is_verified', 'city', 'state']
    search_fields = ['dealer_name', 'user__username', 'gstin', 'phone']
    actions       = ['approve_dealers', 'revoke_dealers']

    @admin.action(description='Approve selected dealers')
    def approve_dealers(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} dealer(s) approved.')

    @admin.action(description='Revoke dealer verification')
    def revoke_dealers(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(request, f'{updated} dealer(s) revoked.')


@admin.register(DealerApplication)
class DealerApplicationAdmin(admin.ModelAdmin):
    list_display    = ['dealer_name', 'contact_name', 'phone', 'city', 'status', 'applied_at']
    list_filter     = ['status', 'city', 'state']
    search_fields   = ['dealer_name', 'contact_name', 'phone', 'email']
    readonly_fields = ['applied_at']
    actions         = ['approve_applications', 'reject_applications']

    @admin.action(description='Approve and create dealer accounts')
    def approve_applications(self, request, queryset):
        from datetime import timedelta
        from .emails import send_dealer_approval_email
        from .notifications import notify_dealer_welcome
        created = 0
        credentials = []
        now = timezone.now()
        plan_expires = now + timedelta(days=30)
        for app in queryset.filter(status='pending'):
            temp_pw = secrets.token_urlsafe(10)
            user = User.objects.create_user(
                username=app.phone,
                email=app.email,
                password=temp_pw,
                first_name=app.contact_name,
            )
            DealerProfile.objects.create(
                user=user,
                dealer_name=app.dealer_name,
                phone=app.phone,
                city=app.city,
                state=app.state,
                gstin=app.gstin,
                is_verified=True,
                plan_type='free',
                plan_started_at=now,
                plan_expires_at=plan_expires,
            )
            UserProfile.objects.create(user=user, user_type='dealer', phone=app.phone, city=app.city)
            app.status = 'approved'
            app.reviewed_at = now
            app.review_notes = f'Temp password: {temp_pw}'
            app.save()
            credentials.append(f'{app.dealer_name} → username: {app.phone}, password: {temp_pw}')
            created += 1
            # Send approval email + WhatsApp
            expires_str = plan_expires.strftime('%d %b %Y')
            if app.email:
                send_dealer_approval_email(
                    dealer_name=app.dealer_name, email=app.email,
                    username=app.phone, temp_password=temp_pw,
                    plan_expires=expires_str,
                )
            if app.phone:
                notify_dealer_welcome(app.dealer_name, app.phone, app.phone)
        msg = f'{created} account(s) created. Credentials: ' + ' | '.join(credentials)
        self.message_user(request, msg)

    @admin.action(description='Reject selected applications')
    def reject_applications(self, request, queryset):
        from .emails import send_dealer_rejection_email
        now = timezone.now()
        updated = 0
        for app in queryset.filter(status='pending'):
            app.status = 'rejected'
            app.reviewed_at = now
            app.save()
            if app.email:
                send_dealer_rejection_email(app.dealer_name, app.email)
            updated += 1
        self.message_user(request, f'{updated} application(s) rejected.')


@admin.register(DealerReview)
class DealerReviewAdmin(admin.ModelAdmin):
    list_display  = ['dealer', 'reviewer_name', 'rating', 'created_at']
    list_filter   = ['rating']
    search_fields = ['dealer__dealer_name', 'reviewer_name']


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display  = ['name', 'website']
    search_fields = ['name']


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display  = ['model_name', 'brand', 'dealer', 'fuel_type', 'price', 'stock_quantity', 'stock_status', 'is_featured']
    list_filter   = ['fuel_type', 'stock_status', 'brand', 'vehicle_type']
    search_fields = ['model_name', 'brand__name', 'dealer__dealer_name']
    actions       = ['mark_featured', 'unmark_featured']

    @admin.action(description='Mark as featured')
    def mark_featured(self, request, queryset):
        queryset.update(is_featured=True)

    @admin.action(description='Remove featured status')
    def unmark_featured(self, request, queryset):
        queryset.update(is_featured=False)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display  = ['customer_name', 'phone', 'vehicle', 'source', 'status', 'created_at']
    list_filter   = ['status', 'source']
    search_fields = ['customer_name', 'phone']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display    = ['invoice_number', 'customer_name', 'vehicle', 'sale_price', 'quantity', 'sale_date']
    search_fields   = ['invoice_number', 'customer_name']
    readonly_fields = ['invoice_number', 'sale_date']


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display  = ['name', 'phone', 'city', 'total_purchases', 'total_spent']
    search_fields = ['name', 'phone']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'dealer', 'due_date', 'priority', 'is_completed']
    list_filter  = ['priority', 'is_completed']


@admin.register(FinanceLoan)
class LoanAdmin(admin.ModelAdmin):
    list_display  = ['customer_name', 'loan_amount', 'tenure_months', 'interest_rate', 'status', 'bank_name']
    list_filter   = ['status']
    search_fields = ['customer_name', 'bank_name']


@admin.register(PublicEnquiry)
class PublicEnquiryAdmin(admin.ModelAdmin):
    list_display    = ['customer_name', 'phone', 'city', 'dealer', 'vehicle', 'is_processed', 'created_at']
    list_filter     = ['is_processed', 'city']
    search_fields   = ['customer_name', 'phone', 'city']
    readonly_fields = ['created_at']
    actions         = ['mark_processed']

    @admin.action(description='Mark selected enquiries as processed')
    def mark_processed(self, request, queryset):
        updated = queryset.update(is_processed=True)
        self.message_user(request, f'{updated} enquiry(ies) marked as processed.')


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display    = ['notif_type', 'channel', 'recipient', 'dealer', 'success', 'sent_at']
    list_filter     = ['channel', 'notif_type', 'success']
    search_fields   = ['recipient', 'subject', 'dealer__dealer_name']
    readonly_fields = ['dealer', 'channel', 'notif_type', 'recipient', 'subject',
                       'success', 'error_msg', 'sent_at']


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug', 'price', 'listing_limit', 'max_dealers', 'signups_count', 'is_active']
    list_editable = ['is_active']
    readonly_fields = ['signups_count', 'is_available']


@admin.register(DealerAPIKey)
class DealerAPIKeyAdmin(admin.ModelAdmin):
    list_display  = ['dealer', 'service', 'display_name', 'is_active', 'created_at']
    list_filter   = ['service', 'is_active']
    search_fields = ['dealer__dealer_name', 'display_name']


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ['support_name', 'support_email', 'support_phone', 'support_whatsapp', 'updated_at']


# ─── Financer Ecosystem ───────────────────────────────────────────

@admin.register(FinancerProfile)
class FinancerProfileAdmin(admin.ModelAdmin):
    list_display  = ['company_name', 'user', 'phone', 'city', 'is_verified', 'created_at']
    list_filter   = ['is_verified', 'city']
    search_fields = ['company_name', 'user__username', 'phone']
    list_editable = ['is_verified']
    actions       = ['verify_financers']

    @admin.action(description='Verify selected financers')
    def verify_financers(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} financer(s) verified.')


@admin.register(FinancerDocument)
class FinancerDocumentAdmin(admin.ModelAdmin):
    list_display  = ['financer', 'doc_type', 'status', 'uploaded_at']
    list_filter   = ['status', 'doc_type']
    list_editable = ['status']


@admin.register(FinancerPlan)
class FinancerPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'price_per_year', 'max_dealer_associations',
                    'max_finance_applications', 'success_commission_pct', 'is_active']
    list_editable = ['is_active']


@admin.register(FinancerSubscription)
class FinancerSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['financer', 'plan', 'applications_used', 'is_active', 'expires_at', 'started_at']
    list_filter  = ['is_active', 'plan']
    search_fields = ['financer__company_name']


@admin.register(FinancerDealerAssociation)
class FinancerDealerAssociationAdmin(admin.ModelAdmin):
    list_display  = ['dealer', 'financer', 'status', 'applied_at', 'reviewed_at']
    list_filter   = ['status']
    list_editable = ['status']
    search_fields = ['dealer__dealer_name', 'financer__company_name']


@admin.register(FinancerRequiredDocument)
class FinancerRequiredDocumentAdmin(admin.ModelAdmin):
    list_display = ['financer', 'doc_type', 'is_mandatory', 'description']
    list_filter  = ['doc_type', 'is_mandatory']


@admin.register(FinanceApplication)
class FinanceApplicationAdmin(admin.ModelAdmin):
    list_display  = ['id', 'customer_name', 'dealer', 'financer', 'loan_amount', 'status', 'created_at']
    list_filter   = ['status']
    search_fields = ['customer_name', 'customer_phone', 'dealer__dealer_name', 'financer__company_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FinanceApplicationDocument)
class FinanceApplicationDocumentAdmin(admin.ModelAdmin):
    list_display = ['application', 'doc_type', 'notes', 'uploaded_at']


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display  = ['full_name', 'user', 'phone', 'city', 'created_at']
    search_fields = ['full_name', 'phone', 'user__username']

