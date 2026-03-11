import uuid
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Sum, Count, Q, F, ExpressionWrapper, DecimalField, Avg
from django.utils import timezone
from datetime import timedelta, date
from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DealerProfile, Brand, Vehicle, Lead, Sale, Customer, Task, FinanceLoan, DealerApplication, DealerReview, UserProfile, PublicEnquiry, VideoResource, BlogPost, DealerAPIKey, PlatformSettings
from .serializers import (
    VehicleSerializer, VehicleListSerializer, LeadSerializer, SaleSerializer,
    CustomerSerializer, TaskSerializer, FinanceLoanSerializer, BrandSerializer,
    DealerProfileSerializer, RegisterSerializer, DriverRegisterSerializer,
    DealerApplicationSerializer, DealerReviewSerializer,
    PublicDealerSerializer, PublicVehicleSerializer, VideoResourceSerializer,
    BlogPostSerializer,
)


def _jwt_response(user):
    """Return JWT access + refresh tokens as a dict."""
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class AuthThrottle(AnonRateThrottle):
    scope = 'auth'


# ─── AUTH ─────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new dealer account and return JWT tokens."""
    throttle = AuthThrottle()
    if not throttle.allow_request(request, None):
        return Response({'error': 'Too many requests. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    ser = RegisterSerializer(data=request.data)
    if ser.is_valid():
        user = ser.save()
        dealer = user.dealer_profile
        # Send welcome email + WhatsApp (fire-and-forget — don't block registration)
        try:
            from .emails import send_dealer_welcome_email, send_admin_new_dealer_alert
            from .notifications import notify_dealer_welcome
            if user.email:
                expires_str = dealer.plan_expires_at.strftime('%d %b %Y') if dealer.plan_expires_at else 'N/A'
                send_dealer_welcome_email(
                    dealer_name=dealer.dealer_name,
                    email=user.email,
                    username=user.username,
                    plan_expires=expires_str,
                )
            send_admin_new_dealer_alert(dealer.dealer_name, user.username, dealer.phone, dealer.city)
            if dealer.phone and dealer.notify_whatsapp:
                notify_dealer_welcome(dealer.dealer_name, dealer.phone, user.username)
        except Exception:
            pass  # Never block registration due to notification failure
        return Response({
            **_jwt_response(user),
            'user':   {'id': user.id, 'username': user.username, 'email': user.email, 'user_type': 'dealer'},
            'dealer': {'id': dealer.id, 'name': dealer.dealer_name, 'city': dealer.city}
        }, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_driver(request):
    """Register a new driver/buyer account and return JWT tokens."""
    throttle = AuthThrottle()
    if not throttle.allow_request(request, None):
        return Response({'error': 'Too many requests. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    ser = DriverRegisterSerializer(data=request.data)
    if ser.is_valid():
        user = ser.save()
        return Response({
            **_jwt_response(user),
            'user': {'id': user.id, 'username': user.username, 'email': user.email, 'user_type': 'driver'},
        }, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user (dealer or driver) and return JWT tokens."""
    throttle = AuthThrottle()
    if not throttle.allow_request(request, None):
        return Response({'error': 'Too many login attempts. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    username = request.data.get('username')
    password = request.data.get('password')
    # Support email login
    login_username = username
    if username and '@' in username:
        try:
            login_username = User.objects.get(email__iexact=username).username
        except User.DoesNotExist:
            pass
    user = authenticate(username=login_username, password=password)
    if not user:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({"error": "Your account has been deactivated. Please contact support@erikshawdekho.com"}, status=403)
    dealer = getattr(user, 'dealer_profile', None)
    profile = getattr(user, 'profile', None)
    if user.is_superuser or user.is_staff:
        user_type = 'admin'
    elif profile:
        user_type = profile.user_type
    else:
        user_type = 'dealer' if dealer else 'driver'
    return Response({
        **_jwt_response(user),
        'user': {
            'id': user.id, 'username': user.username, 'email': user.email,
            'first_name': user.first_name, 'last_name': user.last_name,
            'user_type': user_type,
            'is_superuser': user.is_superuser,
        },
        'dealer': {
            'id':    dealer.id if dealer else None,
            'name':  dealer.dealer_name if dealer else username,
            'city':  dealer.city if dealer else '',
            'phone': dealer.phone if dealer else '',
            'gstin': dealer.gstin if dealer else '',
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'PATCH'])
def me(request):
    user = request.user
    dealer = getattr(user, 'dealer_profile', None)

    if request.method == 'PATCH':
        # Update profile fields
        data = request.data
        if 'email' in data:
            user.email = data['email'].strip()
            user.save(update_fields=['email'])
        if dealer:
            simple_fields = ['dealer_name', 'phone', 'city', 'address', 'description', 'gstin',
                             'sales_manager_name', 'bank_name', 'bank_account_number',
                             'bank_ifsc', 'bank_upi', 'invoice_footer_note']
            for f in simple_fields:
                if f in data:
                    val = data[f]
                    if f == 'dealer_name' and not str(val).strip():
                        continue
                    setattr(dealer, f, str(val).strip() if isinstance(val, str) else val)
            dealer.save()

    def _d(field, default=''):
        return getattr(dealer, field, default) if dealer else default

    return Response({
        'user': {'id': user.id, 'username': user.username, 'email': user.email},
        'dealer': {
            'id':                   _d('id', None),
            'name':                 _d('dealer_name'),
            'dealer_name':          _d('dealer_name'),
            'city':                 _d('city'),
            'state':                _d('state'),
            'phone':                _d('phone'),
            'gstin':                _d('gstin'),
            'address':              _d('address'),
            'description':          _d('description'),
            'is_verified':          _d('is_verified', False),
            'sales_manager_name':   _d('sales_manager_name', 'Authorised Signatory'),
            'bank_name':            _d('bank_name', 'HDFC Bank Ltd.'),
            'bank_account_number':  _d('bank_account_number', ''),
            'bank_ifsc':            _d('bank_ifsc', ''),
            'bank_upi':             _d('bank_upi', ''),
            'invoice_footer_note':  _d('invoice_footer_note', ''),
        }
    })


# ─── DASHBOARD ────────────────────────────────────────────────────

@api_view(['GET'])
def dashboard(request):
    dealer = request.user.dealer_profile
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0)

    vehicles = Vehicle.objects.filter(dealer=dealer, is_active=True)
    total_v = vehicles.count()
    in_stock = vehicles.filter(stock_status='in_stock').count()
    active_leads = Lead.objects.filter(dealer=dealer, status__in=['new','interested','follow_up']).count()
    new_sales = Sale.objects.filter(dealer=dealer, sale_date__gte=month_start).count()
    pending_tasks = Task.objects.filter(dealer=dealer, is_completed=False).count()

    _line_total = ExpressionWrapper(F('sale_price') * F('quantity'), output_field=DecimalField(max_digits=14, decimal_places=2))

    monthly_rev = Sale.objects.filter(
        dealer=dealer, sale_date__gte=month_start
    ).annotate(line_total=_line_total).aggregate(total=Sum('line_total'))['total'] or 0

    fuel_q = vehicles.values('fuel_type').annotate(count=Count('id'))
    fuel_breakdown = {item['fuel_type']: item['count'] for item in fuel_q}

    recent_leads = Lead.objects.filter(dealer=dealer).order_by('-created_at')[:5]
    upcoming_deliveries = Sale.objects.filter(
        dealer=dealer, is_delivered=False, delivery_date__gte=date.today()
    ).order_by('delivery_date')[:5]
    upcoming_tasks = Task.objects.filter(
        dealer=dealer, is_completed=False
    ).order_by('due_date')[:5]

    # Sales chart last 7 days
    sales_chart = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0)
        day_end = day.replace(hour=23, minute=59, second=59)
        day_sales = Sale.objects.filter(
            dealer=dealer, sale_date__range=(day_start, day_end)
        ).annotate(line_total=_line_total).aggregate(total=Sum('line_total'), count=Count('id'))
        sales_chart.append({
            'date': day.strftime('%b %d'),
            'revenue': float(day_sales['total'] or 0),
            'count': day_sales['count'] or 0
        })

    return Response({
        'total_vehicles': total_v,
        'in_stock': in_stock,
        'active_leads': active_leads,
        'new_sales': new_sales,
        'pending_tasks': pending_tasks,
        'monthly_revenue': float(monthly_rev),
        'fuel_breakdown': fuel_breakdown,
        'recent_leads': LeadSerializer(recent_leads, many=True).data,
        'upcoming_deliveries': SaleSerializer(upcoming_deliveries, many=True).data,
        'upcoming_tasks': TaskSerializer(upcoming_tasks, many=True).data,
        'sales_chart': sales_chart,
        'is_verified': dealer.is_verified,
        'plan': {
            'type': dealer.plan_type,
            'is_active': dealer.plan_is_active,
            'days_remaining': dealer.plan_days_remaining,
            'expires_at': dealer.plan_expires_at.isoformat() if dealer.plan_expires_at else None,
            'is_verified': dealer.is_verified,
            'listing_limit': dealer.plan.listing_limit if dealer.plan else 3,
            'listing_count': Vehicle.objects.filter(dealer=dealer, is_active=True).count(),
        },
    })


# ─── VEHICLES ─────────────────────────────────────────────────────

class VehicleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = Vehicle.objects.filter(dealer=dealer, is_active=True).select_related('brand')
        brand = self.request.query_params.get('brand')
        fuel = self.request.query_params.get('fuel_type')
        stock = self.request.query_params.get('stock_status')
        search = self.request.query_params.get('search')
        if brand:   qs = qs.filter(brand__name__icontains=brand)
        if fuel:    qs = qs.filter(fuel_type=fuel)
        if stock:   qs = qs.filter(stock_status=stock)
        if search:  qs = qs.filter(Q(model_name__icontains=search)|Q(brand__name__icontains=search))
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        return VehicleSerializer

    def perform_create(self, serializer):
        dealer = self.request.user.dealer_profile
        # Enforce plan listing limit
        plan = getattr(dealer, 'plan', None)
        if plan and plan.listing_limit > 0:
            current_count = Vehicle.objects.filter(dealer=dealer, is_active=True).count()
            if current_count >= plan.listing_limit:
                raise ValidationError({
                    'error': f'Your {plan.name} allows maximum {plan.listing_limit} vehicle listing(s). Upgrade your plan for unlimited listings.',
                    'code': 'listing_limit_reached',
                    'limit': plan.listing_limit,
                    'current': current_count,
                })
        serializer.save(dealer=dealer)

    def destroy(self, request, *args, **kwargs):
        vehicle = self.get_object()
        vehicle.is_active = False
        vehicle.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Public marketplace endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def marketplace_vehicles(request):
    qs = Vehicle.objects.filter(is_active=True, stock_status__in=['in_stock','low_stock']).select_related('brand','dealer')
    fuel = request.query_params.get('fuel_type')
    search = request.query_params.get('search')
    featured = request.query_params.get('featured')
    city = request.query_params.get('city')
    if fuel:     qs = qs.filter(fuel_type=fuel)
    if search:   qs = qs.filter(Q(model_name__icontains=search)|Q(brand__name__icontains=search))
    if featured: qs = qs.filter(is_featured=True)
    if city:     qs = qs.filter(dealer__city__icontains=city)
    # Priority: early_dealer plan first, then featured, then newest
    qs = qs.select_related('dealer__plan')
    qs_priority = qs.filter(dealer__plan__priority_ranking=True)
    qs_free = qs.exclude(dealer__plan__priority_ranking=True)
    combined = list(qs_priority.order_by('-is_featured', '-created_at')[:40]) + list(qs_free.order_by('-is_featured', '-created_at')[:20])
    serializer = PublicVehicleSerializer(combined[:60], many=True)
    return Response({'results': serializer.data, 'count': qs.count()})


# ─── LEADS ────────────────────────────────────────────────────────

class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = Lead.objects.filter(dealer=dealer).select_related('vehicle','vehicle__brand')
        status_f  = self.request.query_params.get('status')
        source_f  = self.request.query_params.get('source')
        search    = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if status_f:  qs = qs.filter(status=status_f)
        if source_f:  qs = qs.filter(source=source_f)
        if search:    qs = qs.filter(Q(customer_name__icontains=search)|Q(phone__icontains=search)|Q(email__icontains=search)|Q(notes__icontains=search))
        if date_from: qs = qs.filter(created_at__date__gte=date_from)
        if date_to:   qs = qs.filter(created_at__date__lte=date_to)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(dealer=self.request.user.dealer_profile)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        lead = self.get_object()
        lead.status = request.data.get('status', lead.status)
        lead.save()
        return Response(LeadSerializer(lead).data)


# ─── SALES ────────────────────────────────────────────────────────

class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # Sales are immutable once created

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = Sale.objects.filter(dealer=dealer).select_related('vehicle','vehicle__brand')
        search    = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if search:    qs = qs.filter(Q(customer_name__icontains=search)|Q(invoice_number__icontains=search)|Q(customer_phone__icontains=search)|Q(vehicle__model_name__icontains=search))
        if date_from: qs = qs.filter(sale_date__date__gte=date_from)
        if date_to:   qs = qs.filter(sale_date__date__lte=date_to)
        return qs.order_by('-sale_date')

    def perform_create(self, serializer):
        dealer = self.request.user.dealer_profile
        vehicle = serializer.validated_data['vehicle']
        quantity = serializer.validated_data.get('quantity', 1)
        if vehicle.stock_quantity < quantity:
            raise ValidationError({'vehicle': f'Insufficient stock. Available: {vehicle.stock_quantity}'})
        inv_no = 'INV-' + uuid.uuid4().hex[:8].upper()
        sale = serializer.save(dealer=dealer, invoice_number=inv_no)
        # Decrement stock
        vehicle.stock_quantity -= sale.quantity
        vehicle.save()

    @action(detail=True, methods=['get'])
    def invoice(self, request, pk=None):
        sale = self.get_object()
        dealer = sale.dealer
        return Response({
            'invoice_number': sale.invoice_number,
            'sale_date':      sale.sale_date,
            # Dealer info + invoice branding
            'dealer': {
                'dealer_name':        dealer.dealer_name,
                'address':            dealer.address,
                'city':               dealer.city,
                'state':              getattr(dealer, 'state', dealer.city),
                'phone':              dealer.phone,
                'gstin':              dealer.gstin,
                'sales_manager_name': getattr(dealer, 'sales_manager_name', 'Authorised Signatory') or 'Authorised Signatory',
                'bank_name':          getattr(dealer, 'bank_name', 'HDFC Bank Ltd.') or 'HDFC Bank Ltd.',
                'bank_account_number':getattr(dealer, 'bank_account_number', '') or '',
                'bank_ifsc':          getattr(dealer, 'bank_ifsc', '') or '',
                'bank_upi':           getattr(dealer, 'bank_upi', '') or '',
                'invoice_footer_note':getattr(dealer, 'invoice_footer_note', '') or '',
            },
            # Customer info
            'customer_name':    sale.customer_name,
            'customer_phone':   sale.customer_phone,
            'customer_email':   sale.customer_email,
            'customer_address': sale.customer_address,
            'customer_gstin':   sale.customer_gstin,
            # Vehicle identification (RTO & insurance)
            'vehicle_name':         f"{sale.vehicle.brand} {sale.vehicle.model_name}",
            'vehicle_hsn':          sale.vehicle.hsn_code or '8703',
            'vehicle_fuel_type':    sale.vehicle.get_fuel_type_display() if hasattr(sale.vehicle, 'get_fuel_type_display') else sale.vehicle.fuel_type,
            'vehicle_seating':      sale.vehicle.seating_capacity,
            'chassis_number':          sale.chassis_number,
            'engine_number':           sale.engine_number,
            'vehicle_color':           sale.vehicle_color,
            'year_of_manufacture':     sale.year_of_manufacture,
            # Battery & warranty
            'battery_count':           sale.battery_count or 1,
            'battery_serial_numbers':  [s.strip() for s in sale.battery_serial_number.split('\n') if s.strip()] if sale.battery_serial_number else [],
            'battery_serial_number':   sale.battery_serial_number,
            'battery_capacity_ah':     sale.battery_capacity_ah,
            'battery_make':            sale.battery_make,
            'battery_warranty_months': sale.battery_warranty_months,
            'motor_serial_number':     sale.motor_serial_number,
            'vehicle_warranty_months': sale.vehicle_warranty_months,
            # Finance/Loan details
            'financer_details':        sale.financer_details,
            # GST fields
            'place_of_supply': sale.place_of_supply or dealer.city,
            'unit_price':    float(sale.sale_price),
            'quantity':      sale.quantity,
            'subtotal':      float(sale.subtotal),
            'cgst_rate':     float(sale.cgst_rate),
            'cgst_amount':   float(sale.cgst_amount),
            'sgst_rate':     float(sale.sgst_rate),
            'sgst_amount':   float(sale.sgst_amount),
            'total_amount':  float(sale.total_amount),
            'payment_method': sale.payment_method,
        })


# ─── CUSTOMERS ────────────────────────────────────────────────────

class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = Customer.objects.filter(dealer=dealer)
        search    = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if search:    qs = qs.filter(Q(name__icontains=search)|Q(phone__icontains=search))
        if date_from: qs = qs.filter(created_at__date__gte=date_from)
        if date_to:   qs = qs.filter(created_at__date__lte=date_to)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(dealer=self.request.user.dealer_profile)


# ─── TASKS ────────────────────────────────────────────────────────

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = Task.objects.filter(dealer=dealer)
        completed = self.request.query_params.get('completed')
        if completed == 'false': qs = qs.filter(is_completed=False)
        if completed == 'true':  qs = qs.filter(is_completed=True)
        return qs.order_by('is_completed', 'due_date')

    def perform_create(self, serializer):
        serializer.save(dealer=self.request.user.dealer_profile)


# ─── FINANCE ──────────────────────────────────────────────────────

class FinanceLoanViewSet(viewsets.ModelViewSet):
    serializer_class = FinanceLoanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = FinanceLoan.objects.filter(dealer=dealer)
        search    = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if search:    qs = qs.filter(Q(customer_name__icontains=search))
        if date_from: qs = qs.filter(applied_date__date__gte=date_from)
        if date_to:   qs = qs.filter(applied_date__date__lte=date_to)
        return qs.order_by('-applied_date')

    def perform_create(self, serializer):
        serializer.save(dealer=self.request.user.dealer_profile)


@api_view(['POST'])
@permission_classes([AllowAny])
def emi_calculator(request):
    principal = float(request.data.get('principal', 0))
    rate = float(request.data.get('rate', 12)) / 100 / 12
    tenure = int(request.data.get('tenure', 36))
    if rate == 0:
        emi = principal / tenure
    else:
        emi = principal * rate * (1 + rate)**tenure / ((1 + rate)**tenure - 1)
    total_payment = emi * tenure
    total_interest = total_payment - principal
    return Response({
        'emi': round(emi, 2),
        'total_payment': round(total_payment, 2),
        'total_interest': round(total_interest, 2),
        'principal': principal,
        'tenure': tenure,
        'rate': float(request.data.get('rate', 12)),
    })


# ─── BRANDS ───────────────────────────────────────────────────────

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer

    def get_permissions(self):
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [AllowAny()]
        return [IsAuthenticated()]


# ─── REPORTS ──────────────────────────────────────────────────────

@api_view(['GET'])
def reports(request):
    dealer = request.user.dealer_profile
    period = request.query_params.get('period', 'month')
    now = timezone.now()

    if period == 'week':
        start = now - timedelta(days=7)
    elif period == 'year':
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0)

    _line_total = ExpressionWrapper(F('sale_price') * F('quantity'), output_field=DecimalField(max_digits=14, decimal_places=2))

    sales = Sale.objects.filter(dealer=dealer, sale_date__gte=start)
    revenue = sales.annotate(line_total=_line_total).aggregate(total=Sum('line_total'))['total'] or 0
    sale_count = sales.count()

    leads = Lead.objects.filter(dealer=dealer, created_at__gte=start)
    lead_count = leads.count()
    converted = leads.filter(status='converted').count()
    conversion_rate = round(converted / lead_count * 100, 1) if lead_count else 0

    fuel_sales = sales.annotate(line_total=_line_total).values('vehicle__fuel_type').annotate(
        count=Count('id'), revenue=Sum('line_total')
    )

    return Response({
        'period': period,
        'revenue': float(revenue),
        'sale_count': sale_count,
        'lead_count': lead_count,
        'converted_leads': converted,
        'conversion_rate': conversion_rate,
        'fuel_sales': list(fuel_sales),
        'avg_sale_value': float(revenue / sale_count) if sale_count else 0,
    })


# ─── PUBLIC DEALER DIRECTORY ───────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def dealer_list(request):
    """Public listing of verified dealers, searchable by city/state."""
    qs = DealerProfile.objects.filter(is_verified=True).prefetch_related('reviews', 'vehicles')
    city   = request.query_params.get('city')
    state  = request.query_params.get('state')
    search = request.query_params.get('search')
    if city:   qs = qs.filter(city__icontains=city)
    if state:  qs = qs.filter(state__icontains=state)
    if search: qs = qs.filter(Q(dealer_name__icontains=search) | Q(city__icontains=search))
    return Response({
        'results': PublicDealerSerializer(qs[:30], many=True).data,
        'count':   qs.count(),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def dealer_detail(request, dealer_id):
    """Public dealer profile with vehicles and reviews."""
    try:
        dealer = DealerProfile.objects.prefetch_related('reviews', 'vehicles').get(pk=dealer_id, is_verified=True)
    except DealerProfile.DoesNotExist:
        return Response({'error': 'Dealer not found'}, status=status.HTTP_404_NOT_FOUND)
    vehicles = Vehicle.objects.filter(dealer=dealer, is_active=True, stock_status__in=['in_stock', 'low_stock']).select_related('brand')
    reviews  = dealer.reviews.all()[:10]
    return Response({
        'dealer':   PublicDealerSerializer(dealer).data,
        'vehicles': PublicVehicleSerializer(vehicles, many=True).data,
        'reviews':  DealerReviewSerializer(reviews, many=True).data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_dealer_review(request, dealer_id):
    """Submit a review for a dealer (public, no auth required)."""
    try:
        dealer = DealerProfile.objects.get(pk=dealer_id, is_verified=True)
    except DealerProfile.DoesNotExist:
        return Response({'error': 'Dealer not found'}, status=status.HTTP_404_NOT_FOUND)
    ser = DealerReviewSerializer(data=request.data)
    if ser.is_valid():
        review = ser.save(dealer=dealer)
        # Auto-create a Lead so the dealer sees this activity in their CRM
        Lead.objects.get_or_create(
            dealer=dealer,
            customer_name=review.reviewer_name or 'Anonymous',
            phone=review.reviewer_phone or '',
            defaults={
                'source': 'review',
                'notes': f"Left a {review.rating}\u2605 review: {(review.comment or '')[:200]}",
                'status': 'new',
            }
        )
        return Response(ser.data, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── DEALER APPLICATION (become a dealer) ─────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def apply_dealer(request):
    """Submit an application to become a listed dealer."""
    ser = DealerApplicationSerializer(data=request.data)
    if ser.is_valid():
        ser.save()
        return Response({
            'message': 'Application submitted. Our team will contact you within 24 hours.',
            'data': ser.data,
        }, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── PUBLIC ENQUIRY (no auth, works from homepage / marketplace) ──

@api_view(['POST'])
@permission_classes([AllowAny])
def public_enquiry(request):
    """
    Accept a visitor enquiry from the public marketplace.
    - Vehicle-specific enquiry  → assigned to that vehicle's dealer only.
    - General enquiry (no vehicle) → broadcast to ALL verified dealers in the
      same city (or all verified dealers if no city match), creating a lead in
      each dealer's CRM so every relevant dealer can follow up.
    No authentication required.
    """
    customer_name = request.data.get('customer_name', '').strip()
    phone         = request.data.get('phone', '').strip()

    if not customer_name:
        return Response({'customer_name': 'Name is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not phone:
        return Response({'phone': 'Mobile number is required.'}, status=status.HTTP_400_BAD_REQUEST)

    vehicle_id = request.data.get('vehicle')
    city       = request.data.get('city', '').strip()
    notes      = request.data.get('notes', '').strip()

    vehicle = None
    primary_dealer = None          # for the PublicEnquiry record
    broadcast_dealers = []         # all dealers to receive a lead

    # 1. Vehicle-specific enquiry → assign to that vehicle's dealer only
    if vehicle_id:
        vehicle = Vehicle.objects.filter(pk=vehicle_id, is_active=True).first()
        if vehicle:
            primary_dealer = vehicle.dealer
            broadcast_dealers = [primary_dealer] if primary_dealer else []

    # 2. General enquiry (no vehicle) → broadcast to all matching dealers
    if not vehicle_id:
        if city:
            broadcast_dealers = list(
                DealerProfile.objects.filter(is_verified=True, city__icontains=city)
            )
        # Also include dealers whose city wasn't matched, fall back to ALL verified
        if not broadcast_dealers:
            broadcast_dealers = list(DealerProfile.objects.filter(is_verified=True))
        primary_dealer = broadcast_dealers[0] if broadcast_dealers else None

    # Create the canonical PublicEnquiry record (linked to primary dealer for admin view)
    enquiry = PublicEnquiry.objects.create(
        customer_name=customer_name,
        phone=phone,
        city=city,
        vehicle=vehicle,
        dealer=primary_dealer,
        notes=notes,
    )

    # Create a Lead in every matching dealer's CRM
    vehicle_label = str(vehicle) if vehicle else ''
    for dealer in broadcast_dealers:
        lead_notes = notes or ''
        if vehicle_label:
            lead_notes = f"Enquired about {vehicle_label}. {lead_notes}".strip()
        elif city:
            lead_notes = f"General enquiry from {city}. {lead_notes}".strip()
        Lead.objects.get_or_create(
            dealer=dealer,
            customer_name=customer_name,
            phone=phone,
            defaults={
                'source': 'marketplace',
                'notes': lead_notes,
                'status': 'new',
            }
        )

    # Notify all matching dealers — fire-and-forget
    vehicle_name = str(vehicle) if vehicle else 'eRickshaw (general enquiry)'
    for dealer in broadcast_dealers:
        try:
            from api.emails import send_public_enquiry_notification
            dealer_email = dealer.user.email
            if dealer_email and dealer.notify_email:
                send_public_enquiry_notification(
                    dealer_email=dealer_email,
                    dealer_name=dealer.dealer_name,
                    customer_name=customer_name,
                    customer_phone=phone,
                    city=city,
                    vehicle_name=vehicle_name,
                    notes=notes,
                )
        except Exception:
            pass

        try:
            from api.notifications import notify_dealer_new_lead
            if dealer.phone and dealer.notify_whatsapp:
                notify_dealer_new_lead(
                    dealer_name=dealer.dealer_name,
                    dealer_phone=dealer.phone,
                    customer_name=customer_name,
                    customer_phone=phone,
                    vehicle_name=vehicle_name,
                )
        except Exception:
            pass

    return Response({'message': 'Enquiry submitted! A dealer will call you within 24 hours.'}, status=status.HTTP_201_CREATED)


# ─── DEALER ENQUIRIES (authenticated dealers see their assigned public enquiries) ──

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def dealer_enquiries(request):
    """
    GET:  Return public enquiries assigned to this dealer (newest first, max 100).
    PATCH: Mark an enquiry as processed. Body: { "id": <int>, "is_processed": true }
    """
    dealer = getattr(request.user, 'dealer_profile', None)
    if not dealer:
        return Response({'error': 'Dealer profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        enquiry_id = request.data.get('id')
        is_processed = request.data.get('is_processed', True)
        try:
            enq = PublicEnquiry.objects.get(pk=enquiry_id, dealer=dealer)
            enq.is_processed = is_processed
            enq.save(update_fields=['is_processed'])
            return Response({'id': enq.id, 'is_processed': enq.is_processed})
        except PublicEnquiry.DoesNotExist:
            return Response({'error': 'Enquiry not found.'}, status=status.HTTP_404_NOT_FOUND)

    qs = PublicEnquiry.objects.filter(dealer=dealer).select_related('vehicle', 'vehicle__brand').order_by('-created_at')
    # Filters
    date_from = request.query_params.get('date_from')
    date_to   = request.query_params.get('date_to')
    search    = request.query_params.get('search')
    show_unprocessed = request.query_params.get('unprocessed')
    if date_from: qs = qs.filter(created_at__date__gte=date_from)
    if date_to:   qs = qs.filter(created_at__date__lte=date_to)
    if search:    qs = qs.filter(Q(customer_name__icontains=search) | Q(phone__icontains=search) | Q(city__icontains=search))
    if show_unprocessed == '1': qs = qs.filter(is_processed=False)
    total = qs.count()
    # Pagination
    page_size = int(request.query_params.get('page_size', 20))
    page      = int(request.query_params.get('page', 1))
    start = (page - 1) * page_size
    qs = qs[start:start + page_size]
    data = [{
        'id': e.id,
        'customer_name': e.customer_name,
        'phone': e.phone,
        'city': e.city,
        'notes': e.notes,
        'vehicle': str(e.vehicle) if e.vehicle else None,
        'vehicle_id': e.vehicle_id,
        'is_processed': e.is_processed,
        'created_at': e.created_at.isoformat(),
    } for e in qs]
    return Response({'results': data, 'count': total, 'page': page, 'page_size': page_size, 'total_pages': (total + page_size - 1) // page_size if page_size else 1})


# ─── PLATFORM STATS (public) ──────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def platform_stats(request):
    """Aggregate numbers shown on the public homepage."""
    return Response({
        'dealer_count':  DealerProfile.objects.filter(is_verified=True).count(),
        'vehicle_count': Vehicle.objects.filter(is_active=True).count(),
        'city_count':    DealerProfile.objects.filter(is_verified=True).values('city').distinct().count(),
    })


# ─── DEALER UNREAD COUNT (bell icon) ──────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dealer_unread_count(request):
    """Return count of unread (unprocessed) public enquiries for bell icon."""
    dealer = getattr(request.user, 'dealer_profile', None)
    if not dealer:
        return Response({'unread': 0})
    count = PublicEnquiry.objects.filter(dealer=dealer, is_processed=False).count()
    return Response({'unread': count})


# ─── ADMIN PORTAL APIs ────────────────────────────────────────────

def _is_admin(user):
    return user.is_superuser or user.is_staff or getattr(getattr(user, 'profile', None), 'user_type', '') == 'admin'


def admin_required(func):
    """Decorator: ensures request.user is a platform admin."""
    from functools import wraps
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or not _is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        return func(request, *args, **kwargs)
    return wrapper


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """Platform-wide stats for admin dashboard."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    from django.db.models import Sum
    return Response({
        'total_dealers':       DealerProfile.objects.count(),
        'verified_dealers':    DealerProfile.objects.filter(is_verified=True).count(),
        'total_vehicles':      Vehicle.objects.filter(is_active=True).count(),
        'total_leads':         Lead.objects.count(),
        'total_sales':         Sale.objects.count(),
        'total_enquiries':     PublicEnquiry.objects.count(),
        'unprocessed_enquiries': PublicEnquiry.objects.filter(is_processed=False).count(),
        'pending_applications':DealerApplication.objects.filter(status='pending').count(),
        'total_revenue':       Sale.objects.aggregate(r=Sum('sale_price'))['r'] or 0,
        'total_users':         User.objects.count(),
    })


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_users(request, user_id=None):
    """List all users or delete a specific user."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    if request.method == 'DELETE' and user_id:
        try:
            u = User.objects.get(pk=user_id)
            if u.is_superuser:
                return Response({'error': 'Cannot delete superuser.'}, status=status.HTTP_400_BAD_REQUEST)
            u.delete()
            return Response({'message': 'User deleted.'})
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    # GET: list users with pagination
    search = request.query_params.get('search', '')
    user_type = request.query_params.get('user_type', '')
    qs = User.objects.select_related('profile', 'dealer_profile').order_by('-date_joined')
    if search:
        qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search))
    page_size = int(request.query_params.get('page_size', 20))
    page      = int(request.query_params.get('page', 1))
    total     = qs.count()
    qs = qs[(page-1)*page_size : page*page_size]
    data = []
    for u in qs:
        profile = getattr(u, 'profile', None)
        dealer  = getattr(u, 'dealer_profile', None)
        utype   = profile.user_type if profile else ('dealer' if dealer else 'driver')
        if user_type and utype != user_type:
            continue
        data.append({
            'id': u.id, 'username': u.username, 'email': u.email,
            'user_type': utype, 'is_superuser': u.is_superuser,
            'is_active': u.is_active,
            'date_joined': u.date_joined.isoformat(),
            'dealer_name': dealer.dealer_name if dealer else None,
            'dealer_city': dealer.city if dealer else None,
            'is_verified': dealer.is_verified if dealer else None,
        })
    return Response({'results': data, 'count': total, 'total_pages': (total + page_size - 1) // page_size})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def admin_dealers(request, dealer_id=None):
    """List all dealers or update a specific dealer (verify/suspend)."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    if request.method == 'PATCH' and dealer_id:
        try:
            dealer = DealerProfile.objects.get(pk=dealer_id)
            if 'is_verified' in request.data:
                dealer.is_verified = bool(request.data['is_verified'])
            if 'plan_type' in request.data:
                dealer.plan_type = request.data['plan_type']
            dealer.save()
            return Response({'id': dealer.id, 'is_verified': dealer.is_verified, 'plan_type': dealer.plan_type})
        except DealerProfile.DoesNotExist:
            return Response({'error': 'Dealer not found.'}, status=status.HTTP_404_NOT_FOUND)
    # GET: list all dealers
    search = request.query_params.get('search', '')
    city   = request.query_params.get('city', '')
    verified = request.query_params.get('verified', '')
    qs = DealerProfile.objects.select_related('user').order_by('-created_at')
    if search:   qs = qs.filter(Q(dealer_name__icontains=search) | Q(phone__icontains=search))
    if city:     qs = qs.filter(city__icontains=city)
    if verified == '1': qs = qs.filter(is_verified=True)
    if verified == '0': qs = qs.filter(is_verified=False)
    page_size = int(request.query_params.get('page_size', 20))
    page      = int(request.query_params.get('page', 1))
    total     = qs.count()
    qs = qs[(page-1)*page_size : page*page_size]
    data = [{
        'id': d.id, 'dealer_name': d.dealer_name, 'phone': d.phone,
        'city': d.city, 'state': d.state, 'gstin': d.gstin,
        'is_verified': d.is_verified, 'plan_type': d.plan_type,
        'plan_expires_at': d.plan_expires_at.isoformat() if d.plan_expires_at else None,
        'created_at': d.created_at.isoformat(),
        'username': d.user.username, 'email': d.user.email,
        'vehicle_count': d.vehicles.filter(is_active=True).count(),
    } for d in qs]
    return Response({'results': data, 'count': total, 'total_pages': (total + page_size - 1) // page_size})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def admin_applications(request, app_id=None):
    """List all dealer applications or approve/reject one."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    if request.method == 'PATCH' and app_id:
        try:
            app = DealerApplication.objects.get(pk=app_id)
            new_status = request.data.get('status')
            if new_status in ('pending', 'approved', 'rejected'):
                app.status = new_status
                app.save(update_fields=['status'])
            return Response({'id': app.id, 'status': app.status})
        except DealerApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)
    # GET: list applications
    app_status = request.query_params.get('status', '')
    search     = request.query_params.get('search', '')
    qs = DealerApplication.objects.order_by('-applied_at')
    if app_status: qs = qs.filter(status=app_status)
    if search:     qs = qs.filter(Q(dealer_name__icontains=search) | Q(phone__icontains=search) | Q(email__icontains=search))
    page_size = int(request.query_params.get('page_size', 20))
    page      = int(request.query_params.get('page', 1))
    total     = qs.count()
    qs = qs[(page-1)*page_size : page*page_size]
    data = [{
        'id': a.id, 'dealer_name': a.dealer_name, 'contact_name': a.contact_name,
        'phone': a.phone, 'email': a.email, 'city': a.city, 'state': a.state,
        'gstin': a.gstin, 'message': a.message, 'status': a.status,
        'applied_at': a.applied_at.isoformat(),
    } for a in qs]
    return Response({'results': data, 'count': total, 'total_pages': (total + page_size - 1) // page_size})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_enquiries(request):
    """List ALL public enquiries across all dealers (admin only)."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    search    = request.query_params.get('search', '')
    date_from = request.query_params.get('date_from', '')
    date_to   = request.query_params.get('date_to', '')
    qs = PublicEnquiry.objects.select_related('dealer', 'vehicle').order_by('-created_at')
    if search:    qs = qs.filter(Q(customer_name__icontains=search) | Q(phone__icontains=search))
    if date_from: qs = qs.filter(created_at__date__gte=date_from)
    if date_to:   qs = qs.filter(created_at__date__lte=date_to)
    page_size = int(request.query_params.get('page_size', 20))
    page      = int(request.query_params.get('page', 1))
    total     = qs.count()
    qs = qs[(page-1)*page_size : page*page_size]
    data = [{
        'id': e.id, 'customer_name': e.customer_name, 'phone': e.phone,
        'city': e.city, 'notes': e.notes,
        'vehicle': str(e.vehicle) if e.vehicle else None,
        'dealer_name': e.dealer.dealer_name if e.dealer else None,
        'is_processed': e.is_processed,
        'created_at': e.created_at.isoformat(),
    } for e in qs]
    return Response({'results': data, 'count': total, 'total_pages': (total + page_size - 1) // page_size})


# ─── NOTIFICATION PREFERENCES ─────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def notification_preferences(request):
    """Get or update the dealer's notification preferences."""
    try:
        dealer = request.user.dealer_profile
    except DealerProfile.DoesNotExist:
        return Response({'error': 'Dealer profile not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            'notify_email':    dealer.notify_email,
            'notify_whatsapp': dealer.notify_whatsapp,
            'notify_push':     dealer.notify_push,
        })

    # PATCH — update preferences
    allowed = {'notify_email', 'notify_whatsapp', 'notify_push'}
    updated = {}
    for field in allowed:
        if field in request.data:
            val = request.data[field]
            if isinstance(val, bool):
                setattr(dealer, field, val)
                updated[field] = val
    dealer.save(update_fields=list(updated.keys()) or ['notify_email'])
    return Response({
        'notify_email':    dealer.notify_email,
        'notify_whatsapp': dealer.notify_whatsapp,
        'notify_push':     dealer.notify_push,
        'message': 'Preferences updated.',
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_fcm_token(request):
    """Update FCM device token for push notifications."""
    token = request.data.get('fcm_token', '').strip()
    if not token:
        return Response({'error': 'fcm_token required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        profile = request.user.profile
        profile.fcm_token = token
        profile.save(update_fields=['fcm_token'])
        return Response({'message': 'FCM token updated.'})
    except Exception:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)


# ─── VIDEO RESOURCES ──────────────────────────────────────────────

class VideoResourceViewSet(viewsets.ModelViewSet):
    serializer_class = VideoResourceSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return VideoResource.objects.filter(is_public=True).order_by('-created_at')
        if user.is_superuser or user.is_staff:
            return VideoResource.objects.all().order_by('-created_at')
        try:
            dealer = user.dealerprofile
            return VideoResource.objects.filter(
                Q(is_public=True) | Q(dealer=dealer)
            ).order_by('-created_at')
        except Exception:
            return VideoResource.objects.filter(is_public=True).order_by('-created_at')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        try:
            dealer = self.request.user.dealerprofile
        except Exception:
            dealer = None
        serializer.save(dealer=dealer)


class BlogPostViewSet(viewsets.ModelViewSet):
    serializer_class = BlogPostSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return BlogPost.objects.filter(is_published=True).order_by('-created_at')
        if user.is_superuser or user.is_staff:
            return BlogPost.objects.all().order_by('-created_at')
        try:
            dealer = user.dealerprofile
            return BlogPost.objects.filter(
                Q(is_published=True) | Q(dealer=dealer)
            ).order_by('-created_at')
        except Exception:
            return BlogPost.objects.filter(is_published=True).order_by('-created_at')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        try:
            dealer = self.request.user.dealerprofile
        except Exception:
            dealer = None
        serializer.save(dealer=dealer)


@api_view(['GET'])
@permission_classes([AllowAny])
def plans_list(request):
    """List all available plans."""
    from .models import Plan
    plans = Plan.objects.filter(is_active=True).order_by('price')
    data = []
    for p in plans:
        data.append({
            'id': p.id,
            'name': p.name,
            'slug': p.slug,
            'price': str(p.price),
            'listing_limit': p.listing_limit,
            'priority_ranking': p.priority_ranking,
            'featured_badge': p.featured_badge,
            'whatsapp_alerts': p.whatsapp_alerts,
            'analytics_access': p.analytics_access,
            'yearly_subscription': p.yearly_subscription,
            'max_dealers': p.max_dealers,
            'signups_count': p.signups_count,
            'is_available': p.is_available,
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upgrade_plan(request):
    """Upgrade dealer to Early Dealer plan."""
    from .models import Plan
    try:
        dealer = request.user.dealer_profile
    except Exception:
        return Response({'error': 'Dealer profile not found.'}, status=404)

    plan_slug = request.data.get('plan_slug', Plan.SLUG_EARLY)
    try:
        target_plan = Plan.objects.get(slug=plan_slug, is_active=True)
    except Plan.DoesNotExist:
        return Response({'error': 'Plan not found.'}, status=404)

    if not target_plan.is_available:
        return Response({
            'error': f'The {target_plan.name} is no longer available (maximum {target_plan.max_dealers} dealers reached). Please contact support.'
        }, status=400)

    if dealer.plan and dealer.plan.slug == plan_slug:
        return Response({'error': f'You are already on the {target_plan.name}.'}, status=400)

    from datetime import timedelta
    dealer.plan = target_plan
    dealer.plan_type = 'pro' if plan_slug != Plan.SLUG_FREE else 'free'
    dealer.plan_started_at = timezone.now()
    dealer.plan_expires_at = timezone.now() + timedelta(days=365) if target_plan.yearly_subscription else None
    dealer.save()

    return Response({
        'message': f'Successfully upgraded to {target_plan.name}!',
        'plan_name': target_plan.name,
        'plan_slug': target_plan.slug,
        'expires_at': dealer.plan_expires_at.isoformat() if dealer.plan_expires_at else None,
        'listing_limit': target_plan.listing_limit,
    })


# ─── PASSWORD RESET ───────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reset_dealer_password(request, dealer_id):
    """Super admin resets a dealer's password. Returns temp password if none provided."""
    try:
        dealer = DealerProfile.objects.get(id=dealer_id)
    except DealerProfile.DoesNotExist:
        return Response({'error': 'Dealer not found'}, status=404)
    new_password = request.data.get('new_password', '').strip()
    if len(new_password) < 6:
        new_password = ''.join(__import__('random').choices(
            __import__('string').ascii_letters + __import__('string').digits, k=10))
    dealer.user.set_password(new_password)
    dealer.user.save()
    return Response({'success': True, 'new_password': new_password,
                     'dealer_name': dealer.dealer_name, 'username': dealer.user.username})


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Send a 6-digit OTP to the dealer's registered email for password reset."""
    import random, string as _s
    from django.core.cache import cache
    from django.core.mail import send_mail

    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required'}, status=400)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Don't reveal whether email exists
        return Response({'success': True, 'message': 'If this email is registered, an OTP has been sent.'})

    otp = ''.join(random.choices(_s.digits, k=6))
    cache.set(f'pwd_otp_{email}', {'otp': otp, 'uid': user.id}, timeout=600)

    try:
        send_mail(
            subject='eRickshawDekho — Password Reset OTP',
            message=(
                f'Hello {user.first_name or user.username},\n\n'
                f'Your OTP for password reset is:\n\n  {otp}\n\n'
                f'This OTP is valid for 10 minutes.\n\n'
                f'If you did not request this, please ignore this email.\n\n'
                f'— eRickshawDekho Team'
            ),
            from_email='noreply@erikshawdekho.com',
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass

    return Response({'success': True, 'message': 'If this email is registered, an OTP has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_confirm(request):
    """Verify OTP and set new password."""
    from django.core.cache import cache

    email    = request.data.get('email', '').strip().lower()
    otp      = request.data.get('otp', '').strip()
    new_pass = request.data.get('new_password', '').strip()

    if not email or not otp or not new_pass:
        return Response({'error': 'email, otp, and new_password are required'}, status=400)
    if len(new_pass) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=400)
    if not any(c.isdigit() for c in new_pass):
        return Response({'error': 'Password must contain at least one number'}, status=400)

    stored = cache.get(f'pwd_otp_{email}')
    if not stored or stored['otp'] != otp:
        return Response({'error': 'Invalid or expired OTP. Please request a new one.'}, status=400)

    try:
        user = User.objects.get(id=stored['uid'])
        user.set_password(new_pass)
        user.save()
        cache.delete(f'pwd_otp_{email}')
        return Response({'success': True, 'message': 'Password reset successfully. Please sign in with your new password.'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)


# ─── ADMIN TOGGLE USER ACTIVE ──────────────────────────────────────

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_toggle_user_active(request, user_id):
    if not request.user.is_superuser:
        return Response({"error": "Admin only"}, status=403)
    try:
        target = User.objects.get(pk=user_id)
        target.is_active = not target.is_active
        target.save(update_fields=["is_active"])
        return Response({"id": target.id, "is_active": target.is_active})
    except User.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


# ─── ADMIN CREATE USER ─────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_create_user(request):
    """Admin can create dealer, driver, or staff accounts."""
    if not request.user.is_superuser:
        return Response({"error": "Admin only"}, status=403)

    user_type = request.data.get("user_type", "dealer")  # dealer, staff
    email     = request.data.get("email", "").strip().lower()
    phone     = request.data.get("phone", "").strip()
    name      = request.data.get("name", "").strip()
    password  = request.data.get("password", "")
    city      = request.data.get("city", "").strip()
    state     = request.data.get("state", "").strip()

    if not email or not password or not name:
        return Response({"error": "name, email, password are required"}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return Response({"error": "Email already in use"}, status=400)

    # Auto-generate username
    import re as _re
    base = _re.sub(r'[^a-zA-Z0-9]', '', email.split('@')[0]).lower()[:20] or 'user'
    username = base
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}{counter}"; counter += 1

    user = User.objects.create_user(username=username, email=email, password=password)
    if user_type == "staff":
        user.is_staff = True
        user.save(update_fields=["is_staff"])

    from .models import Plan
    dealer = DealerProfile.objects.create(
        user=user,
        dealer_name=name,
        phone=phone,
        city=city,
        state=state,
        is_verified=(user_type == "staff"),
    )
    # Assign free plan
    try:
        free_plan = Plan.objects.get(slug="free")
        dealer.plan = free_plan
        dealer.save(update_fields=["plan"])
    except Plan.DoesNotExist:
        pass

    return Response({
        "id": user.id,
        "username": username,
        "email": email,
        "user_type": user_type,
        "dealer_id": dealer.id,
    }, status=201)


# ─── DEALER API KEYS ───────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def dealer_api_keys(request):
    from django.shortcuts import get_object_or_404
    dealer = get_object_or_404(DealerProfile, user=request.user)
    if request.method == "GET":
        keys = DealerAPIKey.objects.filter(dealer=dealer)
        data = [{"id": k.id, "service": k.service, "service_label": k.get_service_display(),
                 "display_name": k.display_name, "api_key": "●●●●" + k.api_key[-4:] if len(k.api_key) > 4 else "●●●●",
                 "is_active": k.is_active, "extra_config": k.extra_config} for k in keys]
        return Response(data)
    # POST — create or update
    service = request.data.get("service")
    api_key = request.data.get("api_key", "")
    api_secret = request.data.get("api_secret", "")
    extra = request.data.get("extra_config", {})
    display_name = request.data.get("display_name", "")
    obj, created = DealerAPIKey.objects.update_or_create(
        dealer=dealer, service=service,
        defaults={"api_key": api_key, "api_secret": api_secret, "extra_config": extra,
                  "display_name": display_name, "is_active": True}
    )
    return Response({"id": obj.id, "service": obj.service, "created": created}, status=201 if created else 200)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def dealer_api_key_delete(request, key_id):
    from django.shortcuts import get_object_or_404
    dealer = get_object_or_404(DealerProfile, user=request.user)
    get_object_or_404(DealerAPIKey, pk=key_id, dealer=dealer).delete()
    return Response(status=204)


# ─── PLATFORM SETTINGS ─────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def platform_settings(request):
    s = PlatformSettings.get()
    return Response({
        "support_phone": s.support_phone,
        "support_whatsapp": s.support_whatsapp,
        "support_email": s.support_email,
        "support_name": s.support_name,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def marketing_send(request):
    """
    Send a marketing campaign (WhatsApp / SMS / Email) to a list of contacts.
    Requires the corresponding API key to be configured in dealer settings.
    """
    channel  = request.data.get("channel", "").lower()        # whatsapp | sms | email
    message  = request.data.get("message", "").strip()
    contacts = request.data.get("contacts", [])               # list of numbers or emails

    if channel not in ("whatsapp", "sms", "email"):
        return Response({"error": "Invalid channel. Use whatsapp, sms, or email."}, status=status.HTTP_400_BAD_REQUEST)
    if not message:
        return Response({"error": "Message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
    if not contacts:
        return Response({"error": "No contacts provided."}, status=status.HTTP_400_BAD_REQUEST)

    dealer = request.user.dealer_profile

    # Map channel → required API service key
    service_map = {"whatsapp": "whatsapp_business", "sms": "twilio", "email": "sendgrid"}
    service_id  = service_map[channel]

    api_key_obj = DealerAPIKey.objects.filter(dealer=dealer, service=service_id, is_active=True).first()
    if not api_key_obj:
        service_labels = {"whatsapp": "WhatsApp Business", "sms": "Twilio SMS", "email": "SendGrid"}
        return Response(
            {"error": f"{service_labels[channel]} API key not configured. Add it in Settings → API Keys."},
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    sent, failed = 0, 0
    errors = []

    for contact in contacts:
        contact = contact.strip()
        if not contact:
            continue
        try:
            if channel == "whatsapp":
                from api.notifications import send_whatsapp_message
                send_whatsapp_message(to=contact, message=message, api_key=api_key_obj.api_key)
            elif channel == "sms":
                from api.notifications import send_sms_message
                send_sms_message(to=contact, message=message,
                                 account_sid=api_key_obj.api_key, auth_token=api_key_obj.api_secret)
            elif channel == "email":
                from api.emails import send_marketing_email
                send_marketing_email(to=contact, subject=f"Message from {dealer.dealer_name}",
                                     body=message, api_key=api_key_obj.api_key)
            sent += 1
        except Exception as e:
            failed += 1
            errors.append(str(e))

    return Response({
        "sent": sent,
        "failed": failed,
        "total": len(contacts),
        "errors": errors[:5],  # Return first 5 errors for diagnosis
        "message": f"Campaign sent to {sent} of {len(contacts)} contacts.",
    })


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_update_settings(request):
    if not request.user.is_superuser:
        return Response({"error": "Admin only"}, status=403)
    s = PlatformSettings.get()
    for field in ["support_phone", "support_whatsapp", "support_email", "support_name", "homepage_intro_video_url"]:
        if field in request.data:
            setattr(s, field, request.data[field])
    s.save()
    return Response({"status": "ok"})
