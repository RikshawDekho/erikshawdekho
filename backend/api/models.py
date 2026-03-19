from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


# ─── USER PROFILE (role + FCM token for all user types) ───────────

class UserProfile(models.Model):
    USER_TYPES = [
        ('driver', 'Driver / Buyer'),
        ('dealer', 'Dealer / Showroom'),
        ('admin',  'Platform Admin'),
        ('financer', 'Financer / NBFC'),
        ('customer', 'Customer / Buyer'),
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
    logo = models.ImageField(upload_to='dealers/logos/', null=True, blank=True)
    cover_image = models.ImageField(upload_to='dealers/covers/', null=True, blank=True, help_text='Store banner/cover image shown in dealer directory')
    description = models.TextField(blank=True, help_text='Showroom description visible on public profile')
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    # ── Subscription ──────────────────────────────────────
    plan_type       = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    plan_started_at = models.DateTimeField(null=True, blank=True)
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    plan            = models.ForeignKey('Plan', on_delete=models.SET_NULL, null=True, blank=True, related_name='dealers')
    listing_count   = models.IntegerField(default=0, help_text='Cached count of active listings')
    # ── Free Tier Tracking ────────────────────────────────
    lifetime_lead_count   = models.IntegerField(default=0, help_text='Lifetime leads received (free tier limit: 20)')
    invoice_count         = models.IntegerField(default=0, help_text='Invoices generated (free tier limit: 20)')
    lifetime_enquiry_count = models.IntegerField(default=0, help_text='Lifetime public enquiries received (free tier limit: 20)')
    # ── Notification Preferences ──────────────────────────
    notify_email    = models.BooleanField(default=True,  help_text='Receive email notifications')
    notify_whatsapp = models.BooleanField(default=True,  help_text='Receive WhatsApp notifications')
    notify_push     = models.BooleanField(default=True,  help_text='Receive push notifications')
    # ── Invoice Branding & Customisation ──────────────────
    sales_manager_name   = models.CharField(max_length=200, blank=True, default='Authorised Signatory')
    bank_name            = models.CharField(max_length=200, blank=True, default='HDFC Bank Ltd.')
    bank_account_number  = models.CharField(max_length=50,  blank=True, default='50200012345678')
    bank_ifsc            = models.CharField(max_length=20,  blank=True, default='HDFC000123')
    bank_upi             = models.CharField(max_length=100, blank=True, default='erikshawdekho@hdfc')
    invoice_footer_note  = models.TextField(blank=True, default='')
    is_demo              = models.BooleanField(default=False)

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


class Plan(models.Model):
    SLUG_FREE  = 'free'
    SLUG_EARLY = 'early_dealer'

    name                = models.CharField(max_length=100, unique=True)
    slug                = models.CharField(max_length=50, unique=True)
    price               = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    listing_limit       = models.IntegerField(default=3, help_text='Max vehicle listings. 0 = unlimited.')
    priority_ranking    = models.BooleanField(default=False)
    featured_badge      = models.BooleanField(default=False)
    whatsapp_alerts     = models.BooleanField(default=False)
    analytics_access    = models.BooleanField(default=False)
    yearly_subscription = models.BooleanField(default=False)
    max_dealers         = models.IntegerField(default=0, help_text='Max dealers on this plan. 0 = unlimited.')
    is_active           = models.BooleanField(default=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    @property
    def signups_count(self):
        return DealerProfile.objects.filter(plan=self).count()

    @property
    def is_available(self):
        if self.max_dealers == 0:
            return True
        return self.signups_count < self.max_dealers

    def __str__(self):
        return f"{self.name} (₹{self.price})"


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    logo = models.ImageField(upload_to='brands/', null=True, blank=True)
    website = models.URLField(blank=True)

    def __str__(self):
        return self.name


class VehicleType(models.Model):
    """Dealer-managed vehicle categories (e.g. Passenger Rickshaw, Cargo Loader, custom types)."""
    name       = models.CharField(max_length=100, unique=True)
    slug       = models.CharField(max_length=50, unique=True)  # stored in Vehicle.vehicle_type
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ['-is_default', 'name']

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
    # TYPE_CHOICES kept for display labels only; vehicle_type is now a free CharField
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
    vehicle_type = models.CharField(max_length=100, default='passenger')
    fuel_type = models.CharField(max_length=20, choices=FUEL_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    stock_status = models.CharField(max_length=20, choices=STOCK_STATUS, default='in_stock')
    year = models.IntegerField(default=2024)
    is_used = models.BooleanField(default=False)
    thumbnail = models.ImageField(upload_to='vehicles/', null=True, blank=True)
    thumbnail_url = models.URLField(max_length=500, null=True, blank=True, help_text='External image URL for seeded/demo vehicles')
    # Specs
    range_km = models.CharField(max_length=30, blank=True, null=True, help_text='e.g. 120 or 100-120 km')
    battery_capacity = models.CharField(max_length=50, blank=True)
    max_speed = models.CharField(max_length=30, blank=True, null=True, help_text='e.g. 45 or 45-55 km/h')
    payload_kg = models.CharField(max_length=50, blank=True, null=True, help_text='e.g. 500 or 600-1000 kg')
    seating_capacity = models.CharField(max_length=20, blank=True, default='3', help_text='e.g. 3, 4+1, 3+1')
    warranty_years = models.IntegerField(default=1)
    hsn_code = models.CharField(max_length=20, default='8703')
    description = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.brand} {self.model_name}"

    class Meta:
        indexes = [
            models.Index(fields=['dealer', 'is_active', 'stock_status']),
        ]

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
        ('marketplace', 'Marketplace Enquiry'),
        ('review', 'Buyer Review'),
    ]
    STATUS_CHOICES = [
        ('new', 'New'),
        ('interested', 'Interested'),
        ('follow_up', 'Follow Up'),
        ('converted', 'Converted'),
        ('lost', 'Lost'),
    ]

    dealer = models.ForeignKey(DealerProfile, on_delete=models.CASCADE, related_name='leads')
    customer_name = models.CharField(max_length=200, db_index=True)
    phone = models.CharField(max_length=15, db_index=True)
    email = models.EmailField(blank=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='website')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    notes = models.TextField(blank=True)
    buyer_latitude  = models.FloatField(null=True, blank=True, help_text='Buyer GPS latitude')
    buyer_longitude = models.FloatField(null=True, blank=True, help_text='Buyer GPS longitude')
    follow_up_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Soft delete — never hard-delete CRM records
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['dealer', 'status']),
            models.Index(fields=['dealer', 'created_at']),   # fast sort+filter by dealer
            models.Index(fields=['dealer', 'is_deleted']),   # soft-delete queries
        ]

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
    customer_name = models.CharField(max_length=200, db_index=True)
    customer_phone = models.CharField(max_length=15, db_index=True)
    customer_email = models.EmailField(blank=True)
    customer_address = models.TextField(blank=True)
    customer_gstin = models.CharField(max_length=20, blank=True)
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=1)
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=2.5)
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=2.5)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='cash')
    delivery_date = models.DateField(null=True, blank=True)
    is_delivered = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    sale_date = models.DateTimeField(auto_now_add=True)
    # Vehicle identification (required for RTO registration & insurance)
    chassis_number      = models.CharField(max_length=50, blank=True)
    engine_number       = models.CharField(max_length=50, blank=True)
    vehicle_color       = models.CharField(max_length=50, blank=True)
    year_of_manufacture = models.IntegerField(null=True, blank=True)
    # Battery & warranty details
    battery_serial_number  = models.CharField(max_length=100, blank=True)
    battery_capacity_ah    = models.CharField(max_length=50, blank=True, help_text='e.g. 100Ah 48V')
    battery_make           = models.CharField(max_length=100, blank=True, help_text='e.g. Amara Raja, Exide')
    battery_warranty_months= models.IntegerField(null=True, blank=True, help_text='Battery warranty in months')
    motor_serial_number    = models.CharField(max_length=100, blank=True)
    vehicle_warranty_months= models.IntegerField(null=True, blank=True, help_text='Vehicle/chassis warranty in months')
    # Battery unit count + financer details
    battery_count    = models.IntegerField(default=1, help_text='Number of battery units installed')
    financer_details = models.TextField(blank=True, help_text='Financer name, loan a/c, ref number, branch etc.')
    # Loan / finance breakdown
    down_payment     = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text='Customer down payment amount')
    loan_amount_financed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text='Amount financed via loan')
    # GST compliance fields
    place_of_supply = models.CharField(max_length=100, blank=True)  # state name
    sale_updated_at = models.DateTimeField(auto_now=True)
    # Soft delete — never hard-delete financial records
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['dealer', 'sale_date']),
        ]

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
    updated_at = models.DateTimeField(auto_now=True)
    # Soft delete — preserve customer history
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['dealer', 'phone']),
        ]

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
    updated_at = models.DateTimeField(auto_now=True)

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
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['dealer', 'status']),
        ]

    def __str__(self):
        return f"{self.customer_name} - ₹{self.loan_amount}"


