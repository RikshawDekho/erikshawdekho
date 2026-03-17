import uuid
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
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

from .models import (
    DealerProfile, Brand, Vehicle, Lead, Sale, Customer, Task, FinanceLoan,
    DealerApplication, DealerReview, UserProfile, PublicEnquiry, VideoResource,
    BlogPost, DealerAPIKey, PlatformSettings, FinancerProfile, FinancerDocument,
    CustomerProfile, FinancerPlan, FinancerSubscription, FinancerDealerAssociation,
    FinancerRequiredDocument, FinanceApplication, FinanceApplicationDocument,
    FinanceApplicationRemark, Plan,
)
from .serializers import (
    VehicleSerializer, VehicleListSerializer, LeadSerializer, SaleSerializer,
    CustomerSerializer, TaskSerializer, FinanceLoanSerializer, BrandSerializer,
    DealerProfileSerializer, RegisterSerializer, DriverRegisterSerializer,
    DealerApplicationSerializer, DealerReviewSerializer,
    PublicDealerSerializer, PublicVehicleSerializer, VideoResourceSerializer,
    BlogPostSerializer, FinancerProfileSerializer, FinancerDocumentSerializer,
    FinancerRegisterSerializer, CustomerRegisterSerializer, PublicFinancerSerializer,
)


def _jwt_response(user):
    """Return JWT access + refresh tokens as a dict."""
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _platform_name():
    return getattr(settings, 'PLATFORM_NAME', 'eRickshawDekho')


def _platform_team_name():
    return getattr(settings, 'PLATFORM_TEAM_NAME', f'{_platform_name()} Team')


def _support_email():
    return getattr(settings, 'SUPPORT_EMAIL', 'support@erikshawdekho.com')


