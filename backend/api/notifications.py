"""
eRickshawDekho — WhatsApp & Push Notification System

WhatsApp: Twilio WhatsApp Business API
Push:     Firebase Cloud Messaging (FCM)

Industry standard for Indian SaaS:
- Twilio WhatsApp is used by 1000s of Indian startups
- FCM is free and widely adopted
- Message templates follow WhatsApp Business API guidelines
"""
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

PLATFORM_NAME = getattr(settings, 'PLATFORM_NAME', 'eRickshawDekho')
PLATFORM_TAGLINE = getattr(settings, 'PLATFORM_TAGLINE', 'Bharosemand Platform')
PLATFORM_URL = getattr(settings, 'PLATFORM_URL', 'https://www.erikshawdekho.com')
PLATFORM_TEAM_NAME = getattr(settings, 'PLATFORM_TEAM_NAME', f'{PLATFORM_NAME} Team')
PLATFORM_FROM_EMAIL = getattr(
    settings,
    'PLATFORM_NOREPLY_EMAIL',
    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@erikshawdekho.com')
)


# ─── WhatsApp via Twilio ──────────────────────────────────────────

def _get_twilio_client():
    """Return Twilio client if credentials configured, else None."""
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    if not sid or not token:
        logger.warning('Twilio not configured — WhatsApp messages will not send.')
        return None
    try:
        from twilio.rest import Client
        return Client(sid, token)
    except ImportError:
        logger.error('twilio package not installed.')
        return None


def _fmt_phone_wa(phone: str) -> str:
    """Normalise Indian phone → whatsapp:+91XXXXXXXXXX"""
    phone = phone.strip().replace(' ', '').replace('-', '')
    if phone.startswith('whatsapp:'):
        return phone
    if not phone.startswith('+'):
        if phone.startswith('0'):
            phone = phone[1:]
        if len(phone) == 10:
            phone = '+91' + phone
        else:
            phone = '+' + phone
    return f'whatsapp:{phone}'


def send_whatsapp(to_phone: str, message: str) -> bool:
    """Send a WhatsApp message via Twilio. Returns True on success."""
    client = _get_twilio_client()
    if not client:
        return False
    try:
        from_wa = getattr(settings, 'TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')
        client.messages.create(
            body=message,
            from_=from_wa,
            to=_fmt_phone_wa(to_phone),
        )
        logger.info(f'WhatsApp sent to {to_phone}')
        return True
    except Exception as exc:
        logger.error(f'WhatsApp failed to {to_phone}: {exc}')
        return False


# ── WhatsApp message templates ────────────────────────────────────

def wa_dealer_welcome(dealer_name: str, username: str, platform_url: str) -> str:
    return (
        f"🛺 *Welcome to {PLATFORM_NAME}!*\n\n"
        f"Namaste {dealer_name} ji! 🙏\n\n"
        f"Your dealer account is now active.\n"
        f"*Username:* {username}\n"
        f"*Login:* {platform_url}\n\n"
        f"Manage your inventory, leads & sales — all from one dashboard.\n\n"
        f"_{PLATFORM_TEAM_NAME}_ ✅"
    )


def wa_plan_expiry_warning(dealer_name: str, days_left: int, support_phone: str) -> str:
    urgency = 'TODAY ⚠️' if days_left == 0 else f'in *{days_left} day{"s" if days_left > 1 else ""}* ⏳'
    return (
        f"⚠️ *{PLATFORM_NAME} — Trial Expiry Alert*\n\n"
        f"Namaste {dealer_name} ji,\n\n"
        f"Your free trial expires {urgency}.\n\n"
        f"Don't lose access to your leads, inventory & sales data!\n\n"
        f"📞 Call/WhatsApp us to upgrade: *{support_phone}*\n\n"
        f"_{PLATFORM_TEAM_NAME}_"
    )


def wa_new_lead(dealer_name: str, customer_name: str,
                customer_phone: str, vehicle_name: str) -> str:
    return (
        f"🎯 *New Lead Alert — {PLATFORM_NAME}*\n\n"
        f"Namaste {dealer_name} ji!\n\n"
        f"*Customer:* {customer_name}\n"
        f"*Phone:* {customer_phone}\n"
        f"*Interest:* {vehicle_name}\n\n"
        f"⚡ Follow up within 1 hour for best results!\n\n"
        f"_{PLATFORM_TEAM_NAME}_"
    )