# ─── VEHICLE GALLERY ───────────────────────────────────────────────

class VehicleImage(models.Model):
    """Additional gallery images for a vehicle listing (beyond the primary thumbnail)."""
    vehicle  = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='images')
    image    = models.ImageField(upload_to='vehicles/gallery/')
    order    = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Image #{self.order} for {self.vehicle}"


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


class VideoResource(models.Model):
    CATEGORY_CHOICES = [
        ('tutorial',    'How to Drive'),
        ('maintenance', 'Maintenance Tips'),
        ('earning',     'Earn More'),
        ('review',      'Expert Review'),
        ('general',     'General Info'),
    ]
    dealer      = models.ForeignKey(DealerProfile, on_delete=models.CASCADE,
                                     related_name='videos', null=True, blank=True)
    title       = models.CharField(max_length=300)
    youtube_url = models.URLField(max_length=500)
    description = models.TextField(blank=True)
    category    = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    is_public   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    @property
    def video_id(self):
        import re
        for pat in [r'youtube\.com/watch\?v=([^&\s]+)', r'youtu\.be/([^?\s]+)', r'youtube\.com/embed/([^?\s]+)']:
            m = re.search(pat, self.youtube_url)
            if m: return m.group(1)
        return None

    @property
    def thumbnail_url(self):
        vid = self.video_id
        return f'https://img.youtube.com/vi/{vid}/hqdefault.jpg' if vid else ''

    def __str__(self):
        return self.title


