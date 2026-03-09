from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Avg
from django.utils import timezone
from datetime import timedelta
from .models import DealerProfile, Brand, Vehicle, Lead, Sale, Customer, Task, FinanceLoan, DealerApplication, DealerReview, UserProfile


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


class VehicleListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    class Meta:
        model = Vehicle
        fields = ['id','brand_name','model_name','fuel_type','vehicle_type',
                  'price','stock_quantity','stock_status','thumbnail','year','is_featured','is_used']


class LeadSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.SerializerMethodField()
    class Meta:
        model = Lead
        fields = '__all__'

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

    def get_vehicle_name(self, obj):
        return f"{obj.vehicle.brand} {obj.vehicle.model_name}"


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'


class FinanceLoanSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.SerializerMethodField()
    class Meta:
        model = FinanceLoan
        fields = '__all__'

    def get_vehicle_name(self, obj):
        if obj.vehicle:
            return f"{obj.vehicle.brand} {obj.vehicle.model_name}"
        return None


class RegisterSerializer(serializers.Serializer):
    username    = serializers.CharField(max_length=150)
    email       = serializers.EmailField()
    password    = serializers.CharField(min_length=6)
    dealer_name = serializers.CharField(max_length=200)
    phone       = serializers.CharField(max_length=15)
    city        = serializers.CharField(max_length=100, required=False, default='Delhi')

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
        now = timezone.now()
        DealerProfile.objects.create(
            user=user,
            dealer_name=validated_data['dealer_name'],
            phone=validated_data['phone'],
            city=validated_data.get('city', 'Delhi'),
            plan_type='free',
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
                  'logo', 'avg_rating', 'review_count', 'vehicle_count']

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
