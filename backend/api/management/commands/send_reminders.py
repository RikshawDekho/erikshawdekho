"""
Management command: send_reminders

Sends plan expiry warnings and follow-up reminders.
Run daily via Railway Cron or any scheduler:

  python manage.py send_reminders

Railway Cron setup (railway.toml or Railway dashboard):
  Schedule: 0 9 * * *  (every day at 9 AM IST)
  Command:  python manage.py send_reminders
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Send plan expiry warnings, follow-up reminders, and EMI due alerts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print what would be sent without actually sending'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        self.stdout.write(f'\n{"[DRY RUN] " if dry_run else ""}Sending reminders at {now.strftime("%Y-%m-%d %H:%M")} IST\n')

        self._send_plan_expiry_reminders(now, dry_run)
        self._send_lead_followup_reminders(now, dry_run)

        self.stdout.write(self.style.SUCCESS('\n✓ Reminders processed.\n'))

    # ── Plan expiry warnings ───────────────────────────────────────

    def _send_plan_expiry_reminders(self, now, dry_run):
        from api.models import DealerProfile
        from api.emails import send_plan_expiry_warning_email
        from api.notifications import notify_dealer_plan_expiry

        warning_days = [7, 3, 1, 0]  # Send warnings at these days remaining
        sent = 0

        for days in warning_days:
            target_date = now + timedelta(days=days)
            # Match dealers expiring on that day (within 24h window)
            dealers = DealerProfile.objects.filter(
                plan_expires_at__date=target_date.date(),
            ).select_related('user')

            for dealer in dealers:
                email = dealer.user.email
                self.stdout.write(
                    f'  Plan expiry ({days}d): {dealer.dealer_name} | {email} | {dealer.phone}'
                )
                if dry_run:
                    continue
                expires_str = dealer.plan_expires_at.strftime('%d %b %Y')
                if email and dealer.notify_email:
                    send_plan_expiry_warning_email(
                        dealer_name=dealer.dealer_name,
                        email=email,
                        days_left=days,
                        plan_expires=expires_str,
                    )
                if dealer.phone and dealer.notify_whatsapp:
                    notify_dealer_plan_expiry(dealer.dealer_name, dealer.phone, days)
                sent += 1

        self.stdout.write(f'  → Plan expiry reminders: {sent} sent')

    # ── Lead follow-up reminders ───────────────────────────────────

    def _send_lead_followup_reminders(self, now, dry_run):
        from api.models import Lead
        from api.notifications import notify_dealer_new_lead

        today = now.date()
        overdue_leads = Lead.objects.filter(
            follow_up_date=today,
            status__in=['new', 'interested', 'follow_up'],
        ).select_related('dealer__user', 'vehicle')

        sent = 0
        for lead in overdue_leads:
            dealer = lead.dealer
            vehicle_name = str(lead.vehicle) if lead.vehicle else 'a vehicle'
            self.stdout.write(
                f'  Follow-up due: {lead.customer_name} → {dealer.dealer_name}'
            )
            if dry_run:
                continue
            if dealer.phone and dealer.notify_whatsapp:
                from api.notifications import send_whatsapp, wa_new_lead
                msg = (
                    f"📅 *Follow-up Reminder — eRickshawDekho*\n\n"
                    f"Namaste {dealer.dealer_name} ji,\n\n"
                    f"You have a follow-up due today with:\n"
                    f"*{lead.customer_name}* — {lead.phone}\n"
                    f"Interested in: {vehicle_name}\n\n"
                    f"_Team eRickshawDekho_ 🛺"
                )
                send_whatsapp(dealer.phone, msg)
            sent += 1

        self.stdout.write(f'  → Follow-up reminders: {sent} sent')
