from rest_framework import serializers
from django.contrib.auth.models import User
from .models import DealerProfile, Brand, Vehicle, Lead, Sale, Customer, Task, FinanceLoan


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
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6)
    dealer_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=15)
    city = serializers.CharField(max_length=100, required=False, default='Delhi')

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
        DealerProfile.objects.create(
            user=user,
            dealer_name=validated_data['dealer_name'],
            phone=validated_data['phone'],
            city=validated_data.get('city', 'Delhi'),
        )
        return user


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