def wa_emi_due_reminder(customer_name: str, emi_amount: str,
                         vehicle_name: str, dealer_name: str,
                         dealer_phone: str) -> str:
    return (
        f"📅 *EMI Due Reminder*\n\n"
        f"Namaste {customer_name} ji,\n\n"
        f"Your EMI payment of *₹{emi_amount}* is due for your *{vehicle_name}*.\n\n"
        f"Please contact your dealer to avoid any penalty:\n"
        f"*{dealer_name}*: {dealer_phone}\n\n"
        f"_{PLATFORM_NAME} — {PLATFORM_TAGLINE}_ 🛺"
    )


def wa_delivery_reminder(customer_name: str, vehicle_name: str,
                          delivery_date: str, dealer_name: str,
                          dealer_phone: str) -> str:
    return (
        f"🚚 *Delivery Reminder — {PLATFORM_NAME}*\n\n"
        f"Namaste {customer_name} ji,\n\n"
        f"Your *{vehicle_name}* is scheduled for delivery on *{delivery_date}*.\n\n"
        f"Contact your dealer for details:\n"
        f"*{dealer_name}*: {dealer_phone}\n\n"
        f"Congratulations on your new vehicle! 🎉\n"
        f"_{PLATFORM_TEAM_NAME}_"
    )


def wa_offer_broadcast(dealer_name: str, offer_title: str,
                        offer_details: str, validity: str) -> str:
    return (
        f"🎊 *Special Offer from {dealer_name}*\n\n"
        f"*{offer_title}*\n\n"
        f"{offer_details}\n\n"
        f"⏰ Valid till: *{validity}*\n\n"
        f"Visit {dealer_name} showroom or call for details.\n\n"
        f"_Powered by {PLATFORM_NAME}_ 🛺"
    )


# ─── Convenience notification functions ──────────────────────────

def notify_dealer_welcome(dealer_name: str, phone: str, username: str):
    msg = wa_dealer_welcome(dealer_name, username, PLATFORM_URL)
    return send_whatsapp(phone, msg)


def notify_dealer_plan_expiry(dealer_name: str, phone: str, days_left: int):
    support_phone = getattr(settings, 'SUPPORT_PHONE', '')
    msg = wa_plan_expiry_warning(dealer_name, days_left, support_phone)
    return send_whatsapp(phone, msg)


def notify_dealer_new_lead(dealer_name: str, dealer_phone: str,
                            customer_name: str, customer_phone: str,
                            vehicle_name: str):
    msg = wa_new_lead(dealer_name, customer_name, customer_phone, vehicle_name)
    return send_whatsapp(dealer_phone, msg)


def notify_customer_emi_due(customer_name: str, customer_phone: str,
                              emi_amount: str, vehicle_name: str,
                              dealer_name: str, dealer_phone: str):
    msg = wa_emi_due_reminder(customer_name, emi_amount, vehicle_name,
                               dealer_name, dealer_phone)
    return send_whatsapp(customer_phone, msg)


def notify_customer_delivery(customer_name: str, customer_phone: str,
                               vehicle_name: str, delivery_date: str,
                               dealer_name: str, dealer_phone: str):
    msg = wa_delivery_reminder(customer_name, vehicle_name, delivery_date,
                                dealer_name, dealer_phone)
    return send_whatsapp(customer_phone, msg)


# ─── Firebase Cloud Messaging (Push Notifications) ────────────────

_firebase_initialized = False


def _init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return True
    creds_json = getattr(settings, 'FIREBASE_CREDENTIALS_JSON', '')
    if not creds_json:
        logger.warning('Firebase not configured — push notifications will not send.')
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials
        creds_dict = json.loads(creds_json)
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        return True
    except Exception as exc:
        logger.error(f'Firebase init failed: {exc}')
        return False