class BlogPost(models.Model):
    CATEGORY_CHOICES = [
        ('maintenance', 'Maintenance Tips'),
        ('earning',     'Earn More'),
        ('news',        'Industry News'),
        ('scheme',      'Government Schemes'),
        ('general',     'General'),
    ]
    dealer          = models.ForeignKey(DealerProfile, on_delete=models.CASCADE,
                                         related_name='blog_posts', null=True, blank=True)
    title           = models.CharField(max_length=300)
    excerpt         = models.TextField(blank=True, help_text='Short description shown in card')
    content         = models.TextField(blank=True, help_text='Full article content (optional)')
    url             = models.URLField(max_length=500, blank=True, help_text='External article URL')
    category        = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    cover_image_url = models.URLField(max_length=500, blank=True)
    is_published    = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class PlatformSettings(models.Model):
    """Singleton model for platform-wide settings managed by admin."""
    support_phone    = models.CharField(max_length=20, blank=True, default="")
    support_whatsapp = models.CharField(max_length=20, blank=True, default="")
    support_email    = models.EmailField(default="support@erikshawdekho.com")
    support_name     = models.CharField(max_length=100, default="eRickshawDekho Support")
    homepage_intro_video_url = models.URLField(blank=True, default="")

    # ── Homepage Content (admin-editable) ─────────────────────────
    announcement_text   = models.CharField(max_length=300, blank=True, default="",
                                           help_text="Top announcement bar text. Leave blank to hide.")
    announcement_link   = models.URLField(blank=True, default="",
                                          help_text="Optional link for the announcement bar.")
    hero_title_hi       = models.CharField(max_length=200, blank=True, default="ई-रिक्शा चाहिए?",
                                           help_text="Hero heading in Hindi")
    hero_title_en       = models.CharField(max_length=200, blank=True, default="Looking for E-Rickshaw?",
                                           help_text="Hero heading in English")
    hero_subtitle_hi    = models.CharField(max_length=300, blank=True,
                                           default="भारत के verified dealers से सीधे best price पाएँ — बिल्कुल मुफ्त",
                                           help_text="Hero subtitle in Hindi")
    hero_subtitle_en    = models.CharField(max_length=300, blank=True,
                                           default="Get best prices directly from verified dealers across India — completely free",
                                           help_text="Hero subtitle in English")

    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Platform Settings"

    def __str__(self):
        return "Platform Settings"

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class DealerAPIKey(models.Model):
    SERVICE_CHOICES = [
        ('twilio', 'Twilio (SMS/WhatsApp OTP)'),
        ('gmail_smtp', 'Gmail SMTP (Email Marketing)'),
        ('whatsapp_business', 'WhatsApp Business API'),
        ('firebase', 'Firebase (Push Notifications)'),
    ]
    dealer       = models.ForeignKey(DealerProfile, on_delete=models.CASCADE, related_name='api_keys')
    service      = models.CharField(max_length=30, choices=SERVICE_CHOICES)
    display_name = models.CharField(max_length=100, blank=True)
    api_key      = models.CharField(max_length=500)
    api_secret   = models.CharField(max_length=500, blank=True)
    extra_config = models.JSONField(default=dict, blank=True, help_text='e.g. {"from_number": "+1234567890"}')
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('dealer', 'service')
        ordering = ['service']

    def __str__(self):
        return f"{self.dealer.dealer_name} — {self.get_service_display()}"


