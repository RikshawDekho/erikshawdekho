from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


# ─── USER PROFILE (role + FCM token for all user types) ───────────

class UserProfile(models.Model):
    USER_TYPES = [
        ('driver', 'Driver / Buyer'),
        ('dealer', 'Dealer / Showroom'),
        ('admin',  'Platform Admin'),
    ]
    user      = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='dealer')
    phone     = models.CharField(max_length=15, blank=True)
    city      = models.CharField(max_length=100, blank=True)
    fcm_token = models.TextField(blank=True, help_text='Firebase Cloud Messaging device token')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.user_type})"


class DealerProfile(models.Model):
    PLAN_FREE  = 'free'
    PLAN_PRO   = 'pro'
    PLAN_CHOICES = [('free', 'Free Trial'), ('pro', 'Pro')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='dealer_profile')
    dealer_name = models.CharField(max_length=200)
    gstin = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=15)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, default='Delhi')
    state = models.CharField(max_length=100, default='Delhi')
    pincode = models.CharField(max_length=10, blank=True)
    logo = models.ImageField(upload_to='dealers/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    # ── Subscription ──────────────────────────────────────
    plan_type       = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    plan_started_at = models.DateTimeField(null=True, blank=True)
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    # ── Notification Preferences ──────────────────────────
    notify_email    = models.BooleanField(default=True,  help_text='Receive email notifications')
    notify_whatsapp = models.BooleanField(default=True,  help_text='Receive WhatsApp notifications')
    notify_push     = models.BooleanField(default=True,  help_text='Receive push notifications')

    @property
    def plan_is_active(self):
        from django.utils import timezone
        if self.plan_expires_at is None:
            return False
        return self.plan_expires_at > timezone.now()

    @property
    def plan_days_remaining(self):
        from django.utils import timezone
        if not self.plan_expires_at:
            return 0
        delta = self.plan_expires_at - timezone.now()
        return max(0, delta.days)

    def __str__(self):
        return self.dealer_name


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    logo = models.ImageField(upload_to='brands/', null=True, blank=True)
    website = models.URLField(blank=True)

    def __str__(self):
        return self.name


class Vehicle(models.Model):
    FUEL_CHOICES = [
        ('electric', 'Electric'),
        ('petrol', 'Petrol'),
        ('cng', 'CNG'),
        ('lpg', 'LPG'),
        ('diesel', 'Diesel'),
    ]
    TYPE_CHOICES = [
        ('passenger', 'Passenger Rickshaw'),
        ('cargo', 'Cargo Loader'),
        ('auto', 'Auto Rickshaw'),
    ]
    STOCK_STATUS = [
        ('in_stock', 'In Stock'),
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
    ]

    dealer = models.ForeignKey(DealerProfile, on_delete=models.CASCADE, related_name='vehicles')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True)
    model_name = models.CharField(max_length=200)
    vehicle_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='passenger')
    fuel_type = models.CharField(max_length=20, choices=FUEL_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    stock_status = models.CharField(max_length=20, choices=STOCK_STATUS, default='in_stock')
    year = models.IntegerField(default=2024)
    is_used = models.BooleanField(default=False)
    thumbnail = models.ImageField(upload_to='vehicles/', null=True, blank=True)
    # Specs
    range_km = models.IntegerField(null=True, blank=True, help_text='Range in KM (for electric)')
    battery_capacity = models.CharField(max_length=50, blank=True)
    max_speed = models.IntegerField(null=True, blank=True)
    payload_kg = models.IntegerField(null=True, blank=True)
    seating_capacity = models.IntegerField(default=3)
    warranty_years = models.IntegerField(default=1)
    hsn_code = models.CharField(max_length=20, default='8703')
    description = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.brand} {self.model_name}"

    def save(self, *args, **kwargs):
        if self.stock_quantity == 0:
            self.stock_status = 'out_of_stock'
        elif self.stock_quantity <= 3:
            self.stock_status = 'low_stock'
        else:
            self.stock_status = 'in_stock'
        super().save(*args, **kwargs)


class Lead(models.Model):
    SOURCE_CHOICES = [
        ('walk_in', 'Walk-in'),
        ('phone', 'Phone Inquiry'),
        ('website', 'Website Lead'),
        ('referral', 'Referral'),
        ('social', 'Social Media'),
    ]
    STATUS_CHOICES = [
        ('new', 'New'),
        ('interested', 'Interested'),
        ('follow_up', 'Follow Up'),
        ('converted', 'Converted'),
        ('lost', 'Lost'),
    ]

    dealer = models.ForeignKey(DealerProfile, on_delete=models.CASCADE, related_name='leads')
    customer_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='website')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    notes = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.customer_name} - {self.vehicle}"