def send_push_notification(fcm_token: str, title: str, body: str,
                            data: dict = None) -> bool:
    """Send push notification via FCM. Returns True on success."""
    if not fcm_token:
        return False
    if not _init_firebase():
        return False
    try:
        from firebase_admin import messaging
        msg = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=fcm_token,
            android=messaging.AndroidConfig(priority='high'),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound='default', badge=1)
                )
            ),
        )
        messaging.send(msg)
        logger.info(f'Push sent to token ending ...{fcm_token[-6:]}')
        return True
    except Exception as exc:
        logger.error(f'Push failed: {exc}')
        return False


# ── Push notification payloads ────────────────────────────────────

def push_new_lead(fcm_token: str, customer_name: str, vehicle_name: str):
    return send_push_notification(
        fcm_token,
        title='🎯 New Lead!',
        body=f'{customer_name} is interested in {vehicle_name}. Follow up now!',
        data={'type': 'new_lead'},
    )


def push_plan_expiry(fcm_token: str, days_left: int):
    urgency = 'today' if days_left == 0 else f'in {days_left} day{"s" if days_left > 1 else ""}'
    return send_push_notification(
        fcm_token,
        title='⚠️ Trial Expiring Soon',
        body=f'Your free trial expires {urgency}. Upgrade to continue.',
        data={'type': 'plan_expiry', 'days_left': str(days_left)},
    )


def push_new_enquiry(fcm_token: str, customer_name: str, city: str):
    return send_push_notification(
        fcm_token,
        title='📩 New Enquiry',
        body=f'{customer_name} from {city} submitted an enquiry.',
        data={'type': 'new_enquiry'},
    )


def push_offer_notification(fcm_token: str, offer_title: str):
    return send_push_notification(
        fcm_token,
        title='🎊 Special Offer',
        body=offer_title,
        data={'type': 'offer'},
    )


# ─── Dealer-owned API Key helpers (marketing_send uses these) ────

def send_whatsapp_message(to: str, message: str, api_key: str = '', api_secret: str = '', extra_config: dict = None, **kwargs):
    """
    Send a WhatsApp message using a dealer's own API credentials.
    Supports:
      - Twilio WhatsApp: api_key=Account SID, api_secret=Auth Token, extra_config.from_number=whatsapp:+1xxx
      - Gupshup: api_key=API key, extra_config.provider='gupshup', extra_config.source_number=91XXXXXXXXXX
      - Meta Cloud API: api_key=Bearer token, extra_config.phone_number_id=XXXXX
      - 360dialog WABA: api_key=Bearer token (no api_secret)
      - Wati: api_key=Bearer token, extra_config.provider='wati', extra_config.api_url=https://live-server-XXXXX.wati.io
      - AiSensy: api_key=Bearer token, extra_config.provider='aisensy'
    Falls back to platform Twilio if no dealer key is provided.
    Raises on failure so the caller can track sent vs failed.
    """
    extra_config = extra_config or {}
    phone = _normalize_phone(to)
    provider = extra_config.get('provider', '').lower()

    if api_key and api_secret and provider != 'gupshup':
        # Twilio-style credentials: api_key = Account SID, api_secret = Auth Token
        from twilio.rest import Client
        client = Client(api_key, api_secret)
        from_wa = extra_config.get('from_number', getattr(settings, 'TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886'))
        if not from_wa.startswith('whatsapp:'):
            from_wa = f'whatsapp:{from_wa}'
        wa_to = f'whatsapp:{phone}' if not phone.startswith('whatsapp:') else phone
        result = client.messages.create(body=message, from_=from_wa, to=wa_to)
        logger.info(f'WhatsApp (Twilio) sent to {to}, SID={result.sid}')

    elif provider == 'gupshup':
        # Gupshup WhatsApp API
        import requests as _req
        url = extra_config.get('api_url', 'https://api.gupshup.io/wa/api/v1/msg')
        source = extra_config.get('source_number', '')
        dest = phone.lstrip('+')
        payload = {
            'channel': 'whatsapp',
            'source': source,
            'destination': dest,
            'message': json.dumps({'type': 'text', 'text': message}),
            'src.name': extra_config.get('app_name', PLATFORM_NAME),
        }
        headers = {'apikey': api_key, 'Content-Type': 'application/x-www-form-urlencoded'}
        resp = _req.post(url, data=payload, headers=headers, timeout=15)
        if resp.status_code >= 400:
            raise RuntimeError(f'Gupshup API error {resp.status_code}: {resp.text[:200]}')
        result = resp.json()
        if result.get('status') == 'error':
            raise RuntimeError(f'Gupshup error: {result.get("message", resp.text[:200])}')
        logger.info(f'WhatsApp (Gupshup) sent to {to}')

    elif provider == 'wati':
        # Wati WhatsApp API
        import requests as _req
        base_url = extra_config.get('api_url', '').rstrip('/')
        url = f'{base_url}/api/v1/sendSessionMessage/{phone.lstrip("+")}'
        headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
        payload = {'messageText': message}
        resp = _req.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code >= 400:
            raise RuntimeError(f'Wati API error {resp.status_code}: {resp.text[:200]}')
        logger.info(f'WhatsApp (Wati) sent to {to}')

    elif provider == 'aisensy':
        # AiSensy WhatsApp API
        import requests as _req
        url = extra_config.get('api_url', 'https://backend.aisensy.com/campaign/t1/api/v2')
        headers = {'Content-Type': 'application/json'}
        payload = {
            'apiKey': api_key,
            'campaignName': extra_config.get('campaign_name', 'marketing'),
            'destination': phone.lstrip('+'),
            'userName': extra_config.get('user_name', PLATFORM_NAME),
            'message': message,
        }
        resp = _req.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code >= 400:
            raise RuntimeError(f'AiSensy API error {resp.status_code}: {resp.text[:200]}')
        logger.info(f'WhatsApp (AiSensy) sent to {to}')

    elif api_key:
        # Token-based API (Meta Cloud API / 360dialog WABA)
        import requests as _req
        phone_id = extra_config.get('phone_number_id', '')
        if phone_id:
            url = f'https://graph.facebook.com/v17.0/{phone_id}/messages'
        else:
            url = extra_config.get('api_url', 'https://waba.360dialog.io/v1/messages')
        headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
        payload = {
            'messaging_product': 'whatsapp',
            'to': phone.lstrip('+'),
            'type': 'text',
            'text': {'body': message},
        }
        resp = _req.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code >= 400:
            raise RuntimeError(f'WhatsApp API error {resp.status_code}: {resp.text[:200]}')
        logger.info(f'WhatsApp (API) sent to {to}')
    else:
        # Fallback to platform-level Twilio
        ok = send_whatsapp(to, message)
        if not ok:
            raise RuntimeError('Platform WhatsApp (Twilio) not configured or failed.')