# ─── PUBLIC ENQUIRY (no auth needed, no required dealer FK) ───────

class PublicEnquiry(models.Model):
    """
    Visitor lead from public marketplace / homepage — no login required.
    Must target a specific dealer (brand + dealer selection mandatory from v3).
    """
    customer_name = models.CharField(max_length=200)
    phone         = models.CharField(max_length=15)
    pincode       = models.CharField(max_length=10, blank=True)
    city          = models.CharField(max_length=100, blank=True)
    brand_name    = models.CharField(max_length=100, blank=True,
                                     help_text='Brand selected by driver during enquiry')
    vehicle       = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True)
    dealer        = models.ForeignKey(DealerProfile, on_delete=models.SET_NULL, null=True, blank=True,
                                      help_text='Targeted dealer selected by driver. Lead goes only to this dealer.')
    notes         = models.TextField(blank=True)
    is_processed  = models.BooleanField(default=False)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Public Enquiry'
        verbose_name_plural = 'Public Enquiries'
        indexes = [
            models.Index(fields=['dealer', 'is_processed']),
        ]

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
        indexes = [
            models.Index(fields=['dealer', 'sent_at']),
        ]

    def __str__(self):
        status = '✓' if self.success else '✗'
        return f"[{status}] {self.channel} {self.notif_type} → {self.recipient}"


# ─── FINANCER PROFILE ─────────────────────────────────────────────

class FinancerProfile(models.Model):
    """Profile for NBFC / financer partners."""
    user           = models.OneToOneField(User, on_delete=models.CASCADE, related_name='financer_profile')
    company_name   = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True)
    phone          = models.CharField(max_length=15)
    email          = models.EmailField(blank=True)
    city           = models.CharField(max_length=100, blank=True)
    state          = models.CharField(max_length=100, blank=True)
    gstin          = models.CharField(max_length=20, blank=True)
    pan_number     = models.CharField(max_length=12, blank=True)
    description    = models.TextField(blank=True)
    logo           = models.ImageField(upload_to='financers/', null=True, blank=True)
    is_verified    = models.BooleanField(default=False)
    interest_rate_min = models.DecimalField(max_digits=5, decimal_places=2, default=8.0)
    interest_rate_max = models.DecimalField(max_digits=5, decimal_places=2, default=18.0)
    max_loan_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=500000)
    min_loan_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=50000)
    max_tenure_months = models.IntegerField(default=60)
    processing_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=2.0)
    created_at     = models.DateTimeField(auto_now_add=True)
    is_demo        = models.BooleanField(default=False)

    def __str__(self):
        return self.company_name


