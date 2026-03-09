"""
eRickshawDekho — Email Notification System
Industry-standard HTML emails with inline CSS, responsive design.
Uses Django's email backend (configured for SendGrid SMTP in production).
"""
import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)

BRAND_COLOR   = '#1a7f4b'
ACCENT_COLOR  = '#f5a623'
PLATFORM_NAME = getattr(settings, 'PLATFORM_NAME', 'eRickshawDekho')
PLATFORM_URL  = getattr(settings, 'PLATFORM_URL', 'https://www.erikshawdekho.com')
SUPPORT_EMAIL = getattr(settings, 'SUPPORT_EMAIL', 'support@erikshawdekho.com')
SUPPORT_PHONE = getattr(settings, 'SUPPORT_PHONE', '')
SUPPORT_WA    = getattr(settings, 'SUPPORT_WHATSAPP', '')


# ─── HTML skeleton ────────────────────────────────────────────────

def _wrap_html(title: str, body_html: str) -> str:
    """Wrap content in responsive email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:{BRAND_COLOR};padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
              🛺 {PLATFORM_NAME}
            </h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">
              Bharat ka Sabse Bharosemand ई-Riksha Platform
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            {body_html}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fa;padding:20px 32px;border-top:1px solid #e9ecef;">
            <p style="margin:0;color:#6c757d;font-size:12px;line-height:1.6;">
              © {PLATFORM_NAME} · <a href="{PLATFORM_URL}" style="color:{BRAND_COLOR};">{PLATFORM_URL}</a><br>
              Support: <a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_COLOR};">{SUPPORT_EMAIL}</a>
              {f' · <a href="{SUPPORT_WA}" style="color:{BRAND_COLOR};">WhatsApp Support</a>' if SUPPORT_WA else ''}
              <br><small style="color:#adb5bd;">
                You received this email because you have an account on {PLATFORM_NAME}.
                To unsubscribe, update your notification preferences in your account settings.
              </small>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send(to: str | list, subject: str, html: str, text: str = '') -> bool:
    """Send email, returns True on success. Never raises — logs errors instead."""
    if not to:
        return False
    recipients = [to] if isinstance(to, str) else to
    from_email = settings.DEFAULT_FROM_EMAIL
    try:
        msg = EmailMultiAlternatives(subject, text or _html_to_text(html), from_email, recipients)
        msg.attach_alternative(html, 'text/html')
        msg.send()
        logger.info(f'Email sent: {subject} → {recipients}')
        return True
    except Exception as exc:
        logger.error(f'Email failed: {subject} → {recipients} | {exc}')
        return False


def _html_to_text(html: str) -> str:
    """Very basic HTML-to-text stripping for plain-text fallback."""
    import re
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _btn(label: str, url: str) -> str:
    return f"""<p style="text-align:center;margin:28px 0 0;">
      <a href="{url}"
         style="background:{BRAND_COLOR};color:#ffffff;text-decoration:none;
                padding:12px 32px;border-radius:6px;font-size:15px;font-weight:600;
                display:inline-block;">{label}</a>
    </p>"""


def _alert(text: str, color: str = '#fff3cd', border: str = '#f5a623') -> str:
    return f"""<div style="background:{color};border-left:4px solid {border};
                   padding:12px 16px;border-radius:4px;margin:16px 0;font-size:14px;">
      {text}
    </div>"""


# ─── 1. Welcome email after dealer self-registration ──────────────

def send_dealer_welcome_email(dealer_name: str, email: str, username: str, plan_expires: str):
    subject = f'Welcome to {PLATFORM_NAME}! Your Free Trial is Active 🎉'
    body = f"""
      <h2 style="color:#212529;margin:0 0 8px;">Namaste, {dealer_name}! 🙏</h2>
      <p style="color:#495057;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Your dealer account has been created successfully. You now have access to India's
        fastest-growing eRickshaw dealership platform.
      </p>

      {_alert(f'<strong>Free Trial Active</strong> — Expires on <strong>{plan_expires}</strong>. '
              f'Enjoy full access to all features during your trial.', '#d4edda', BRAND_COLOR)}

      <h3 style="color:#212529;font-size:15px;margin:24px 0 12px;">Your Login Details</h3>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f8f9fa;border-radius:6px;padding:16px;">
        <tr>
          <td style="padding:6px 12px;font-size:14px;">
            <strong>Username:</strong> {username}<br>
            <strong>Login URL:</strong>
            <a href="{PLATFORM_URL}" style="color:{BRAND_COLOR};">{PLATFORM_URL}</a>
          </td>
        </tr>
      </table>

      <h3 style="color:#212529;font-size:15px;margin:24px 0 12px;">
        What You Can Do on {PLATFORM_NAME}
      </h3>
      <ul style="color:#495057;font-size:14px;line-height:2;padding-left:20px;margin:0 0 20px;">
        <li>📦 Manage your vehicle inventory</li>
        <li>🎯 Track leads and follow-ups</li>
        <li>💰 Record sales and generate GST invoices</li>
        <li>👥 Manage your customer database</li>
        <li>📊 View dashboard analytics</li>
        <li>🌐 Get listed in our public dealer directory</li>
      </ul>

      {_btn('Go to Your Dashboard →', PLATFORM_URL)}
      <p style="color:#6c757d;font-size:13px;margin:16px 0 0;text-align:center;">
        Need help? Contact us at
        <a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_COLOR};">{SUPPORT_EMAIL}</a>
        {f' or <a href="{SUPPORT_WA}" style="color:{BRAND_COLOR};">WhatsApp</a>' if SUPPORT_WA else ''}
      </p>
    """
    html = _wrap_html(subject, body)
    return _send(email, subject, html)


# ─── 2. Approval email (application-based registration) ───────────

def send_dealer_approval_email(dealer_name: str, email: str, username: str,
                                temp_password: str, plan_expires: str):
    subject = f'🎉 Congratulations! Your {PLATFORM_NAME} Account is Approved'
    body = f"""
      <h2 style="color:#212529;margin:0 0 8px;">
        Congratulations, {dealer_name}! 🎊
      </h2>
      <p style="color:#495057;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Your dealer application has been reviewed and <strong>approved</strong>.
        You are now part of {PLATFORM_NAME} — India's trusted eRickshaw platform.
      </p>

      {_alert(f'<strong>30-Day Free Trial Active</strong> — Full access until <strong>{plan_expires}</strong>.', '#d4edda', BRAND_COLOR)}

      <h3 style="color:#212529;font-size:15px;margin:24px 0 12px;">Your Login Credentials</h3>
      <table width="100%" cellpadding="8" cellspacing="0"
             style="background:#f8f9fa;border-radius:6px;font-size:14px;">
        <tr>
          <td style="padding:8px 16px;border-bottom:1px solid #dee2e6;">
            <strong>Username:</strong> {username}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 16px;border-bottom:1px solid #dee2e6;">
            <strong>Temporary Password:</strong>
            <code style="background:#e9ecef;padding:2px 8px;border-radius:4px;">{temp_password}</code>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 16px;">
            <strong>Login URL:</strong>
            <a href="{PLATFORM_URL}" style="color:{BRAND_COLOR};">{PLATFORM_URL}</a>
          </td>
        </tr>
      </table>

      {_alert('⚠️ Please change your password after first login for security.', '#fff3cd', ACCENT_COLOR)}

      {_btn('Login to Your Dashboard →', PLATFORM_URL)}

      <p style="color:#6c757d;font-size:13px;margin:24px 0 0;text-align:center;">
        Questions? We're here to help:<br>
        <a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_COLOR};">{SUPPORT_EMAIL}</a>
        {f' · <a href="{SUPPORT_WA}" style="color:{BRAND_COLOR};">WhatsApp Support</a>' if SUPPORT_WA else ''}
      </p>
    """
    html = _wrap_html(subject, body)
    return _send(email, subject, html)


# ─── 3. Rejection email ───────────────────────────────────────────

def send_dealer_rejection_email(dealer_name: str, email: str, reason: str = ''):
    subject = f'Update on Your {PLATFORM_NAME} Application'
    reason_block = f'<p style="color:#495057;font-size:14px;line-height:1.7;"><strong>Reason:</strong> {reason}</p>' if reason else ''
    body = f"""
      <h2 style="color:#212529;margin:0 0 8px;">Dear {dealer_name},</h2>
      <p style="color:#495057;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Thank you for your interest in {PLATFORM_NAME}. After reviewing your application,
        we are unable to approve it at this time.
      </p>
      {reason_block}
      <p style="color:#495057;font-size:14px;line-height:1.7;">
        You are welcome to re-apply after resolving the issue, or contact our support team
        for clarification and guidance.
      </p>
      {_btn('Contact Support', f'mailto:{SUPPORT_EMAIL}')}
    """
    html = _wrap_html(subject, body)
    return _send(email, subject, html)


# ─── 4. Plan expiry warning ───────────────────────────────────────

def send_plan_expiry_warning_email(dealer_name: str, email: str, days_left: int, plan_expires: str):
    urgency   = 'TODAY' if days_left == 0 else f'in {days_left} day{"s" if days_left > 1 else ""}'
    color     = '#f8d7da' if days_left <= 1 else '#fff3cd'
    border    = '#dc3545' if days_left <= 1 else ACCENT_COLOR
    subject   = f'⚠️ Your {PLATFORM_NAME} Free Trial Expires {urgency}'
    body = f"""
      <h2 style="color:#212529;margin:0 0 8px;">
        Hi {dealer_name}, your trial expires {urgency}!
      </h2>
      <p style="color:#495057;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Your {PLATFORM_NAME} Free Trial will expire on <strong>{plan_expires}</strong>.
        Don't lose access to your leads, inventory, and sales data!
      </p>

      {_alert(f'<strong>Trial expires {urgency}</strong> — Upgrade to Pro to continue uninterrupted access.', color, border)}

      <h3 style="color:#212529;font-size:15px;margin:24px 0 12px;">Why Upgrade to Pro?</h3>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding:8px;vertical-align:top;">
            <div style="background:#f8f9fa;border-radius:6px;padding:16px;">
              <h4 style="margin:0 0 8px;color:#6c757d;font-size:13px;text-transform:uppercase;">
                Free Trial
              </h4>
              <ul style="color:#6c757d;font-size:13px;line-height:2;padding-left:16px;margin:0;">
                <li>30 days access</li>
                <li>Up to 10 vehicles</li>
                <li>Basic dashboard</li>
                <li>Email support</li>
              </ul>
            </div>
          </td>
          <td width="50%" style="padding:8px;vertical-align:top;">
            <div style="background:#e8f5e9;border-radius:6px;padding:16px;border:2px solid {BRAND_COLOR};">
              <h4 style="margin:0 0 8px;color:{BRAND_COLOR};font-size:13px;text-transform:uppercase;">
                ✓ Pro Plan
              </h4>
              <ul style="color:#212529;font-size:13px;line-height:2;padding-left:16px;margin:0;">
                <li>Unlimited vehicles</li>
                <li>Full analytics & reports</li>
                <li>GST invoicing</li>
                <li>WhatsApp notifications</li>
                <li>Priority support</li>
                <li>Public directory listing</li>
              </ul>
            </div>
          </td>
        </tr>
      </table>

      {_btn('Upgrade to Pro — Contact Us', f'mailto:{SUPPORT_EMAIL}?subject=Upgrade to Pro Plan')}

      <p style="color:#6c757d;font-size:13px;margin:16px 0 0;text-align:center;">
        Or call/WhatsApp us at {SUPPORT_PHONE}
      </p>
    """
    html = _wrap_html(subject, body)
    return _send(email, subject, html)


# ─── 5. New lead notification to dealer ──────────────────────────

def send_new_lead_email(dealer_email: str, dealer_name: str, customer_name: str,
                         customer_phone: str, vehicle_name: str, source: str):
    subject = f'🎯 New Lead: {customer_name} is interested in {vehicle_name}'
    body = f"""
      <h2 style="color:#212529;margin:0 0 8px;">New Lead Alert! 🎯</h2>
      <p style="color:#495057;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hi {dealer_name}, a new customer has shown interest in your vehicle.
        Follow up quickly for the best conversion rate!
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f8f9fa;border-radius:6px;font-size:14px;margin:0 0 20px;">
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #dee2e6;">
            <strong>Customer Name:</strong> {customer_name}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #dee2e6;">
            <strong>Phone:</strong>
            <a href="tel:{customer_phone}" style="color:{BRAND_COLOR};">{customer_phone}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #dee2e6;">
            <strong>Vehicle Interest:</strong> {vehicle_name}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;">
            <strong>Source:</strong> {source.replace('_', ' ').title()}
          </td>
        </tr>
      </table>

      {_alert('💡 <strong>Pro Tip:</strong> Follow up within 1 hour to increase conversion by 7x!', '#d4edda', BRAND_COLOR)}

      {_btn('View Lead in Dashboard →', PLATFORM_URL)}
    """
    html = _wrap_html(subject, body)
    return _send(dealer_email, subject, html)


# ─── 6. New public enquiry notification ──────────────────────────

def send_public_enquiry_notification(dealer_email: str, dealer_name: str,
                                      customer_name: str, customer_phone: str,
                                      city: str, vehicle_name: str = ''):
    subject = f'📩 New Enquiry from {customer_name} ({city})'
    vehicle_row = f"""
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #dee2e6;">
          <strong>Vehicle Enquiry:</strong> {vehicle_name}
        </td>
      </tr>""" if vehicle_name else ''

    body = f"""
      <h2 style="color:#212529;margin:0 0 8px;">New Customer Enquiry! 📩</h2>
      <p style="color:#495057;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hi {dealer_name}, a customer from <strong>{city}</strong> submitted an enquiry
        through the {PLATFORM_NAME} marketplace.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f8f9fa;border-radius:6px;font-size:14px;margin:0 0 20px;">
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #dee2e6;">
            <strong>Name:</strong> {customer_name}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #dee2e6;">
            <strong>Phone:</strong>
            <a href="tel:{customer_phone}" style="color:{BRAND_COLOR};">{customer_phone}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #dee2e6;">
            <strong>City:</strong> {city}
          </td>
        </tr>
        {vehicle_row}
      </table>

      {_btn('View Enquiry in Dashboard →', PLATFORM_URL)}
    """
    html = _wrap_html(subject, body)
    return _send(dealer_email, subject, html)


# ─── 7. Admin alert: new dealer registration ─────────────────────

def send_admin_new_dealer_alert(dealer_name: str, username: str, phone: str, city: str):
    admin_email = getattr(settings, 'ADMIN_EMAIL', '')
    if not admin_email:
        return False
    subject = f'[Admin] New Dealer Registration: {dealer_name}'
    body = f"""
      <h2 style="color:#212529;margin:0 0 8px;">New Dealer Registration</h2>
      <p style="color:#495057;font-size:15px;">
        A new dealer has registered on {PLATFORM_NAME} and is pending verification.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f8f9fa;border-radius:6px;font-size:14px;margin:0 0 20px;">
        <tr><td style="padding:10px 16px;border-bottom:1px solid #dee2e6;">
          <strong>Dealer Name:</strong> {dealer_name}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #dee2e6;">
          <strong>Username:</strong> {username}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #dee2e6;">
          <strong>Phone:</strong> {phone}</td></tr>
        <tr><td style="padding:10px 16px;">
          <strong>City:</strong> {city}</td></tr>
      </table>
      {_btn('Review in Admin Panel →', f'{PLATFORM_URL.replace("www", "api")}/admin/api/dealerprofile/')}
    """
    html = _wrap_html(subject, body)
    return _send(admin_email, subject, html)