def _normalize_phone(phone: str) -> str:
    """Clean a phone string to +91XXXXXXXXXX format."""
    phone = phone.strip().replace(' ', '').replace('-', '')
    if phone.startswith('whatsapp:'):
        phone = phone[9:]
    if not phone.startswith('+'):
        if phone.startswith('0'):
            phone = phone[1:]
        if len(phone) == 10:
            phone = '+91' + phone
        else:
            phone = '+' + phone
    return phone


def send_sms_message(to: str, message: str, account_sid: str = '', auth_token: str = '', extra_config: dict = None, **kwargs):
    """
    Send an SMS using a dealer's own Twilio credentials (from DealerAPIKey).
    Raises on failure so the caller can track sent vs failed.
    """
    extra_config = extra_config or {}
    from twilio.rest import Client
    client = Client(account_sid, auth_token)
    from_number = extra_config.get('from_number') or kwargs.get('from_number') or getattr(settings, 'TWILIO_SMS_FROM', '')
    if not from_number:
        raise RuntimeError('No SMS from_number configured. Add it in API Key → extra_config → from_number.')
    phone = _normalize_phone(to)
    result = client.messages.create(to=phone, from_=from_number, body=message)
    logger.info(f'SMS sent to {to}, SID={result.sid}')


def send_marketing_email(to: str, subject: str, body: str, api_key: str = '', **kwargs):
    """
    Send a marketing email via Gmail SMTP using dealer's own SMTP credentials.
    Dealer API key is the Gmail app password.
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        smtp_user = kwargs.get('smtp_user', to)
        smtp_pass = api_key
        if not smtp_pass:
            from django.core.mail import send_mail
            send_mail(subject, body, PLATFORM_FROM_EMAIL, [to], fail_silently=True)
            return
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to, msg.as_string())
    except Exception as e:
        logger.warning(f'send_marketing_email failed: {e}')