class FinancerDocument(models.Model):
    """Documents uploaded by financer for onboarding."""
    DOC_TYPES = [
        ('registration', 'Company Registration'),
        ('pan', 'PAN Card'),
        ('gst', 'GST Certificate'),
        ('rbi_license', 'RBI / NBFC License'),
        ('address_proof', 'Address Proof'),
        ('bank_statement', 'Bank Statement'),
        ('agreement', 'Partnership Agreement'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    financer   = models.ForeignKey(FinancerProfile, on_delete=models.CASCADE, related_name='documents')
    doc_type   = models.CharField(max_length=30, choices=DOC_TYPES, default='other')
    title      = models.CharField(max_length=200, blank=True)
    file       = models.FileField(upload_to='financer_docs/')
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes      = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.financer.company_name} — {self.get_doc_type_display()}"


# ─── CUSTOMER PROFILE (registered buyers) ─────────────────────────

class CustomerProfile(models.Model):
    """Registered buyers who can compare and raise queries."""
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    full_name  = models.CharField(max_length=200)
    phone      = models.CharField(max_length=15)
    city       = models.CharField(max_length=100, blank=True)
    state      = models.CharField(max_length=100, blank=True)
    pincode    = models.CharField(max_length=10, blank=True)
    latitude   = models.FloatField(null=True, blank=True)
    longitude  = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name


# ─── FINANCER PLANS & SUBSCRIPTIONS ──────────────────────────────

class FinancerPlan(models.Model):
    """Subscription tiers for financer/NBFC partners.

    Free trial : 2 dealers, 5 applications, ₹3,000 commission per financed lead
    Pro        : ₹5,000/year + ₹2,000 commission per financed lead, unlimited everything
    """
    SLUG_FREE = 'free'
    SLUG_PRO  = 'pro'

    name                      = models.CharField(max_length=100, unique=True)
    slug                      = models.CharField(max_length=50, unique=True)
    price_per_year            = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_dealer_associations   = models.IntegerField(default=2,
                                    help_text='Max dealers financer can add. 0 = unlimited.')
    max_finance_applications  = models.IntegerField(default=5,
                                    help_text='Max lifetime applications. 0 = unlimited.')
    commission_per_lead       = models.DecimalField(max_digits=10, decimal_places=2, default=3000,
                                    help_text='Platform commission charged per successfully financed lead (₹).')
    is_active                 = models.BooleanField(default=True)
    features_json             = models.JSONField(default=list, blank=True,
                                    help_text='List of feature strings to display on plan card.')
    created_at                = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (₹{self.price_per_year}/yr)"

    class Meta:
        ordering = ['price_per_year']


class FinancerSubscription(models.Model):
    """Active subscription record for a financer."""
    financer           = models.OneToOneField(FinancerProfile, on_delete=models.CASCADE,
                                              related_name='subscription')
    plan               = models.ForeignKey(FinancerPlan, on_delete=models.PROTECT)
    started_at         = models.DateTimeField(auto_now_add=True)
    expires_at         = models.DateTimeField(null=True, blank=True)
    is_active          = models.BooleanField(default=True)
    applications_used  = models.IntegerField(default=0,
                                help_text='Financed applications this billing cycle (free tier limit enforced).')
    auto_renew         = models.BooleanField(default=False)

    @property
    def is_within_limit(self):
        """Return True if financer can process more applications under current plan."""
        limit = self.plan.max_finance_applications
        if limit == 0:
            return True
        return self.applications_used < limit

    def __str__(self):
        return f"{self.financer.company_name} — {self.plan.name}"

    class Meta:
        ordering = ['-started_at']


# ─── FINANCER ↔ DEALER ASSOCIATION ───────────────────────────────

class FinancerDealerAssociation(models.Model):
    """
    Dealer applies to a financer. Financer approves/rejects.
    Admin/Superadmin must have already verified the dealer before financer sees them.
    Once financer approves: dealer appears as 'verified' in the financer's ecosystem.
    """
    STATUS_CHOICES = [
        ('pending',   'Pending Financer Approval'),
        ('approved',  'Approved by Financer'),
        ('rejected',  'Rejected by Financer'),
        ('suspended', 'Suspended'),
    ]
    financer    = models.ForeignKey(FinancerProfile, on_delete=models.CASCADE,
                                    related_name='dealer_associations')
    dealer      = models.ForeignKey(DealerProfile, on_delete=models.CASCADE,
                                    related_name='financer_associations')
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at  = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes       = models.TextField(blank=True)

    class Meta:
        unique_together = ('financer', 'dealer')
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.dealer.dealer_name} → {self.financer.company_name} [{self.status}]"


# ─── FINANCER REQUIRED DOCUMENTS ─────────────────────────────────