def _platform_from_email():
    return getattr(
        settings,
        'PLATFORM_NOREPLY_EMAIL',
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@erikshawdekho.com')
    )


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
        # Auto-create or update pending DealerApplication so admin sees new registrations
        DealerApplication.objects.update_or_create(
            email=user.email,
            defaults={
                'dealer_name': dealer.dealer_name,
                'contact_name': user.get_full_name() or user.username,
                'phone': dealer.phone,
                'city': dealer.city,
                'state': getattr(dealer, 'state', ''),
                'status': 'pending',
            }
        )
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
        return Response({"error": f"Your account has been deactivated. Please contact {_support_email()}"}, status=403)
    dealer = getattr(user, 'dealer_profile', None)
    profile = getattr(user, 'profile', None)
    profile_type = profile.user_type if profile else None

    # Superuser is always admin.
    # is_staff is admin ONLY if they have no explicit non-admin profile
    # (prevents financers/drivers who were accidentally given is_staff from being misidentified)
    NON_ADMIN_TYPES = {'financer', 'customer', 'driver'}
    if user.is_superuser:
        user_type = 'admin'
    elif profile_type in NON_ADMIN_TYPES:
        user_type = profile_type
    elif user.is_staff:
        user_type = 'admin'
    elif profile_type:
        user_type = profile_type
    else:
        user_type = 'dealer' if dealer else 'driver'
    return Response({
        **_jwt_response(user),
        'user': {
            'id': user.id, 'username': user.username, 'email': user.email,
            'first_name': user.first_name, 'last_name': user.last_name,
            'user_type': user_type,
        },
        'dealer': {
            'id':    dealer.id if dealer else None,
            'name':  dealer.dealer_name if dealer else username,
            'city':  dealer.city if dealer else '',
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

    profile = getattr(user, 'profile', None)
    if user.is_superuser or user.is_staff:
        user_type = 'admin'
    elif profile:
        user_type = profile.user_type
    else:
        user_type = 'dealer' if dealer else 'driver'

    return Response({
        'user': {
            'id': user.id, 'username': user.username, 'email': user.email,
            'first_name': user.first_name, 'last_name': user.last_name,
            'user_type': user_type,
            'is_superuser': user.is_superuser,
        },
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
@permission_classes([IsAuthenticated])
def dashboard(request):
    try:
        dealer = request.user.dealer_profile
    except (AttributeError, DealerProfile.DoesNotExist):
        return Response(
            {'error': 'Only dealer users can access dashboard'},
            status=403
        )

    try:
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

        recent_leads = Lead.objects.filter(dealer=dealer, is_deleted=False).order_by('-created_at')[:5]
        upcoming_deliveries = Sale.objects.filter(
            dealer=dealer, is_deleted=False, is_delivered=False, delivery_date__gte=date.today()
        ).order_by('delivery_date')[:5]
        upcoming_tasks = Task.objects.filter(
            dealer=dealer, is_completed=False
        ).order_by('due_date')[:5]

        # Sales chart last 7 days — single query grouped by date
        from django.db.models.functions import TruncDate
        chart_start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0)
        chart_rows = (
            Sale.objects.filter(dealer=dealer, is_deleted=False, sale_date__gte=chart_start)
            .annotate(day=TruncDate('sale_date'), line_total=_line_total)
            .values('day')
            .annotate(revenue=Sum('line_total'), count=Count('id'))
        )
        chart_by_day = {row['day'].strftime('%b %d'): row for row in chart_rows}
        sales_chart = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            label = day.strftime('%b %d')
            row = chart_by_day.get(label, {})
            sales_chart.append({
                'date': label,
                'revenue': float(row.get('revenue') or 0),
                'count': row.get('count') or 0,
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
                'listing_limit': dealer.plan.listing_limit if dealer.plan else 5,
                'listing_count': Vehicle.objects.filter(dealer=dealer, is_active=True).count(),
            },
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to load dashboard: {str(e)}'},
            status=500
        )


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
        qs = Lead.objects.filter(dealer=dealer, is_deleted=False).select_related('vehicle','vehicle__brand')
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

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_deleted', 'deleted_at'])

    def perform_create(self, serializer):
        dealer = self.request.user.dealer_profile
        # Enforce free tier lead limit (20 lifetime leads)
        FREE_LEAD_LIMIT = 20
        if dealer.plan_type == 'free' and dealer.lifetime_lead_count >= FREE_LEAD_LIMIT:
            raise ValidationError({
                'limit': f'Free tier limit reached ({FREE_LEAD_LIMIT} lifetime leads). Upgrade to Pro for unlimited leads.'
            })
        lead = serializer.save(dealer=dealer)
        # Increment lifetime counter
        DealerProfile.objects.filter(pk=dealer.pk).update(
            lifetime_lead_count=F('lifetime_lead_count') + 1
        )
        return lead

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
        qs = Sale.objects.filter(dealer=dealer, is_deleted=False).select_related('vehicle','vehicle__brand')
        search    = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if search:    qs = qs.filter(Q(customer_name__icontains=search)|Q(invoice_number__icontains=search)|Q(customer_phone__icontains=search)|Q(vehicle__model_name__icontains=search))
        if date_from: qs = qs.filter(sale_date__date__gte=date_from)
        if date_to:   qs = qs.filter(sale_date__date__lte=date_to)
        return qs.order_by('-sale_date')

    def perform_create(self, serializer):
        dealer = self.request.user.dealer_profile
        # Enforce free tier invoice limit (20 lifetime invoices)
        FREE_INVOICE_LIMIT = 20
        if dealer.plan_type == 'free' and dealer.invoice_count >= FREE_INVOICE_LIMIT:
            raise ValidationError({
                'limit': f'Free tier limit reached ({FREE_INVOICE_LIMIT} invoices). Upgrade to Pro for unlimited invoices.'
            })
        vehicle = serializer.validated_data['vehicle']
        quantity = serializer.validated_data.get('quantity', 1)
        if vehicle.stock_quantity < quantity:
            raise ValidationError({'vehicle': f'Insufficient stock. Available: {vehicle.stock_quantity}'})
        inv_no = 'INV-' + uuid.uuid4().hex[:8].upper()
        sale = serializer.save(dealer=dealer, invoice_number=inv_no)

        # Increment invoice counter
        DealerProfile.objects.filter(pk=dealer.pk).update(
            invoice_count=F('invoice_count') + 1
        )

        # Auto-mark linked lead as converted
        if sale.lead:
            sale.lead.status = 'converted'
            sale.lead.save(update_fields=['status'])

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
            'payment_method':          sale.payment_method,
            'down_payment':            float(sale.down_payment) if sale.down_payment else None,
            'loan_amount_financed':    float(sale.loan_amount_financed) if sale.loan_amount_financed else None,
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
        })


# ─── CUSTOMERS ────────────────────────────────────────────────────

class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = Customer.objects.filter(dealer=dealer, is_deleted=False)
        search    = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if search:    qs = qs.filter(Q(name__icontains=search)|Q(phone__icontains=search))
        if date_from: qs = qs.filter(created_at__date__gte=date_from)
        if date_to:   qs = qs.filter(created_at__date__lte=date_to)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(dealer=self.request.user.dealer_profile)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_deleted', 'deleted_at'])


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
    from django.db.models import Avg as _Avg, Count as _Count
    qs = DealerProfile.objects.filter(is_verified=True).annotate(
        _avg_rating=_Avg('reviews__rating'),
        _review_count=_Count('reviews', distinct=True),
        _vehicle_count=_Count('vehicles', filter=Q(vehicles__is_active=True, vehicles__stock_status__in=['in_stock','low_stock']), distinct=True),
    )
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
    Accept a targeted visitor enquiry from the public marketplace / homepage.
    From v3: brand and dealer selection are mandatory so the lead goes to ONE specific dealer.
    Fallback broadcast is preserved for legacy API calls without dealer.
    """
    customer_name = request.data.get('customer_name', '').strip()
    phone         = request.data.get('phone', '').strip()
    pincode       = request.data.get('pincode', '').strip()
    brand_name    = request.data.get('brand_name', '').strip()
    dealer_id     = request.data.get('dealer')
    vehicle_id    = request.data.get('vehicle')
    city          = request.data.get('city', '').strip()
    notes         = request.data.get('notes', '').strip()
    email         = request.data.get('email', '').strip()

    if not customer_name:
        return Response({'customer_name': 'Name is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not phone:
        return Response({'phone': 'Mobile number is required.'}, status=status.HTTP_400_BAD_REQUEST)

    vehicle = None
    primary_dealer = None
    broadcast_dealers = []

    # Resolve vehicle
    if vehicle_id:
        vehicle = Vehicle.objects.filter(pk=vehicle_id, is_active=True).first()
        if vehicle and not primary_dealer:
            primary_dealer = vehicle.dealer

    # Targeted: dealer explicitly selected by driver
    if dealer_id:
        primary_dealer = DealerProfile.objects.filter(pk=dealer_id, is_verified=True).first()
        if primary_dealer:
            broadcast_dealers = [primary_dealer]

    # Fallback broadcast when no dealer selected (legacy / general enquiry)
    if not broadcast_dealers:
        if vehicle and vehicle.dealer:
            broadcast_dealers = [vehicle.dealer]
            primary_dealer = vehicle.dealer
        elif city:
            broadcast_dealers = list(DealerProfile.objects.filter(is_verified=True, city__icontains=city))
            if not broadcast_dealers:
                broadcast_dealers = list(DealerProfile.objects.filter(is_verified=True))
            primary_dealer = broadcast_dealers[0] if broadcast_dealers else None
        else:
            broadcast_dealers = list(DealerProfile.objects.filter(is_verified=True))
            primary_dealer = broadcast_dealers[0] if broadcast_dealers else None

    # Create canonical PublicEnquiry record
    enquiry = PublicEnquiry.objects.create(
        customer_name=customer_name,
        phone=phone,
        pincode=pincode,
        city=city,
        brand_name=brand_name,
        vehicle=vehicle,
        dealer=primary_dealer,
        notes=notes,
    )

    # Create a Lead in every matching dealer's CRM
    FREE_ENQUIRY_LIMIT = 20
    vehicle_label = str(vehicle) if vehicle else ''
    for dealer in broadcast_dealers:
        # Skip free-tier dealers who have hit their lifetime enquiry limit
        if dealer.plan_type == 'free' and dealer.lifetime_enquiry_count >= FREE_ENQUIRY_LIMIT:
            continue

        lead_notes = notes or ''
        if vehicle_label:
            lead_notes = f"Enquired about {vehicle_label}. {lead_notes}".strip()
        elif city:
            lead_notes = f"General enquiry from {city}. {lead_notes}".strip()

        _, created = Lead.objects.get_or_create(
            dealer=dealer,
            customer_name=customer_name,
            phone=phone,
            vehicle=vehicle,
            defaults={
                'source': 'marketplace',
                'notes': lead_notes,
                'status': 'new',
                'email': email,
            }
        )
        if created:
            # Track enquiry count for free tier limit
            DealerProfile.objects.filter(pk=dealer.pk).update(
                lifetime_enquiry_count=F('lifetime_enquiry_count') + 1,
                lifetime_lead_count=F('lifetime_lead_count') + 1,
            )

    # Notify dealers (fire-and-forget)
    vehicle_name = str(vehicle) if vehicle else (f"{_platform_name()} enquiry — " + (brand_name or 'General'))
    for dealer in broadcast_dealers:
        try:
            from api.emails import send_public_enquiry_notification
            dealer_email = dealer.user.email
            if dealer_email and dealer.notify_email:
                send_public_enquiry_notification(
                    dealer_email=dealer_email, dealer_name=dealer.dealer_name,
                    customer_name=customer_name, customer_phone=phone,
                    city=city, vehicle_name=vehicle_name, notes=notes,
                )
        except Exception:
            pass
        try:
            from api.notifications import notify_dealer_new_lead
            if dealer.phone and dealer.notify_whatsapp:
                notify_dealer_new_lead(dealer.dealer_name, dealer.phone, customer_name, phone, vehicle_name)
        except Exception:
            pass

    return Response({'message': 'Enquiry submitted! The dealer will contact you within 24 hours.'}, status=status.HTTP_201_CREATED)


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
        'total_financers':     FinancerProfile.objects.count(),
        'verified_financers':  FinancerProfile.objects.filter(is_verified=True).count(),
        'free_trial_dealers':  DealerProfile.objects.filter(plan_type='free').count(),
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
    # Apply user_type filter at DB level so pagination counts are accurate
    if user_type == 'dealer':
        qs = qs.filter(dealer_profile__isnull=False)
    elif user_type == 'driver':
        qs = qs.filter(profile__user_type='driver')
    elif user_type == 'financer':
        qs = qs.filter(profile__user_type='financer')
    elif user_type == 'customer':
        qs = qs.filter(profile__user_type='customer')
    elif user_type == 'admin':
        qs = qs.filter(Q(is_superuser=True) | Q(is_staff=True))
    page_size = int(request.query_params.get('page_size', 20))
    page      = int(request.query_params.get('page', 1))
    total     = qs.count()
    qs = qs[(page-1)*page_size : page*page_size]
    data = []
    for u in qs:
        profile = getattr(u, 'profile', None)
        dealer  = getattr(u, 'dealer_profile', None)
        utype   = profile.user_type if profile else ('dealer' if dealer else 'driver')
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
    from django.db.models import Count as _Count
    qs = DealerProfile.objects.select_related('user').annotate(
        vehicle_count=_Count('vehicles', filter=Q(vehicles__is_active=True))
    ).order_by('-created_at')
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
        'vehicle_count': d.vehicle_count,
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
@permission_classes([IsAuthenticated])
def admin_reset_dealer_password(request, dealer_id):
    """Super admin resets a dealer's password. Returns temp password if none provided."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin only'}, status=403)
    try:
        dealer = DealerProfile.objects.get(id=dealer_id)
    except DealerProfile.DoesNotExist:
        return Response({'error': 'Dealer not found'}, status=404)
    new_password = request.data.get('new_password', '').strip()
    auto_generated = len(new_password) < 6
    if auto_generated:
        new_password = ''.join(__import__('random').choices(
            __import__('string').ascii_letters + __import__('string').digits, k=10))
    dealer.user.set_password(new_password)
    dealer.user.save()
    return Response({'success': True, 'new_password': new_password,
                     'auto_generated': auto_generated,
                     'dealer_name': dealer.dealer_name, 'username': dealer.user.username,
                     'message': 'Password reset. Share the new password securely with the dealer.'})


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
            subject=f'{_platform_name()} — Password Reset OTP',
            message=(
                f'Hello {user.first_name or user.username},\n\n'
                f'Your OTP for password reset is:\n\n  {otp}\n\n'
                f'This OTP is valid for 10 minutes.\n\n'
                f'If you did not request this, please ignore this email.\n\n'
                f'— {_platform_team_name()}'
            ),
            from_email=_platform_from_email(),
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


