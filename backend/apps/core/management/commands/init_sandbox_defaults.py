from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.authentication.models import User
from apps.accounts.models import VirtualAccount
from apps.core.utils import fetch_ngrok_url

class Command(BaseCommand):
    help = "Initializes default sandbox trader, Dhan API credentials, and ₹5,00,000 ledger balance safely."

    def handle(self, *args, **options):
        email = "trader@anvil.local"
        default_client_id = "1000000001"
        default_token = "dhn_sec_sandbox_demo_token_2026"

        user = User.objects.filter(dhan_client_id=default_client_id).first()
        if not user:
            user = User.objects.filter(email=email).first()
        if not user:
            user = User.objects.create(
                email=email,
                full_name='Alpha Quant Trader',
                dhan_client_id=default_client_id,
                access_token=default_token,
                is_verified=True,
                is_active=True,
            )

        account = VirtualAccount.objects.filter(user=user).first()
        if not account:
            account = VirtualAccount.objects.filter(dhan_client_id=user.dhan_client_id).first()
        if not account:
            account = VirtualAccount.objects.create(
                user=user,
                dhan_client_id=user.dhan_client_id,
                account_name='Primary Sandbox Ledger',
                availabel_balance=Decimal(str(settings.DEFAULT_SOD_BALANCE)),
                sod_limit=Decimal(str(settings.DEFAULT_SOD_BALANCE)),
                withdrawable_balance=Decimal(str(settings.DEFAULT_SOD_BALANCE)),
            )
        elif account.dhan_client_id != user.dhan_client_id:
            account.dhan_client_id = user.dhan_client_id
            account.save(update_fields=['dhan_client_id'])

        ngrok_url = fetch_ngrok_url(retries=3, delay=1)
        if ngrok_url:
            self.stdout.write(self.style.SUCCESS(f"\nNGROK Tunnel URL: {ngrok_url}"))
        else:
            self.stdout.write(self.style.WARNING("\nNGROK Tunnel URL: Not available or ngrok tunnel offline."))

        self.stdout.write(self.style.SUCCESS(
            f"[ANVIL-INIT] Default sandbox initialized successfully:\n"
            f"  - Email: {user.email}\n"
            f"  - Dhan Client ID: {user.dhan_client_id}\n"
            f"  - Access Token: {user.access_token}\n"
            f"  - Available Margin: ₹{account.availabel_balance:,.2f}"
        ))
