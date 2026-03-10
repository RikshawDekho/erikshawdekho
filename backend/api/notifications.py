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
        f"🛺 *Welcome to eRickshawDekho!*\n\n"
        f"Namaste {dealer_name} ji! 🙏\n\n"
        f"Your dealer account is now active.\n"
        f"*Username:* {username}\n"
        f"*Login:* {platform_url}\n\n"
        f"Manage your inventory, leads & sales — all from one dashboard.\n\n"
        f"_Team eRickshawDekho_ ✅"
    )


def wa_plan_expiry_warning(dealer_name: str, days_left: int, support_phone: str) -> str:
    urgency = 'TODAY ⚠️' if days_left == 0 else f'in *{days_left} day{"s" if days_left > 1 else ""}* ⏳'
    return (
        f"⚠️ *eRickshawDekho — Trial Expiry Alert*\n\n"
        f"Namaste {dealer_name} ji,\n\n"
        f"Your free trial expires {urgency}.\n\n"
        f"Don't lose access to your leads, inventory & sales data!\n\n"
        f"📞 Call/WhatsApp us to upgrade: *{support_phone}*\n\n"
        f"_Team eRickshawDekho_"
    )


def wa_new_lead(dealer_name: str, customer_name: str,
                customer_phone: str, vehicle_name: str) -> str:
    return (
        f"🎯 *New Lead Alert — eRickshawDekho*\n\n"
        f"Namaste {dealer_name} ji!\n\n"
        f"*Customer:* {customer_name}\n"
        f"*Phone:* {customer_phone}\n"
        f"*Interest:* {vehicle_name}\n\n"
        f"⚡ Follow up within 1 hour for best results!\n\n"
        f"_Team eRickshawDekho_"
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
        f"_eRickshawDekho — Bharosemand Platform_ 🛺"
    )


def wa_delivery_reminder(customer_name: str, vehicle_name: str,
                          delivery_date: str, dealer_name: str,
                          dealer_phone: str) -> str:
    return (
        f"🚚 *Delivery Reminder — eRickshawDekho*\n\n"
        f"Namaste {customer_name} ji,\n\n"
        f"Your *{vehicle_name}* is scheduled for delivery on *{delivery_date}*.\n\n"
        f"Contact your dealer for details:\n"
        f"*{dealer_name}*: {dealer_phone}\n\n"
        f"Congratulations on your new vehicle! 🎉\n"
        f"_Team eRickshawDekho_"
    )


def wa_offer_broadcast(dealer_name: str, offer_title: str,
                        offer_details: str, validity: str) -> str:
    return (
        f"🎊 *Special Offer from {dealer_name}*\n\n"
        f"*{offer_title}*\n\n"
        f"{offer_details}\n\n"
        f"⏰ Valid till: *{validity}*\n\n"
        f"Visit {dealer_name} showroom or call for details.\n\n"
        f"_Powered by eRickshawDekho_ 🛺"
    )


# ─── Convenience notification functions ──────────────────────────

def notify_dealer_welcome(dealer_name: str, phone: str, username: str):
    platform_url = getattr(settings, 'PLATFORM_URL', 'https://www.erikshawdekho.com')
    msg = wa_dealer_welcome(dealer_name, username, platform_url)
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
