from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.authentication.models import User
from apps.accounts.models import VirtualAccount

class Command(BaseCommand):
    help = "Initializes default sandbox trader, Dhan API credentials, and ₹5,00,000 ledger balance."

    def handle(self, *args, **options):
        email = "trader@anvil.local"
        default_client_id = "1000000001"
        default_token = "dhn_sec_sandbox_demo_token_2026"

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name': 'Alpha Quant Trader',
                'dhan_client_id': default_client_id,
                'access_token': default_token,
                'is_verified': True,
                'is_active': True,
            }
        )

        account, acc_created = VirtualAccount.objects.get_or_create(
            dhan_client_id=user.dhan_client_id,
            defaults={
                'user': user,
                'account_name': 'Primary Sandbox Ledger',
                'availabel_balance': Decimal(str(settings.DEFAULT_SOD_BALANCE)),
                'sod_limit': Decimal(str(settings.DEFAULT_SOD_BALANCE)),
                'withdrawable_balance': Decimal(str(settings.DEFAULT_SOD_BALANCE)),
            }
        )

        self.stdout.write(self.style.SUCCESS(
            f"[ANVIL-INIT] Default sandbox initialized successfully:\n"
            f"  - Email: {user.email}\n"
            f"  - Dhan Client ID: {user.dhan_client_id}\n"
            f"  - Access Token: {user.access_token}\n"
            f"  - Available Margin: ₹{account.availabel_balance:,.2f}"
        ))