class FinancerRequiredDocument(models.Model):
    """
    Documents a financer mandates from a dealer before processing any loan application.
    Financer can customise this list. Dealer must upload all mandatory docs.
    """
    DOC_TYPES = [
        ('aadhaar',           'Aadhaar Card'),
        ('pan',               'PAN Card'),
        ('voter_id',          'Voter ID'),
        ('driving_license',   'Driving License'),
        ('bank_statement',    'Bank Statement (3 months)'),
        ('income_proof',      'Income / Salary Proof'),
        ('address_proof',     'Address Proof'),
        ('passport_photo',    'Passport Size Photo (2 copies)'),
        ('vehicle_quotation', 'Vehicle Quotation from Dealer'),
        ('form_16',           'Form 16 / ITR'),
        ('other',             'Other'),
    ]
    financer       = models.ForeignKey(FinancerProfile, on_delete=models.CASCADE,
                                       related_name='required_documents')
    doc_type       = models.CharField(max_length=30, choices=DOC_TYPES)
    description    = models.CharField(max_length=300, blank=True,
                                      help_text='Additional instructions for this document.')
    is_mandatory   = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('financer', 'doc_type')
        ordering = ['doc_type']

    def __str__(self):
        flag = '(mandatory)' if self.is_mandatory else '(optional)'
        return f"{self.financer.company_name} — {self.get_doc_type_display()} {flag}"


# ─── FINANCE APPLICATION (dealer → financer) ─────────────────────

class FinanceApplication(models.Model):
    """
    Full loan application created by dealer on behalf of a customer/buyer.
    Dealer collects mandatory documents, uploads them here, then submits to financer.
    Financer can update status; dealer and customer see the latest status.
    """
    STATUS_CHOICES = [
        ('draft',        'Draft — Collecting Documents'),
        ('submitted',    'Submitted to Financer'),
        ('under_review', 'Under Review'),
        ('docs_required','Additional Documents Required'),
        ('approved',     'Approved'),
        ('rejected',     'Rejected'),
        ('disbursed',    'Loan Disbursed'),
        ('cancelled',    'Cancelled'),
    ]

    dealer         = models.ForeignKey(DealerProfile,   on_delete=models.CASCADE,
                                       related_name='finance_applications')
    financer       = models.ForeignKey(FinancerProfile, on_delete=models.CASCADE,
                                       related_name='received_applications')
    vehicle        = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True)

    # Customer / buyer details
    customer_name    = models.CharField(max_length=200)
    customer_phone   = models.CharField(max_length=15)
    customer_email   = models.EmailField(blank=True)
    customer_address = models.TextField(blank=True)
    customer_aadhaar = models.CharField(max_length=20, blank=True)
    customer_pan     = models.CharField(max_length=12, blank=True)
    customer_dob     = models.DateField(null=True, blank=True)

    # Loan parameters
    vehicle_price    = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    loan_amount      = models.DecimalField(max_digits=10, decimal_places=2)
    down_payment     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tenure_months    = models.IntegerField(default=36)

    # Workflow tracking
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    status_notes     = models.TextField(blank=True,
                                        help_text='Financer notes visible to dealer on status update.')
    submitted_at     = models.DateTimeField(null=True, blank=True)
    reviewed_at      = models.DateTimeField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['dealer', 'status']),
            models.Index(fields=['financer', 'status']),
        ]

    def __str__(self):
        return f"FA-{self.pk} | {self.customer_name} → {self.financer.company_name} [{self.status}]"


class FinanceApplicationDocument(models.Model):
    """
    Customer documents uploaded by dealer against a FinanceApplication.
    Each document maps to a FinancerRequiredDocument.doc_type.
    """
    application  = models.ForeignKey(FinanceApplication, on_delete=models.CASCADE,
                                     related_name='documents')
    doc_type     = models.CharField(max_length=30,
                                    help_text='Must match one of FinancerRequiredDocument.doc_type choices.')
    file         = models.FileField(upload_to='finance_app_docs/')
    notes        = models.CharField(max_length=300, blank=True)
    uploaded_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"FA-{self.application_id} — {self.doc_type}"


class FinanceApplicationRemark(models.Model):
    """
    Threaded remarks on a FinanceApplication — visible to both financer and dealer.
    Either party can post remarks; the other sees them immediately.
    """
    AUTHOR_CHOICES = [('financer', 'Financer'), ('dealer', 'Dealer')]

    application = models.ForeignKey(FinanceApplication, on_delete=models.CASCADE,
                                    related_name='remarks')
    author_type = models.CharField(max_length=10, choices=AUTHOR_CHOICES)
    content     = models.TextField()
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"FA-{self.application_id} [{self.author_type}]: {self.content[:50]}"
