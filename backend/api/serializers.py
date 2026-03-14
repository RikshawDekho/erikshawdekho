import re as _re
from rest_framework import serializers
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Avg
from django.utils import timezone
from datetime import timedelta
from .models import (
    DealerProfile, Brand, Vehicle, Lead, Sale, Customer, Task, FinanceLoan,
    DealerApplication, DealerReview, UserProfile, VideoResource, BlogPost, Plan,
    FinancerProfile, FinancerDocument, CustomerProfile,
)


PLATFORM_NAME = getattr(settings, 'PLATFORM_NAME', 'eRickshawDekho')


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class DealerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = DealerProfile
        fields = '__all__'


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'


class VehicleSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    dealer_name = serializers.CharField(source='dealer.dealer_name', read_only=True)
    class Meta:
        model = Vehicle
        fields = '__all__'
        extra_kwargs = {'dealer': {'read_only': True}}


class VehicleListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    class Meta:
        model = Vehicle
        fields = ['id','brand_name','model_name','fuel_type','vehicle_type',
                  'price','stock_quantity','stock_status','thumbnail','thumbnail_url','year','is_featured','is_used']


class LeadSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.SerializerMethodField()
    class Meta:
        model = Lead
        fields = '__all__'
        extra_kwargs = {'dealer': {'read_only': True}}

    def get_vehicle_name(self, obj):
        if obj.vehicle:
            return f"{obj.vehicle.brand} {obj.vehicle.model_name}"
        return None


class SaleSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    cgst_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    sgst_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Sale
        fields = '__all__'
        extra_kwargs = {'dealer': {'read_only': True}, 'invoice_number': {'read_only': True}}

    def get_vehicle_name(self, obj):
        return f"{obj.vehicle.brand} {obj.vehicle.model_name}"


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        extra_kwargs = {'dealer': {'read_only': True}}


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        extra_kwargs = {'dealer': {'read_only': True}}


class FinanceLoanSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.SerializerMethodField()
    class Meta:
        model = FinanceLoan
        fields = '__all__'
        extra_kwargs = {'dealer': {'read_only': True}}

    def get_vehicle_name(self, obj):
        if obj.vehicle:
            return f"{obj.vehicle.brand} {obj.vehicle.model_name}"
        return None


class RegisterSerializer(serializers.Serializer):
    email       = serializers.EmailField()
    password    = serializers.CharField(min_length=8)
    dealer_name = serializers.CharField(max_length=200)
    phone       = serializers.CharField(max_length=15)
    city        = serializers.CharField(max_length=100, required=False, default='Delhi')
    state       = serializers.CharField(max_length=100, required=False, default='')
    pincode     = serializers.CharField(max_length=10, required=False, default='')

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists. Please sign in.")
        return value

    def validate_phone(self, value):
        digits = _re.sub(r'\D', '', value)
        # Accept Indian numbers: 10 digits or +91XXXXXXXXXX
        if len(digits) == 12 and digits.startswith('91'):
            digits = digits[2:]
        if len(digits) != 10 or not digits[0] in '6789':
            raise serializers.ValidationError("Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).")
        clean = digits
        if DealerProfile.objects.filter(phone__endswith=clean).exists():
            raise serializers.ValidationError("An account with this mobile number already exists.")
        return clean

    def _generate_username(self, email):
        """Auto-generate unique username from email prefix."""
        base = _re.sub(r'[^a-zA-Z0-9]', '', email.split('@')[0]).lower()[:20]
        if not base:
            base = 'dealer'
        username = base
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{counter}"
            counter += 1
        return username

    def create(self, validated_data):
        username = self._generate_username(validated_data['email'])
        user = User.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=validated_data['password'],
        )
        # Get free plan
        try:
            from .models import Plan
            free_plan = Plan.objects.get(slug=Plan.SLUG_FREE)
        except Exception:
            free_plan = None
        now = timezone.now()
        DealerProfile.objects.create(
            user=user,
            dealer_name=validated_data['dealer_name'],
            phone=validated_data['phone'],
            city=validated_data.get('city', 'Delhi'),
            state=validated_data.get('state', ''),
            pincode=validated_data.get('pincode', ''),
            plan_type='free',
            plan=free_plan,
            plan_started_at=now,
            plan_expires_at=now + timedelta(days=30),
        )
        UserProfile.objects.create(user=user, user_type='dealer',
                                   phone=validated_data['phone'],
                                   city=validated_data.get('city', 'Delhi'))
        return user


class DriverRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email    = serializers.EmailField()
    password = serializers.CharField(min_length=6)
    phone    = serializers.CharField(max_length=15, required=False, default='')
    city     = serializers.CharField(max_length=100, required=False, default='')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        UserProfile.objects.create(user=user, user_type='driver',
                                   phone=validated_data.get('phone', ''),
                                   city=validated_data.get('city', ''))
        return user


# ─── PUBLIC DEALER SERIALIZERS ─────────────────────────────────────

class DealerReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DealerReview
        fields = ['id', 'reviewer_name', 'reviewer_phone', 'rating', 'comment', 'created_at']
        read_only_fields = ['created_at']


class PublicVehicleSerializer(serializers.ModelSerializer):
    brand_name      = serializers.CharField(source='brand.name', read_only=True)
    dealer_id       = serializers.IntegerField(source='dealer.id', read_only=True)
    dealer_name     = serializers.CharField(source='dealer.dealer_name', read_only=True)
    dealer_city     = serializers.CharField(source='dealer.city', read_only=True)
    dealer_phone    = serializers.CharField(source='dealer.phone', read_only=True)
    dealer_address  = serializers.CharField(source='dealer.address', read_only=True)
    dealer_state    = serializers.CharField(source='dealer.state', read_only=True)
    dealer_verified = serializers.BooleanField(source='dealer.is_verified', read_only=True)

    class Meta:
        model  = Vehicle
        fields = ['id', 'brand_name', 'dealer_id', 'dealer_name', 'dealer_city',
                  'dealer_phone', 'dealer_address', 'dealer_state', 'dealer_verified',
                  'model_name', 'fuel_type', 'vehicle_type', 'price', 'stock_status',
                  'stock_quantity', 'thumbnail', 'year', 'is_featured', 'is_used',
                  'range_km', 'battery_capacity', 'max_speed', 'payload_kg',
                  'seating_capacity', 'warranty_years', 'hsn_code', 'description']


class PublicDealerSerializer(serializers.ModelSerializer):
    avg_rating    = serializers.SerializerMethodField()
    review_count  = serializers.SerializerMethodField()
    vehicle_count = serializers.SerializerMethodField()

    class Meta:
        model  = DealerProfile
        fields = ['id', 'dealer_name', 'city', 'state', 'phone', 'address',
                  'description', 'logo', 'avg_rating', 'review_count', 'vehicle_count']

    def get_avg_rating(self, obj):
        avg = obj.reviews.aggregate(avg=Avg('rating'))['avg']
        return round(avg, 1) if avg else None

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_vehicle_count(self, obj):
        return obj.vehicles.filter(is_active=True, stock_status__in=['in_stock', 'low_stock']).count()


class DealerApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DealerApplication
        fields = ['id', 'dealer_name', 'contact_name', 'phone', 'email',
                  'city', 'state', 'gstin', 'message', 'applied_at']
        read_only_fields = ['applied_at']


class DashboardSerializer(serializers.Serializer):
    total_vehicles = serializers.IntegerField()
    in_stock = serializers.IntegerField()
    active_leads = serializers.IntegerField()
    new_sales = serializers.IntegerField()
    pending_tasks = serializers.IntegerField()
    monthly_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    fuel_breakdown = serializers.DictField()
    recent_leads = LeadSerializer(many=True)
    upcoming_deliveries = SaleSerializer(many=True)
    upcoming_tasks = TaskSerializer(many=True)
    sales_chart = serializers.ListField()


class VideoResourceSerializer(serializers.ModelSerializer):
    video_id      = serializers.ReadOnlyField()
    thumbnail_url = serializers.ReadOnlyField()
    dealer_name   = serializers.SerializerMethodField()

    class Meta:
        model  = VideoResource
        fields = '__all__'
        extra_kwargs = {'dealer': {'read_only': True}}

    def get_dealer_name(self, obj):
        return obj.dealer.dealer_name if obj.dealer else PLATFORM_NAME