class Sale(models.Model):
    PAYMENT_CHOICES = [
        ('cash', 'Cash'),
        ('loan', 'Loan / Finance'),
        ('upi', 'UPI'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
    ]

    dealer = models.ForeignKey(DealerProfile, on_delete=models.CASCADE, related_name='sales')
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    customer_name = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=15)
    customer_email = models.EmailField(blank=True)
    customer_address = models.TextField(blank=True)
    customer_gstin = models.CharField(max_length=20, blank=True)
    invoice_number = models.CharField(max_length=50, unique=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=1)
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=9.0)
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=9.0)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='cash')
    delivery_date = models.DateField(null=True, blank=True)
    is_delivered = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    sale_date = models.DateTimeField(auto_now_add=True)

    @property
    def subtotal(self):
        return self.sale_price * self.quantity

    @property
    def cgst_amount(self):
        return self.subtotal * self.cgst_rate / 100

    @property
    def sgst_amount(self):
        return self.subtotal * self.sgst_rate / 100

    @property
    def total_amount(self):
        return self.subtotal + self.cgst_amount + self.sgst_amount

    def __str__(self):
        return f"INV-{self.invoice_number} | {self.customer_name}"


class Customer(models.Model):
    dealer = models.ForeignKey(DealerProfile, on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    gstin = models.CharField(max_length=20, blank=True)
    total_purchases = models.IntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Task(models.Model):
    PRIORITY_CHOICES = [('low','Low'),('medium','Medium'),('high','High')]
    dealer = models.ForeignKey(DealerProfile, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=300)
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class FinanceLoan(models.Model):
    STATUS_CHOICES = [('pending','Pending'),('approved','Approved'),('rejected','Rejected'),('disbursed','Disbursed')]
    dealer = models.ForeignKey(DealerProfile, on_delete=models.CASCADE, related_name='loans')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True)
    customer_name = models.CharField(max_length=200)
    loan_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tenure_months = models.IntegerField(default=36)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.0)
    emi_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    bank_name = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.customer_name} - ₹{self.loan_amount}"


# ─── DEALER APPLICATION ────────────────────────────────────────────

class DealerApplication(models.Model):
    STATUS_CHOICES = [
        ('pending',  'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    dealer_name  = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200)
    phone        = models.CharField(max_length=15)
    email        = models.EmailField()
    city         = models.CharField(max_length=100)
    state        = models.CharField(max_length=100, blank=True)
    gstin        = models.CharField(max_length=20, blank=True)
    message      = models.TextField(blank=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at   = models.DateTimeField(auto_now_add=True)
    reviewed_at  = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.dealer_name} — {self.status}"


# ─── DEALER REVIEWS (from drivers/buyers) ─────────────────────────

class DealerReview(models.Model):
    dealer        = models.ForeignKey(DealerProfile, on_delete=models.CASCADE, related_name='reviews')
    reviewer_name = models.CharField(max_length=200)
    reviewer_phone = models.CharField(max_length=15, blank=True)
    rating        = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment       = models.TextField()
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.dealer.dealer_name} — {self.rating}★ by {self.reviewer_name}"


# ─── PUBLIC ENQUIRY (no auth needed, no required dealer FK) ───────

class PublicEnquiry(models.Model):
    """Visitor lead from public marketplace / homepage — no login required."""
    customer_name = models.CharField(max_length=200)
    phone         = models.CharField(max_length=15)
    city          = models.CharField(max_length=100, blank=True)
    vehicle       = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True)
    dealer        = models.ForeignKey(DealerProfile, on_delete=models.SET_NULL, null=True, blank=True,
                                      help_text='Auto-assigned based on vehicle or city')
    notes         = models.TextField(blank=True)
    is_processed  = models.BooleanField(default=False)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Public Enquiry'
        verbose_name_plural = 'Public Enquiries'

    def __str__(self):
        return f"{self.customer_name} ({self.phone}) — {self.city}"


# ─── NOTIFICATION LOG ─────────────────────────────────────────────

class NotificationLog(models.Model):
    CHANNEL_CHOICES = [
        ('email',     'Email'),
        ('whatsapp',  'WhatsApp'),
        ('push',      'Push Notification'),
        ('sms',       'SMS'),
    ]
    TYPE_CHOICES = [
        ('welcome',        'Welcome'),
        ('approval',       'Dealer Approved'),
        ('rejection',      'Dealer Rejected'),
        ('plan_expiry',    'Plan Expiry Warning'),
        ('new_lead',       'New Lead'),
        ('new_enquiry',    'New Enquiry'),
        ('emi_due',        'EMI Due Reminder'),
        ('delivery',       'Delivery Reminder'),
        ('offer',          'Offer Broadcast'),
        ('other',          'Other'),
    ]

    dealer      = models.ForeignKey(DealerProfile, on_delete=models.CASCADE,
                                    related_name='notification_logs', null=True, blank=True)
    channel     = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    notif_type  = models.CharField(max_length=30, choices=TYPE_CHOICES, default='other')
    recipient   = models.CharField(max_length=200, help_text='Email or phone number')
    subject     = models.CharField(max_length=300, blank=True)
    success     = models.BooleanField(default=False)
    error_msg   = models.TextField(blank=True)
    sent_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        status = '✓' if self.success else '✗'
        return f"[{status}] {self.channel} {self.notif_type} → {self.recipient}"