# ─── FIREBASE PHONE OTP — PASSWORD RESET ──────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_phone(request):
    """
    Verify a Firebase phone-auth ID token and reset the user's password.
    Flow:
      1. Frontend uses Firebase JS SDK to send SMS OTP to user's phone.
      2. User enters OTP → Firebase returns an ID token.
      3. Frontend POSTs {firebase_id_token, new_password, phone} here.
      4. We verify the token with Firebase Admin SDK and look up the user by phone.
    """
    import os
    firebase_id_token = request.data.get('firebase_id_token', '').strip()
    new_password      = request.data.get('new_password', '').strip()
    phone             = request.data.get('phone', '').strip()

    if not firebase_id_token or not new_password:
        return Response({'error': 'firebase_id_token and new_password are required'}, status=400)
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=400)
    if not any(c.isdigit() for c in new_password):
        return Response({'error': 'Password must contain at least one number'}, status=400)

    # Verify the Firebase ID token
    try:
        import firebase_admin
        from firebase_admin import credentials, auth as fb_auth

        firebase_app = None
        try:
            firebase_app = firebase_admin.get_app()
        except ValueError:
            # Initialize from service account JSON path or credentials JSON in env
            cred_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
            cred_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON_CONTENT')
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
            elif cred_json:
                import json as _json
                cred = credentials.Certificate(_json.loads(cred_json))
            else:
                return Response({'error': 'Firebase not configured on server. Contact support.'}, status=503)
            firebase_app = firebase_admin.initialize_app(cred)

        decoded_token = fb_auth.verify_id_token(firebase_id_token, app=firebase_app)
        verified_phone = decoded_token.get('phone_number', '')
    except Exception as e:
        return Response({'error': f'Firebase token verification failed: {str(e)}'}, status=400)

    # Look up user by phone number (check both UserProfile.phone and User.username)
    lookup_phone = phone or verified_phone
    if not lookup_phone:
        return Response({'error': 'Phone number could not be determined from token.'}, status=400)

    # Normalise: strip +91 prefix for comparison
    def norm_phone(p):
        p = p.strip()
        if p.startswith('+91'): p = p[3:]
        if p.startswith('91') and len(p) == 12: p = p[2:]
        return p.lstrip('+')

    norm = norm_phone(lookup_phone)
    from .models import UserProfile as _UP
    profile = (
        _UP.objects.filter(phone=lookup_phone).first()
        or _UP.objects.filter(phone=norm).first()
        or _UP.objects.filter(phone=f'+91{norm}').first()
    )
    if not profile:
        return Response({'error': 'No account found for this phone number. Please register first.'}, status=404)

    user = profile.user
    user.set_password(new_password)
    user.save()
    return Response({'success': True, 'message': 'Password reset successfully. Please sign in with your new password.'})


