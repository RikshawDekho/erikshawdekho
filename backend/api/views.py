import uuid
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta, date
from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import DealerProfile, Brand, Vehicle, Lead, Sale, Customer, Task, FinanceLoan
from .serializers import (
    VehicleSerializer, VehicleListSerializer, LeadSerializer, SaleSerializer,
    CustomerSerializer, TaskSerializer, FinanceLoanSerializer, BrandSerializer,
    DealerProfileSerializer, RegisterSerializer
)


# ─── AUTH ─────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    ser = RegisterSerializer(data=request.data)
    if ser.is_valid():
        user = ser.save()
        token, _ = Token.objects.get_or_create(user=user)
        dealer = user.dealer_profile
        return Response({
            'token': token.key,
            'user': {'id': user.id, 'username': user.username, 'email': user.email},
            'dealer': {'id': dealer.id, 'name': dealer.dealer_name, 'city': dealer.city}
        }, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    token, _ = Token.objects.get_or_create(user=user)
    dealer = getattr(user, 'dealer_profile', None)
    return Response({
        'token': token.key,
        'user': {'id': user.id, 'username': user.username, 'email': user.email,
                 'first_name': user.first_name, 'last_name': user.last_name},
        'dealer': {
            'id': dealer.id if dealer else None,
            'name': dealer.dealer_name if dealer else username,
            'city': dealer.city if dealer else '',
            'phone': dealer.phone if dealer else '',
            'gstin': dealer.gstin if dealer else '',
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def me(request):
    user = request.user
    dealer = getattr(user, 'dealer_profile', None)
    return Response({
        'user': {'id': user.id, 'username': user.username, 'email': user.email},
        'dealer': {
            'id': dealer.id if dealer else None,
            'name': dealer.dealer_name if dealer else '',
            'city': dealer.city if dealer else '',
            'phone': dealer.phone if dealer else '',
            'gstin': dealer.gstin if dealer else '',
            'address': dealer.address if dealer else '',
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

    monthly_rev = Sale.objects.filter(
        dealer=dealer, sale_date__gte=month_start
    ).aggregate(total=Sum('sale_price'))['total'] or 0

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
        ).aggregate(total=Sum('sale_price'), count=Count('id'))
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
        serializer.save(dealer=self.request.user.dealer_profile)

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
    serializer = VehicleListSerializer(qs.order_by('-is_featured','-created_at')[:20], many=True)
    return Response({'results': serializer.data, 'count': qs.count()})


# ─── LEADS ────────────────────────────────────────────────────────

class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = Lead.objects.filter(dealer=dealer).select_related('vehicle','vehicle__brand')
        status_f = self.request.query_params.get('status')
        source_f = self.request.query_params.get('source')
        search   = self.request.query_params.get('search')
        if status_f: qs = qs.filter(status=status_f)
        if source_f: qs = qs.filter(source=source_f)
        if search:   qs = qs.filter(Q(customer_name__icontains=search)|Q(phone__icontains=search))
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

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = Sale.objects.filter(dealer=dealer).select_related('vehicle','vehicle__brand')
        search = self.request.query_params.get('search')
        if search: qs = qs.filter(Q(customer_name__icontains=search)|Q(invoice_number__icontains=search))
        return qs.order_by('-sale_date')

    def perform_create(self, serializer):
        dealer = self.request.user.dealer_profile
        inv_no = 'INV-' + uuid.uuid4().hex[:8].upper()
        sale = serializer.save(dealer=dealer, invoice_number=inv_no)
        # Decrement stock
        vehicle = sale.vehicle
        vehicle.stock_quantity = max(0, vehicle.stock_quantity - sale.quantity)
        vehicle.save()

    @action(detail=True, methods=['get'])
    def invoice(self, request, pk=None):
        sale = self.get_object()
        dealer = sale.dealer
        return Response({
            'invoice_number': sale.invoice_number,
            'sale_date': sale.sale_date,
            'dealer': {
                'name': dealer.dealer_name,
                'address': dealer.address,
                'city': dealer.city,
                'phone': dealer.phone,
                'gstin': dealer.gstin,
            },
            'customer': {
                'name': sale.customer_name,
                'phone': sale.customer_phone,
                'email': sale.customer_email,
                'address': sale.customer_address,
                'gstin': sale.customer_gstin,
            },
            'vehicle': {
                'name': f"{sale.vehicle.brand} {sale.vehicle.model_name}",
                'hsn': sale.vehicle.hsn_code,
                'fuel_type': sale.vehicle.fuel_type,
            },
            'unit_price': float(sale.sale_price),
            'quantity': sale.quantity,
            'subtotal': float(sale.subtotal),
            'cgst_rate': float(sale.cgst_rate),
            'cgst_amount': float(sale.cgst_amount),
            'sgst_rate': float(sale.sgst_rate),
            'sgst_amount': float(sale.sgst_amount),
            'total_amount': float(sale.total_amount),
            'payment_method': sale.payment_method,
        })


# ─── CUSTOMERS ────────────────────────────────────────────────────

class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dealer = self.request.user.dealer_profile
        qs = Customer.objects.filter(dealer=dealer)
        search = self.request.query_params.get('search')
        if search: qs = qs.filter(Q(name__icontains=search)|Q(phone__icontains=search))
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
        return FinanceLoan.objects.filter(dealer=self.request.user.dealer_profile).order_by('-applied_date')

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

class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [AllowAny]


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

    sales = Sale.objects.filter(dealer=dealer, sale_date__gte=start)
    revenue = sales.aggregate(total=Sum('sale_price'))['total'] or 0
    sale_count = sales.count()

    leads = Lead.objects.filter(dealer=dealer, created_at__gte=start)
    lead_count = leads.count()
    converted = leads.filter(status='converted').count()
    conversion_rate = round(converted / lead_count * 100, 1) if lead_count else 0

    fuel_sales = sales.values('vehicle__fuel_type').annotate(
        count=Count('id'), revenue=Sum('sale_price')
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