class BlogPostSerializer(serializers.ModelSerializer):
    dealer_name = serializers.SerializerMethodField()

    class Meta:
        model   = BlogPost
        fields  = '__all__'
        extra_kwargs = {'dealer': {'read_only': True}}

    def get_dealer_name(self, obj):
        return obj.dealer.dealer_name if obj.dealer else PLATFORM_NAME


class PlanSerializer(serializers.ModelSerializer):
    signups_count = serializers.ReadOnlyField()
    is_available  = serializers.ReadOnlyField()

    class Meta:
        model  = Plan
        fields = ['id', 'name', 'slug', 'price', 'listing_limit', 'priority_ranking',
                  'featured_badge', 'whatsapp_alerts', 'analytics_access',
                  'yearly_subscription', 'max_dealers', 'signups_count', 'is_available', 'is_active']


# ─── FINANCER SERIALIZERS ─────────────────────────────────────────

class FinancerProfileSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()

    class Meta:
        model  = FinancerProfile
        fields = '__all__'
        extra_kwargs = {'user': {'read_only': True}}

    def get_username(self, obj):
        return obj.user.username


class FinancerDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FinancerDocument
        fields = '__all__'
        extra_kwargs = {'financer': {'read_only': True}}


class FinancerRegisterSerializer(serializers.Serializer):
    email        = serializers.EmailField()
    password     = serializers.CharField(min_length=8, write_only=True)
    company_name = serializers.CharField(max_length=200)
    phone        = serializers.CharField(max_length=15)
    city         = serializers.CharField(max_length=100, required=False, default='')
    contact_person = serializers.CharField(max_length=200, required=False, default='')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def create(self, validated_data):
        email = validated_data['email']
        username = email.split('@')[0]
        base = username
        n = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{n}"
            n += 1
        user = User.objects.create_user(
            username=username, email=email,
            password=validated_data['password'],
            first_name=validated_data.get('contact_person', ''),
        )
        UserProfile.objects.create(user=user, user_type='financer', phone=validated_data['phone'], city=validated_data.get('city', ''))
        financer = FinancerProfile.objects.create(
            user=user,
            company_name=validated_data['company_name'],
            phone=validated_data['phone'],
            email=email,
            city=validated_data.get('city', ''),
            contact_person=validated_data.get('contact_person', ''),
        )
        return user


class CustomerRegisterSerializer(serializers.Serializer):
    email     = serializers.EmailField()
    password  = serializers.CharField(min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=200)
    phone     = serializers.CharField(max_length=15)
    city      = serializers.CharField(max_length=100, required=False, default='')
    pincode   = serializers.CharField(max_length=10, required=False, default='')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def create(self, validated_data):
        email = validated_data['email']
        username = email.split('@')[0]
        base = username
        n = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{n}"
            n += 1
        user = User.objects.create_user(
            username=username, email=email,
            password=validated_data['password'],
            first_name=validated_data['full_name'].split()[0] if validated_data['full_name'] else '',
            last_name=' '.join(validated_data['full_name'].split()[1:]) if len(validated_data['full_name'].split()) > 1 else '',
        )
        UserProfile.objects.create(user=user, user_type='customer', phone=validated_data['phone'], city=validated_data.get('city', ''))
        CustomerProfile.objects.create(
            user=user,
            full_name=validated_data['full_name'],
            phone=validated_data['phone'],
            city=validated_data.get('city', ''),
            pincode=validated_data.get('pincode', ''),
        )
        return user


class PublicFinancerSerializer(serializers.ModelSerializer):
    """Public-facing financer info for the financer ecosystem page."""
    class Meta:
        model  = FinancerProfile
        fields = ['id', 'company_name', 'city', 'state', 'interest_rate_min', 'interest_rate_max',
                  'max_loan_amount', 'min_loan_amount', 'max_tenure_months', 'processing_fee_pct',
                  'description', 'logo', 'is_verified']