# ─── ADMIN TOGGLE USER ACTIVE ──────────────────────────────────────

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_toggle_user_active(request, user_id):
    if not _is_admin(request.user):
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
    if not _is_admin(request.user):
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

    dealer_id = None
    if user_type in ("dealer", "staff"):
        from .models import Plan
        dealer = DealerProfile.objects.create(
            user=user,
            dealer_name=name,
            phone=phone,
            city=city,
            state=state,
            is_verified=(user_type == "staff"),
        )
        try:
            free_plan = Plan.objects.get(slug="free")
            dealer.plan = free_plan
            dealer.save(update_fields=["plan"])
        except Plan.DoesNotExist:
            pass
        dealer_id = dealer.id
    else:
        # driver / financer / customer — create a UserProfile only
        UserProfile.objects.create(user=user, user_type=user_type, phone=phone, city=city)

    return Response({
        "id": user.id,
        "username": username,
        "email": email,
        "user_type": user_type,
        "dealer_id": dealer_id,
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
    service_map = {"whatsapp": "whatsapp_business", "sms": "twilio", "email": "gmail_smtp"}
    service_id  = service_map[channel]

    api_key_obj = DealerAPIKey.objects.filter(dealer=dealer, service=service_id, is_active=True).first()
    if not api_key_obj:
        service_labels = {"whatsapp": "WhatsApp Business", "sms": "Twilio SMS", "email": "Gmail SMTP"}
        return Response(
            {"error": f"{service_labels[channel]} API key not configured. Add it in Settings → API Keys."},
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    sent, failed = 0, 0
    errors = []

    extra_cfg = api_key_obj.extra_config or {}

    for contact in contacts:
        contact = contact.strip()
        if not contact:
            continue
        try:
            if channel == "whatsapp":
                from api.notifications import send_whatsapp_message
                send_whatsapp_message(
                    to=contact, message=message,
                    api_key=api_key_obj.api_key, api_secret=api_key_obj.api_secret,
                    extra_config=extra_cfg,
                )
            elif channel == "sms":
                from api.notifications import send_sms_message
                send_sms_message(
                    to=contact, message=message,
                    account_sid=api_key_obj.api_key, auth_token=api_key_obj.api_secret,
                    extra_config=extra_cfg,
                )
            elif channel == "email":
                from api.notifications import send_marketing_email
                send_marketing_email(to=contact, subject=f"Message from {dealer.dealer_name}",
                                     body=message, api_key=api_key_obj.api_secret,
                                     smtp_user=api_key_obj.api_key)
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
    if not _is_admin(request.user):
        return Response({"error": "Admin only"}, status=403)
    s = PlatformSettings.get()
    for field in ["support_phone", "support_whatsapp", "support_email", "support_name", "homepage_intro_video_url"]:
        if field in request.data:
            setattr(s, field, request.data[field])
    s.save()
    return Response({"status": "ok"})


# ─── FINANCER REGISTRATION & PROFILE ──────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register_financer(request):
    """Register a financer/NBFC account."""
    throttle = AuthThrottle()
    if not throttle.allow_request(request, None):
        return Response({'error': 'Too many requests.'}, status=429)
    ser = FinancerRegisterSerializer(data=request.data)
    if ser.is_valid():
        user = ser.save()
        financer = user.financer_profile
        return Response({
            **_jwt_response(user),
            'user': {'id': user.id, 'username': user.username, 'email': user.email, 'user_type': 'financer'},
            'financer': {'id': financer.id, 'company_name': financer.company_name, 'city': financer.city},
        }, status=201)
    return Response(ser.errors, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_customer(request):
    """Register a customer/buyer account."""
    throttle = AuthThrottle()
    if not throttle.allow_request(request, None):
        return Response({'error': 'Too many requests.'}, status=429)
    ser = CustomerRegisterSerializer(data=request.data)
    if ser.is_valid():
        user = ser.save()
        cust = user.customer_profile
        return Response({
            **_jwt_response(user),
            'user': {'id': user.id, 'username': user.username, 'email': user.email, 'user_type': 'customer'},
            'customer': {'id': cust.id, 'full_name': cust.full_name, 'city': cust.city},
        }, status=201)
    return Response(ser.errors, status=400)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def financer_profile(request):
    """Get or update the authenticated financer's profile."""
    try:
        fp = request.user.financer_profile
    except (AttributeError, FinancerProfile.DoesNotExist):
        return Response({'error': 'Not a financer account'}, status=403)
    if request.method == 'PATCH':
        ser = FinancerProfileSerializer(fp, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=400)
    return Response(FinancerProfileSerializer(fp).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def financer_documents(request):
    """List or upload documents for financer onboarding."""
    try:
        fp = request.user.financer_profile
    except (AttributeError, FinancerProfile.DoesNotExist):
        return Response({'error': 'Not a financer account'}, status=403)
    if request.method == 'POST':
        ser = FinancerDocumentSerializer(data=request.data)
        if ser.is_valid():
            ser.save(financer=fp)
            return Response(ser.data, status=201)
        return Response(ser.errors, status=400)
    docs = fp.documents.all()
    return Response(FinancerDocumentSerializer(docs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_financers(request):
    """Public list of verified financers for the ecosystem page."""
    qs = FinancerProfile.objects.filter(is_verified=True).order_by('-created_at')
    city = request.query_params.get('city', '')
    if city:
        qs = qs.filter(city__icontains=city)
    return Response(PublicFinancerSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def vehicle_detail_public(request, vehicle_id):
    """Full public vehicle detail with dealer and specs."""
    try:
        v = Vehicle.objects.select_related('dealer', 'brand').get(pk=vehicle_id, is_active=True)
    except Vehicle.DoesNotExist:
        return Response({'error': 'Vehicle not found'}, status=404)
    return Response(PublicVehicleSerializer(v).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def vehicles_compare(request):
    """Compare up to 4 vehicles side-by-side."""
    ids_param = request.query_params.get('ids', '')
    try:
        ids = [int(x) for x in ids_param.split(',') if x.strip()][:4]
    except ValueError:
        return Response({'error': 'Invalid vehicle IDs'}, status=400)
    if not ids:
        return Response({'error': 'Provide vehicle IDs via ?ids=1,2,3'}, status=400)
    vehicles = Vehicle.objects.filter(pk__in=ids, is_active=True).select_related('dealer', 'brand')
    return Response(PublicVehicleSerializer(vehicles, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def dealers_by_brand(request):
    """List dealers that carry vehicles of a specific brand, ordered by rating."""
    brand_id = request.query_params.get('brand_id', '')
    brand_name = request.query_params.get('brand', '')
    if not brand_id and not brand_name:
        return Response({'error': 'Provide brand_id or brand parameter'}, status=400)
    # Find dealers with vehicles of this brand
    vq = Vehicle.objects.filter(is_active=True)
    if brand_id:
        vq = vq.filter(brand_id=brand_id)
    elif brand_name:
        vq = vq.filter(brand__name__icontains=brand_name)
    dealer_ids = vq.values_list('dealer_id', flat=True).distinct()
    dealers = DealerProfile.objects.filter(id__in=dealer_ids, is_verified=True)
    data = PublicDealerSerializer(dealers, many=True).data
    # Sort by avg_rating descending
    data.sort(key=lambda d: float(d.get('avg_rating') or 0), reverse=True)
    return Response({'results': data, 'count': len(data)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def free_tier_usage(request):
    """Return current usage vs free-tier limits for the authenticated dealer."""
    try:
        dealer = request.user.dealer_profile
    except (AttributeError, DealerProfile.DoesNotExist):
        return Response({'error': 'Dealer only'}, status=403)
    is_free = dealer.plan_type == 'free'
    return Response({
        'plan_type': dealer.plan_type,
        'is_free': is_free,
        'listings': {'used': dealer.vehicles.filter(is_active=True).count(), 'limit': 5 if is_free else None},
        'leads': {'used': dealer.lifetime_lead_count, 'limit': 20 if is_free else None},
        'invoices': {'used': dealer.invoice_count, 'limit': 20 if is_free else None},
        'enquiries': {'used': dealer.lifetime_enquiry_count, 'limit': 20 if is_free else None},
        'marketing': {'allowed': not is_free},
        'analytics': {'allowed': not is_free},
        'financer_tab': {'allowed': not is_free},
    })


# ═══════════════════════════════════════════════════════════════════
# FINANCER ECOSYSTEM — DEALER ASSOCIATIONS
# ═══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financer_dealer_list(request):
    """
    Financer sees all admin-verified dealers.
    Shows association status (pending/approved/rejected/none) for each.
    """
    try:
        fp = request.user.financer_profile
    except (AttributeError, FinancerProfile.DoesNotExist):
        return Response({'error': 'Not a financer account'}, status=403)

    search = request.query_params.get('search', '')
    city   = request.query_params.get('city', '')
    status_filter = request.query_params.get('status', '')

    dealers = DealerProfile.objects.filter(is_verified=True).select_related('user')
    if search: dealers = dealers.filter(Q(dealer_name__icontains=search) | Q(city__icontains=search))
    if city:   dealers = dealers.filter(city__icontains=city)

    # Build association map for this financer
    assoc_map = {
        a.dealer_id: a
        for a in FinancerDealerAssociation.objects.filter(financer=fp)
    }

    result = []
    for d in dealers:
        assoc = assoc_map.get(d.id)
        assoc_status = assoc.status if assoc else None
        if status_filter and assoc_status != status_filter:
            continue
        result.append({
            'id': d.id,
            'dealer_name': d.dealer_name,
            'city': d.city,
            'state': d.state,
            'phone': d.phone,
            'is_verified': d.is_verified,
            'vehicle_count': d.vehicles.filter(is_active=True).count(),
            'association_id': assoc.id if assoc else None,
            'association_status': assoc_status,
        })

    return Response({'results': result, 'count': len(result)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def financer_approve_dealer(request, dealer_id):
    """Financer approves or rejects a dealer who applied to work with them."""
    try:
        fp = request.user.financer_profile
    except (AttributeError, FinancerProfile.DoesNotExist):
        return Response({'error': 'Not a financer account'}, status=403)

    try:
        dealer = DealerProfile.objects.get(pk=dealer_id, is_verified=True)
    except DealerProfile.DoesNotExist:
        return Response({'error': 'Dealer not found or not verified'}, status=404)

    new_status = request.data.get('status')  # approved | rejected | suspended
    if new_status not in ('approved', 'rejected', 'suspended'):
        return Response({'error': 'status must be approved, rejected, or suspended'}, status=400)

    assoc, created = FinancerDealerAssociation.objects.get_or_create(financer=fp, dealer=dealer)

    # Enforce plan limit: free=2, pro=unlimited (0)
    if new_status == 'approved' and (created or assoc.status != 'approved'):
        sub = getattr(fp, 'subscription', None)
        plan = sub.plan if sub else None
        max_allowed = getattr(plan, 'max_dealer_associations', 3) if plan else 3
        if max_allowed > 0:  # 0 = unlimited
            current_approved = FinancerDealerAssociation.objects.filter(
                financer=fp, status='approved'
            ).exclude(pk=assoc.pk).count()
            if current_approved >= max_allowed:
                return Response({
                    'error': f'Your current plan allows maximum {max_allowed} approved dealer(s). '
                             f'Contact admin to upgrade your plan.'
                }, status=400)

    assoc.status = new_status
    assoc.reviewed_at = timezone.now()
    assoc.notes = request.data.get('notes', '')
    assoc.save()

    return Response({
        'message': f'Dealer {dealer.dealer_name} {new_status}.',
        'association_id': assoc.id,
        'status': assoc.status,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dealer_apply_to_financer(request, financer_id):
    """Dealer applies to work with a financer (submits association request)."""
    try:
        dealer = request.user.dealer_profile
    except (AttributeError, DealerProfile.DoesNotExist):
        return Response({'error': 'Not a dealer account'}, status=403)

    if not dealer.is_verified:
        return Response({'error': 'Your dealer account must be verified by admin before applying to a financer.'}, status=403)

    try:
        fp = FinancerProfile.objects.get(pk=financer_id, is_verified=True)
    except FinancerProfile.DoesNotExist:
        return Response({'error': 'Financer not found or not verified'}, status=404)

    assoc, created = FinancerDealerAssociation.objects.get_or_create(
        financer=fp, dealer=dealer,
        defaults={'status': 'pending'}
    )
    if not created and assoc.status == 'rejected':
        assoc.status = 'pending'
        assoc.reviewed_at = None
        assoc.save()

    return Response({
        'message': f'Application sent to {fp.company_name}. Awaiting their approval.',
        'association_id': assoc.id,
        'status': assoc.status,
    }, status=201 if created else 200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dealer_financer_list(request):
    """
    Dealer sees all verified financers plus their association status.
    """
    try:
        dealer = request.user.dealer_profile
    except (AttributeError, DealerProfile.DoesNotExist):
        return Response({'error': 'Not a dealer account'}, status=403)

    financers = FinancerProfile.objects.filter(is_verified=True).order_by('company_name')
    assoc_map = {
        a.financer_id: a
        for a in FinancerDealerAssociation.objects.filter(dealer=dealer)
    }

    result = []
    for fp in financers:
        assoc = assoc_map.get(fp.id)
        result.append({
            'id': fp.id,
            'company_name': fp.company_name,
            'city': fp.city,
            'state': fp.state,
            'phone': fp.phone,
            'interest_rate_min': str(fp.interest_rate_min),
            'interest_rate_max': str(fp.interest_rate_max),
            'min_loan_amount': str(fp.min_loan_amount),
            'max_loan_amount': str(fp.max_loan_amount),
            'processing_fee_pct': str(fp.processing_fee_pct),
            'association_id': assoc.id if assoc else None,
            'association_status': assoc.status if assoc else None,
        })

    return Response({'results': result, 'count': len(result)})


# ═══════════════════════════════════════════════════════════════════
# FINANCER DOCUMENT REQUIREMENTS
# ═══════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def financer_required_documents(request):
    """
    GET:  Financer gets list of required document types they've set.
    POST: Financer adds a required document type.
    """
    try:
        fp = request.user.financer_profile
    except (AttributeError, FinancerProfile.DoesNotExist):
        return Response({'error': 'Not a financer account'}, status=403)

    if request.method == 'POST':
        doc_type    = request.data.get('doc_type', '').strip()
        description = request.data.get('description', '').strip()
        is_mandatory = request.data.get('is_mandatory', True)

        valid_types = [c[0] for c in FinancerRequiredDocument.DOC_TYPES]
        if doc_type not in valid_types:
            return Response({'error': f'Invalid doc_type. Choose from: {valid_types}'}, status=400)

        obj, created = FinancerRequiredDocument.objects.get_or_create(
            financer=fp, doc_type=doc_type,
            defaults={'description': description, 'is_mandatory': bool(is_mandatory)}
        )
        if not created:
            obj.description = description
            obj.is_mandatory = bool(is_mandatory)
            obj.save()

        return Response({
            'id': obj.id, 'doc_type': obj.doc_type,
            'doc_type_label': obj.get_doc_type_display(),
            'description': obj.description,
            'is_mandatory': obj.is_mandatory,
        }, status=201 if created else 200)

    docs = FinancerRequiredDocument.objects.filter(financer=fp)
    data = [{
        'id': d.id, 'doc_type': d.doc_type,
        'doc_type_label': d.get_doc_type_display(),
        'description': d.description,
        'is_mandatory': d.is_mandatory,
    } for d in docs]
    return Response(data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def financer_required_document_delete(request, doc_id):
    """Financer removes a required document type."""
    try:
        fp = request.user.financer_profile
    except (AttributeError, FinancerProfile.DoesNotExist):
        return Response({'error': 'Not a financer account'}, status=403)
    try:
        FinancerRequiredDocument.objects.get(pk=doc_id, financer=fp).delete()
    except FinancerRequiredDocument.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    return Response(status=204)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dealer_financer_requirements(request, financer_id):
    """Dealer fetches the list of documents required by a specific financer."""
    try:
        fp = FinancerProfile.objects.get(pk=financer_id)
    except FinancerProfile.DoesNotExist:
        return Response({'error': 'Financer not found'}, status=404)

    docs = FinancerRequiredDocument.objects.filter(financer=fp)
    data = [{
        'id': d.id, 'doc_type': d.doc_type,
        'doc_type_label': d.get_doc_type_display(),
        'description': d.description,
        'is_mandatory': d.is_mandatory,
    } for d in docs]
    return Response(data)


# ═══════════════════════════════════════════════════════════════════
# FINANCE APPLICATIONS (Dealer → Financer workflow)
# ═══════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def dealer_finance_applications(request):
    """
    GET:  Dealer lists their own finance applications.
    POST: Dealer creates a new finance application (draft or submit directly).
    """
    try:
        dealer = request.user.dealer_profile
    except (AttributeError, DealerProfile.DoesNotExist):
        return Response({'error': 'Not a dealer account'}, status=403)

    if request.method == 'POST':
        data = request.data
        financer_id = data.get('financer')
        if not financer_id:
            return Response({'error': 'financer is required'}, status=400)
        try:
            fp = FinancerProfile.objects.get(pk=financer_id, is_verified=True)
        except FinancerProfile.DoesNotExist:
            return Response({'error': 'Financer not found or not verified'}, status=404)

        # Check association is approved
        assoc = FinancerDealerAssociation.objects.filter(financer=fp, dealer=dealer, status='approved').first()
        if not assoc:
            return Response({
                'error': f'You must first apply to {fp.company_name} and be approved before submitting applications.'
            }, status=403)

        # Enforce financer plan application limit (only when submitting, not saving as draft)
        if data.get('submit'):
            try:
                sub = fp.subscription
                max_apps = sub.plan.max_finance_applications if sub else 5
                if max_apps > 0:  # 0 = unlimited
                    used = FinanceApplication.objects.filter(
                        financer=fp, status__in=['submitted', 'under_review', 'approved', 'disbursed']
                    ).count()
                    if used >= max_apps:
                        return Response({
                            'error': f'{fp.company_name} has reached their plan limit of {max_apps} finance applications. '
                                     f'They need to upgrade to process more.'
                        }, status=400)
            except Exception:
                # No subscription → treat as free plan (max 5)
                used = FinanceApplication.objects.filter(
                    financer=fp, status__in=['submitted', 'under_review', 'approved', 'disbursed']
                ).count()
                if used >= 5:
                    return Response({
                        'error': f'{fp.company_name} has reached the Free Trial limit of 5 applications.'
                    }, status=400)

        vehicle_id = data.get('vehicle')
        vehicle = Vehicle.objects.filter(pk=vehicle_id, dealer=dealer).first() if vehicle_id else None

        app = FinanceApplication.objects.create(
            dealer=dealer,
            financer=fp,
            vehicle=vehicle,
            customer_name=data.get('customer_name', '').strip(),
            customer_phone=data.get('customer_phone', '').strip(),
            customer_email=data.get('customer_email', '').strip(),
            customer_address=data.get('customer_address', '').strip(),
            customer_aadhaar=data.get('customer_aadhaar', '').strip(),
            customer_pan=data.get('customer_pan', '').strip(),
            vehicle_price=data.get('vehicle_price') or None,
            loan_amount=data.get('loan_amount', 0),
            down_payment=data.get('down_payment', 0),
            tenure_months=int(data.get('tenure_months', 36)),
            status='submitted' if data.get('submit') else 'draft',
        )
        if data.get('submit'):
            app.submitted_at = timezone.now()
            app.save(update_fields=['submitted_at'])

            # Increment financer subscription applications_used
            try:
                sub = fp.subscription
                sub.applications_used = FinanceApplication.objects.filter(
                    financer=fp, status__in=['submitted', 'under_review', 'approved', 'disbursed']
                ).count()
                sub.save(update_fields=['applications_used'])
            except Exception:
                pass

            # Push notification to financer
            try:
                from api.notifications import send_push_notification
                financer_profile_obj = fp
                financer_token = getattr(getattr(financer_profile_obj.user, 'profile', None), 'fcm_token', None)
                if financer_token:
                    send_push_notification(
                        fcm_token=financer_token,
                        title='New Finance Application 🔔',
                        body=f'{dealer.dealer_name} submitted an application for {app.customer_name}',
                        data={'type': 'finance_application', 'app_id': str(app.id)}
                    )
            except Exception:
                pass

        return Response({
            'id': app.id,
            'status': app.status,
            'message': 'Application submitted to financer.' if data.get('submit') else 'Draft saved.'
        }, status=201)

    # GET — list applications for this dealer
    search    = request.query_params.get('search', '')
    app_status = request.query_params.get('status', '')
    qs = FinanceApplication.objects.filter(dealer=dealer).select_related('financer', 'vehicle')
    if search:     qs = qs.filter(Q(customer_name__icontains=search) | Q(customer_phone__icontains=search))
    if app_status: qs = qs.filter(status=app_status)
    qs = qs.order_by('-created_at')

    data = [{
        'id': a.id,
        'customer_name': a.customer_name,
        'customer_phone': a.customer_phone,
        'financer_name': a.financer.company_name,
        'vehicle': str(a.vehicle) if a.vehicle else None,
        'loan_amount': str(a.loan_amount),
        'tenure_months': a.tenure_months,
        'status': a.status,
        'status_display': a.get_status_display(),
        'status_notes': a.status_notes,
        'submitted_at': a.submitted_at.isoformat() if a.submitted_at else None,
        'created_at': a.created_at.isoformat(),
        'down_payment': str(a.down_payment),
        'doc_count': a.documents.count(),
        'remarks': [{
            'id': r.id, 'author_type': r.author_type, 'content': r.content,
            'created_at': r.created_at.isoformat(),
        } for r in a.remarks.all()],
    } for a in qs]

    return Response({'results': data, 'count': qs.count()})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def finance_application_documents(request, app_id):
    """
    GET:  List documents uploaded for a finance application.
    POST: Upload a document for the application.
    """
    try:
        dealer = request.user.dealer_profile
    except (AttributeError, DealerProfile.DoesNotExist):
        return Response({'error': 'Not a dealer account'}, status=403)

    try:
        app = FinanceApplication.objects.get(pk=app_id, dealer=dealer)
    except FinanceApplication.DoesNotExist:
        return Response({'error': 'Application not found'}, status=404)

    if request.method == 'POST':
        doc_type = request.data.get('doc_type', '')
        file     = request.FILES.get('file')
        notes    = request.data.get('notes', '')
        if not file:
            return Response({'error': 'file is required'}, status=400)
        doc = FinanceApplicationDocument.objects.create(
            application=app, doc_type=doc_type, file=file, notes=notes
        )
        return Response({'id': doc.id, 'doc_type': doc.doc_type, 'notes': doc.notes}, status=201)

    docs = app.documents.all()
    data = [{
        'id': d.id, 'doc_type': d.doc_type, 'notes': d.notes,
        'file': request.build_absolute_uri(d.file.url) if d.file else None,
        'uploaded_at': d.uploaded_at.isoformat(),
    } for d in docs]
    return Response(data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def finance_application_remarks(request, app_id):
    """
    GET:  List remarks on a finance application (visible to both financer and dealer).
    POST: Add a remark (either party).
    Authentication determines the author_type automatically.
    """
    user = request.user
    app = None
    author_type = None

    # Try dealer first, then financer
    try:
        dealer = user.dealer_profile
        app = FinanceApplication.objects.get(pk=app_id, dealer=dealer)
        author_type = 'dealer'
    except (AttributeError, DealerProfile.DoesNotExist, FinanceApplication.DoesNotExist):
        pass

    if app is None:
        try:
            fp = user.financer_profile
            app = FinanceApplication.objects.get(pk=app_id, financer=fp)
            author_type = 'financer'
        except (AttributeError, FinancerProfile.DoesNotExist, FinanceApplication.DoesNotExist):
            pass

    if app is None:
        return Response({'error': 'Application not found or access denied'}, status=404)

    if request.method == 'POST':
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'content is required'}, status=400)

        remark = FinanceApplicationRemark.objects.create(
            application=app, author_type=author_type, content=content
        )

        # Notify the other party
        try:
            from api.notifications import send_push_notification
            if author_type == 'dealer':
                target_token = getattr(getattr(app.financer.user, 'profile', None), 'fcm_token', None)
                notif_title = 'New Dealer Remark'
                notif_body = f'{app.dealer.dealer_name}: {content[:60]}'
            else:
                target_token = getattr(getattr(app.dealer.user, 'profile', None), 'fcm_token', None)
                notif_title = 'Financer Remark on Application'
                notif_body = f'{app.financer.company_name}: {content[:60]}'
            if target_token:
                send_push_notification(
                    fcm_token=target_token, title=notif_title, body=notif_body,
                    data={'type': 'finance_remark', 'app_id': str(app.id)}
                )
        except Exception:
            pass

        return Response({
            'id': remark.id, 'author_type': remark.author_type,
            'content': remark.content, 'created_at': remark.created_at.isoformat(),
        }, status=201)

    remarks = FinanceApplicationRemark.objects.filter(application=app)
    data = [{
        'id': r.id, 'author_type': r.author_type, 'content': r.content,
        'created_at': r.created_at.isoformat(),
    } for r in remarks]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financer_applications(request):
    """
    Financer sees all incoming finance applications sorted by date.
    Supports filter by status and dealer search.
    """
    try:
        fp = request.user.financer_profile
    except (AttributeError, FinancerProfile.DoesNotExist):
        return Response({'error': 'Not a financer account'}, status=403)

    search    = request.query_params.get('search', '')
    app_status = request.query_params.get('status', '')
    qs = FinanceApplication.objects.filter(financer=fp).select_related('dealer', 'vehicle')
    if search:     qs = qs.filter(Q(customer_name__icontains=search) | Q(dealer__dealer_name__icontains=search))
    if app_status: qs = qs.filter(status=app_status)
    qs = qs.order_by('-created_at')

    data = [{
        'id': a.id,
        'customer_name': a.customer_name,
        'customer_phone': a.customer_phone,
        'customer_email': a.customer_email,
        'customer_address': a.customer_address,
        'customer_aadhaar': a.customer_aadhaar,
        'customer_pan': a.customer_pan,
        'dealer_id': a.dealer_id,
        'dealer_name': a.dealer.dealer_name,
        'dealer_phone': a.dealer.phone,
        'dealer_city': a.dealer.city,
        'vehicle': str(a.vehicle) if a.vehicle else None,
        'vehicle_price': str(a.vehicle_price) if a.vehicle_price else None,
        'loan_amount': str(a.loan_amount),
        'down_payment': str(a.down_payment),
        'tenure_months': a.tenure_months,
        'status': a.status,
        'status_display': a.get_status_display(),
        'status_notes': a.status_notes,
        'submitted_at': a.submitted_at.isoformat() if a.submitted_at else None,
        'reviewed_at': a.reviewed_at.isoformat() if a.reviewed_at else None,
        'created_at': a.created_at.isoformat(),
        'doc_count': a.documents.count(),
        'documents': [{
            'id': d.id, 'doc_type': d.doc_type,
            'file': request.build_absolute_uri(d.file.url) if d.file else None,
            'uploaded_at': d.uploaded_at.isoformat(),
        } for d in a.documents.all()],
        'remarks': [{
            'id': r.id, 'author_type': r.author_type, 'content': r.content,
            'created_at': r.created_at.isoformat(),
        } for r in a.remarks.all()],
    } for a in qs]

    return Response({'results': data, 'count': qs.count()})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def financer_update_application_status(request, app_id):
    """
    Financer updates the status of a finance application.
    The new status and notes are immediately visible to the dealer.
    """
    try:
        fp = request.user.financer_profile
    except (AttributeError, FinancerProfile.DoesNotExist):
        return Response({'error': 'Not a financer account'}, status=403)

    try:
        app = FinanceApplication.objects.get(pk=app_id, financer=fp)
    except FinanceApplication.DoesNotExist:
        return Response({'error': 'Application not found'}, status=404)

    new_status = request.data.get('status')
    valid_statuses = [c[0] for c in FinanceApplication.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({'error': f'Invalid status. Choose from: {valid_statuses}'}, status=400)

    app.status = new_status
    app.status_notes = request.data.get('status_notes', app.status_notes)
    app.reviewed_at = timezone.now()
    app.save(update_fields=['status', 'status_notes', 'reviewed_at', 'updated_at'])

    # Notify dealer via push notification
    try:
        from api.notifications import send_push_notification
        dealer_token = getattr(getattr(app.dealer.user, 'profile', None), 'fcm_token', None)
        if dealer_token:
            send_push_notification(
                fcm_token=dealer_token,
                title=f'Finance Application Update 📋',
                body=f'{fp.company_name}: Application for {app.customer_name} is now {app.get_status_display()}',
                data={'type': 'finance_update', 'app_id': str(app.id), 'status': new_status}
            )
    except Exception:
        pass

    return Response({
        'id': app.id,
        'status': app.status,
        'status_display': app.get_status_display(),
        'status_notes': app.status_notes,
        'message': 'Application status updated. Dealer has been notified.',
    })


# ═══════════════════════════════════════════════════════════════════
# FINANCER PLANS & SUBSCRIPTIONS
# ═══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([AllowAny])
def financer_plans_list(request):
    """List available financer subscription plans with pricing."""
    plans = FinancerPlan.objects.filter(is_active=True)
    data = [{
        'id': p.id,
        'name': p.name,
        'slug': p.slug,
        'price_per_year': str(p.price_per_year),
        'max_dealer_associations': p.max_dealer_associations,
        'max_finance_applications': p.max_finance_applications,
        'commission_per_lead': str(p.commission_per_lead),
        'features': p.features_json,
    } for p in plans]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financer_subscription_status(request):
    """Return the authenticated financer's subscription details."""
    try:
        fp = request.user.financer_profile
    except (AttributeError, FinancerProfile.DoesNotExist):
        return Response({'error': 'Not a financer account'}, status=403)

    try:
        sub = fp.subscription
        return Response({
            'plan_name': sub.plan.name,
            'plan_slug': sub.plan.slug,
            'price_per_year': str(sub.plan.price_per_year),
            'max_applications': sub.plan.max_finance_applications,
            'max_dealer_associations': sub.plan.max_dealer_associations,
            'commission_per_lead': str(sub.plan.commission_per_lead),
            'applications_used': sub.applications_used,
            'is_within_limit': sub.is_within_limit,
            'expires_at': sub.expires_at.isoformat() if sub.expires_at else None,
            'is_active': sub.is_active,
        })
    except FinancerSubscription.DoesNotExist:
        # Financer on implicit free tier
        apps_used = FinanceApplication.objects.filter(
            financer=fp, status__in=['submitted', 'under_review', 'approved', 'disbursed']
        ).count()
        return Response({
            'plan_name': 'Free Trial',
            'plan_slug': 'free',
            'price_per_year': '0',
            'max_applications': 5,
            'max_dealer_associations': 2,
            'commission_per_lead': '3000',
            'applications_used': apps_used,
            'is_within_limit': apps_used < 5,
            'expires_at': None,
            'is_active': True,
        })


# ═══════════════════════════════════════════════════════════════════
# ADMIN — FINANCER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def admin_financers(request, financer_id=None):
    """Admin manages all financer registrations and verifications."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required.'}, status=403)

    if request.method == 'PATCH' and financer_id:
        try:
            fp = FinancerProfile.objects.get(pk=financer_id)
        except FinancerProfile.DoesNotExist:
            return Response({'error': 'Financer not found'}, status=404)
        if 'is_verified' in request.data:
            fp.is_verified = bool(request.data['is_verified'])
            fp.save(update_fields=['is_verified'])
            # Send approval notification
            try:
                if fp.is_verified and fp.user.email:
                    from django.core.mail import send_mail
                    send_mail(
                        subject=f'{_platform_name()} — Financer Account Approved! ✅',
                        message=f'Congratulations {fp.company_name}!\n\nYour financer account has been approved by our team. You can now log in and start onboarding dealers.\n\n— {_platform_team_name()}',
                        from_email=_platform_from_email(),
                        recipient_list=[fp.user.email],
                        fail_silently=True,
                    )
            except Exception:
                pass
        return Response({'id': fp.id, 'is_verified': fp.is_verified})

    # GET — list all financers
    search = request.query_params.get('search', '')
    verified = request.query_params.get('verified', '')
    qs = FinancerProfile.objects.select_related('user').order_by('-created_at')
    if search:   qs = qs.filter(Q(company_name__icontains=search) | Q(phone__icontains=search))
    if verified == '1': qs = qs.filter(is_verified=True)
    if verified == '0': qs = qs.filter(is_verified=False)

    page_size = int(request.query_params.get('page_size', 20))
    page      = int(request.query_params.get('page', 1))
    total     = qs.count()
    qs = qs[(page-1)*page_size : page*page_size]

    data = [{
        'id': fp.id,
        'company_name': fp.company_name,
        'phone': fp.phone,
        'email': fp.user.email,
        'city': fp.city,
        'state': fp.state,
        'license_number': getattr(fp, 'license_number', ''),
        'is_verified': fp.is_verified,
        'created_at': fp.created_at.isoformat(),
        'username': fp.user.username,
        'doc_count': fp.documents.count(),
        'association_count': fp.dealer_associations.filter(status='approved').count(),
        'application_count': fp.received_applications.count(),
    } for fp in qs]

    return Response({'results': data, 'count': total, 'total_pages': (total + page_size - 1) // page_size})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_finance_applications(request):
    """Admin sees all finance applications across all dealer-financer pairs."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required.'}, status=403)

    search    = request.query_params.get('search', '')
    app_status = request.query_params.get('status', '')
    qs = FinanceApplication.objects.select_related('dealer', 'financer', 'vehicle').order_by('-created_at')
    if search:     qs = qs.filter(Q(customer_name__icontains=search) | Q(dealer__dealer_name__icontains=search))
    if app_status: qs = qs.filter(status=app_status)

    page_size = int(request.query_params.get('page_size', 20))
    page      = int(request.query_params.get('page', 1))
    total     = qs.count()
    qs = qs[(page-1)*page_size : page*page_size]

    data = [{
        'id': a.id,
        'customer_name': a.customer_name,
        'dealer_name': a.dealer.dealer_name,
        'financer_name': a.financer.company_name,
        'vehicle': str(a.vehicle) if a.vehicle else None,
        'loan_amount': str(a.loan_amount),
        'status': a.status,
        'status_display': a.get_status_display(),
        'submitted_at': a.submitted_at.isoformat() if a.submitted_at else None,
        'created_at': a.created_at.isoformat(),
    } for a in qs]

    return Response({'results': data, 'count': total, 'total_pages': (total + page_size - 1) // page_size})


# ═══════════════════════════════════════════════════════════════════
# ADMIN — RESET FINANCER PASSWORD
# ═══════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_reset_financer_password(request, financer_id):
    """Admin resets a financer's password."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin only'}, status=403)
    try:
        fp = FinancerProfile.objects.select_related('user').get(pk=financer_id)
    except FinancerProfile.DoesNotExist:
        return Response({'error': 'Financer not found'}, status=404)
    new_password = request.data.get('new_password', '').strip()
    auto_generated = len(new_password) < 6
    if auto_generated:
        new_password = ''.join(__import__('random').choices(
            __import__('string').ascii_letters + __import__('string').digits, k=10))
    fp.user.set_password(new_password)
    fp.user.save()
    return Response({'success': True, 'new_password': new_password,
                     'auto_generated': auto_generated,
                     'company_name': fp.company_name, 'username': fp.user.username,
                     'message': 'Password reset. Share the new password securely with the financer.'})


# ═══════════════════════════════════════════════════════════════════
# ADMIN — PLAN MANAGEMENT + DEACTIVATE (DEALERS & FINANCERS)
# ═══════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_manage_dealer(request, dealer_id):
    """Admin changes dealer plan (free/pro) or deactivates/activates dealer."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin only'}, status=403)
    try:
        dealer = DealerProfile.objects.select_related('user', 'plan').get(pk=dealer_id)
    except DealerProfile.DoesNotExist:
        return Response({'error': 'Dealer not found'}, status=404)

    action = request.data.get('action')  # set_plan | deactivate | activate

    if action == 'set_plan':
        plan_slug = request.data.get('plan_slug')  # free | early_dealer | pro
        try:
            plan = Plan.objects.get(slug=plan_slug, is_active=True)
        except Plan.DoesNotExist:
            return Response({'error': f'Plan "{plan_slug}" not found'}, status=400)
        dealer.plan = plan
        dealer.plan_type = 'pro' if plan_slug in ('early_dealer', 'pro') else 'free'
        if plan_slug != 'free':
            dealer.plan_started_at = timezone.now()
            dealer.plan_expires_at = timezone.now() + __import__('datetime').timedelta(days=365)
        else:
            dealer.plan_started_at = None
            dealer.plan_expires_at = None
        dealer.save(update_fields=['plan', 'plan_type', 'plan_started_at', 'plan_expires_at'])
        return Response({'success': True, 'message': f'Plan updated to {plan.name}', 'plan_slug': plan_slug})

    elif action == 'deactivate':
        dealer.user.is_active = False
        dealer.user.save()
        return Response({'success': True, 'message': f'Dealer {dealer.dealer_name} deactivated.'})

    elif action == 'activate':
        dealer.user.is_active = True
        dealer.user.save()
        return Response({'success': True, 'message': f'Dealer {dealer.dealer_name} activated.'})

    return Response({'error': 'Invalid action. Use set_plan, deactivate, or activate.'}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_manage_financer(request, financer_id):
    """Admin changes financer plan or deactivates/activates financer."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin only'}, status=403)
    try:
        fp = FinancerProfile.objects.select_related('user').get(pk=financer_id)
    except FinancerProfile.DoesNotExist:
        return Response({'error': 'Financer not found'}, status=404)

    action = request.data.get('action')  # set_plan | deactivate | activate

    if action == 'set_plan':
        plan_slug = request.data.get('plan_slug')  # free | pro
        try:
            from .models import FinancerPlan, FinancerSubscription
            plan = FinancerPlan.objects.get(slug=plan_slug, is_active=True)
        except Exception:
            return Response({'error': f'Financer plan "{plan_slug}" not found'}, status=400)
        import datetime as _dt
        expires = timezone.now() + _dt.timedelta(days=365) if plan_slug != 'free' else None
        FinancerSubscription.objects.update_or_create(
            financer=fp,
            defaults={
                'plan': plan,
                'expires_at': expires,
                'is_active': True,
            }
        )
        return Response({'success': True, 'message': f'Financer plan updated to {plan.name}'})

    elif action == 'deactivate':
        fp.user.is_active = False
        fp.user.save()
        return Response({'success': True, 'message': f'Financer {fp.company_name} deactivated.'})

    elif action == 'activate':
        fp.user.is_active = True
        fp.user.save()
        return Response({'success': True, 'message': f'Financer {fp.company_name} activated.'})

    return Response({'error': 'Invalid action.'}, status=400)


# ═══════════════════════════════════════════════════════════════════
# ADMIN — LEADS ANALYTICS WITH DATE RANGE FILTER
# ═══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_leads_analytics(request):
    """Admin sees lead + sale counts per dealer/financer with date range filters."""
    if not _is_admin(request.user):
        return Response({'error': 'Admin only'}, status=403)

    from django.db.models import Count, Sum
    from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear
    import datetime as _dt

    period    = request.query_params.get('period', 'monthly')   # daily|weekly|monthly|yearly
    date_from = request.query_params.get('date_from', '')
    date_to   = request.query_params.get('date_to', '')
    entity    = request.query_params.get('entity', 'dealer')    # dealer | financer

    lead_qs = Lead.objects.all()
    sale_qs = Sale.objects.all()
    app_qs  = FinanceApplication.objects.all()

    if date_from:
        lead_qs = lead_qs.filter(created_at__date__gte=date_from)
        sale_qs = sale_qs.filter(created_at__date__gte=date_from)
        app_qs  = app_qs.filter(created_at__date__gte=date_from)
    if date_to:
        lead_qs = lead_qs.filter(created_at__date__lte=date_to)
        sale_qs = sale_qs.filter(created_at__date__lte=date_to)
        app_qs  = app_qs.filter(created_at__date__lte=date_to)

    trunc_map = {
        'daily': TruncDay, 'weekly': TruncWeek,
        'monthly': TruncMonth, 'yearly': TruncYear,
    }
    TruncFn = trunc_map.get(period, TruncMonth)

    # Time-series: leads per period
    leads_series = (
        lead_qs.annotate(period=TruncFn('created_at'))
        .values('period').annotate(count=Count('id')).order_by('period')
    )
    sales_series = (
        sale_qs.annotate(period=TruncFn('created_at'))
        .values('period').annotate(count=Count('id'), revenue=Sum('sale_price')).order_by('period')
    )

    # Per-dealer breakdown
    dealer_breakdown = (
        lead_qs.values('dealer__id', 'dealer__dealer_name', 'dealer__city')
        .annotate(lead_count=Count('id'))
        .order_by('-lead_count')[:20]
    )

    # Per-financer breakdown: finance applications received
    financer_breakdown = (
        app_qs.values('financer__id', 'financer__company_name', 'financer__city')
        .annotate(app_count=Count('id'))
        .order_by('-app_count')[:20]
    )

    return Response({
        'leads_series': [
            {'period': s['period'].date().isoformat() if s['period'] else None, 'count': s['count']}
            for s in leads_series
        ],
        'sales_series': [
            {'period': s['period'].date().isoformat() if s['period'] else None,
             'count': s['count'], 'revenue': str(s['revenue'] or 0)}
            for s in sales_series
        ],
        'dealer_breakdown': [
            {'id': d['dealer__id'], 'name': d['dealer__dealer_name'],
             'city': d['dealer__city'], 'lead_count': d['lead_count']}
            for d in dealer_breakdown
        ],
        'financer_breakdown': [
            {'id': f['financer__id'], 'name': f['financer__company_name'],
             'city': f['financer__city'], 'app_count': f['app_count']}
            for f in financer_breakdown
        ],
        'totals': {
            'leads': lead_qs.count(),
            'sales': sale_qs.count(),
            'finance_apps': app_qs.count(),
        }
    })


# ═══════════════════════════════════════════════════════════════════
# FINANCER — ENFORCE ASSOCIATION LIMIT (patched into approve view)
# ═══════════════════════════════════════════════════════════════════
# Note: limit enforcement is inline in financer_approve_dealer (see below patch)
