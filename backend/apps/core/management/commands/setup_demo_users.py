import time
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.authentication.models import User
from apps.accounts.models import VirtualAccount, LedgerTransaction
from apps.dhan_v2.models import Order, Trade, Position

class Command(BaseCommand):
    help = 'Provisions 1 Super Admin and 2 Trader Users with initialized virtual accounts and sample trades.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Setting up 1 Super Admin and 2 Trader Users..."))

        demo_users_data = [
            {
                'email': 'satheeshappz@gmail.com',
                'full_name': 'Super Admin',
                'dhan_client_id': '1000000001',
                'client_secret': 'sec_anvil_admin_master_secret_01',
                'access_token': 'dhn_sec_sandbox_admin_token_2026',
                'is_staff': True,
                'is_superuser': True,
                'password': 'Admin@123',
                'balance': Decimal('500000.00'),
            },
            {
                'email': 'appzfx13@gmail.local',
                'full_name': 'Vikram Quant',
                'dhan_client_id': '1000000002',
                'client_secret': 'sec_anvil_trader1_secret_02',
                'access_token': 'dhn_sec_sandbox_trader1_token_2026',
                'is_staff': False,
                'is_superuser': False,
                'password': 'Trader1@123',
                'balance': Decimal('500000.00'),
            },
            {
                'email': 'trader2@anvil.local',
                'full_name': 'Aarav Algo',
                'dhan_client_id': '1000000003',
                'client_secret': 'sec_anvil_trader2_secret_03',
                'access_token': 'dhn_sec_sandbox_trader2_token_2026',
                'is_staff': False,
                'is_superuser': False,
                'password': 'Trader2@123',
                'balance': Decimal('500000.00'),
            },
        ]

        created_users = []

        for data in demo_users_data:
            user = User.objects.filter(email=data['email']).first()
            if not user:
                # Also check if client ID exists
                user = User.objects.filter(dhan_client_id=data['dhan_client_id']).first()

            if user:
                user.email = data['email']
                user.full_name = data['full_name']
                user.dhan_client_id = data['dhan_client_id']
                user.client_secret = data['client_secret']
                user.access_token = data['access_token']
                user.is_staff = data['is_staff']
                user.is_superuser = data['is_superuser']
                user.is_verified = True
                user.is_active = True
                user.set_password(data['password'])
                user.save()
            else:
                user = User.objects.create(
                    email=data['email'],
                    full_name=data['full_name'],
                    dhan_client_id=data['dhan_client_id'],
                    client_secret=data['client_secret'],
                    access_token=data['access_token'],
                    is_staff=data['is_staff'],
                    is_superuser=data['is_superuser'],
                    is_verified=True,
                    is_active=True,
                )
                user.set_password(data['password'])
                user.save()

            # Ensure Virtual Account
            account, _ = VirtualAccount.objects.get_or_create(
                user=user,
                defaults={
                    'dhan_client_id': user.dhan_client_id,
                    'account_name': f"{user.full_name} Ledger",
                    'availabel_balance': data['balance'],
                    'sod_limit': data['balance'],
                    'withdrawable_balance': data['balance'],
                }
            )

            created_users.append(user)
            self.stdout.write(self.style.SUCCESS(
                f"✓ User: {user.full_name} ({user.email}) | Client ID: {user.dhan_client_id} | Admin: {user.is_staff}"
            ))

        # Create sample initial trades & positions for Trader 1 and Trader 2 if none exist
        trader1 = created_users[1]
        trader2 = created_users[2]

        if not Order.objects.filter(dhan_client_id=trader1.dhan_client_id).exists():
            # Create a sample buy order & trade for Trader 1
            o1 = Order.objects.create(
                order_id=Order.generate_order_id(),
                dhan_client_id=trader1.dhan_client_id,
                transaction_type='BUY',
                exchange_segment='NSE_FNO',
                product_type='INTRADAY',
                order_type='MARKET',
                security_id='2250001',
                trading_symbol='NIFTY 26OCT 22500 CE',
                quantity=50,
                price=Decimal('54.50'),
                average_price=Decimal('54.50'),
                filled_qty=50,
                order_status='TRADED',
                exchange_order_id='EX10001',
            )
            Trade.objects.create(
                trade_id=Trade.generate_trade_id(),
                order=o1,
                dhan_client_id=trader1.dhan_client_id,
                trading_symbol='NIFTY 26OCT 22500 CE',
                security_id='2250001',
                transaction_type='BUY',
                traded_qty=50,
                traded_price=Decimal('54.50'),
            )
            Position.objects.create(
                dhan_client_id=trader1.dhan_client_id,
                security_id='2250001',
                trading_symbol='NIFTY 26OCT 22500 CE',
                exchange_segment='NSE_FNO',
                product_type='INTRADAY',
                buy_qty=50,
                buy_avg=Decimal('54.50'),
                sell_qty=0,
                sell_avg=Decimal('0.00'),
                net_qty=50,
                realized_profit=Decimal('0.00'),
                unrealized_profit=Decimal('125.00'),
            )
            self.stdout.write(self.style.SUCCESS("✓ Sample position & order created for Trader 1 (Vikram Quant)"))

        if not Order.objects.filter(dhan_client_id=trader2.dhan_client_id).exists():
            # Create a sample buy order & trade for Trader 2
            o2 = Order.objects.create(
                order_id=Order.generate_order_id(),
                dhan_client_id=trader2.dhan_client_id,
                transaction_type='BUY',
                exchange_segment='NSE_FNO',
                product_type='INTRADAY',
                order_type='MARKET',
                security_id='5520002',
                trading_symbol='BANKNIFTY 26OCT 55200 PE',
                quantity=30,
                price=Decimal('529.80'),
                average_price=Decimal('529.80'),
                filled_qty=30,
                order_status='TRADED',
                exchange_order_id='EX10002',
            )
            Trade.objects.create(
                trade_id=Trade.generate_trade_id(),
                order=o2,
                dhan_client_id=trader2.dhan_client_id,
                trading_symbol='BANKNIFTY 26OCT 55200 PE',
                security_id='5520002',
                transaction_type='BUY',
                traded_qty=30,
                traded_price=Decimal('529.80'),
            )
            Position.objects.create(
                dhan_client_id=trader2.dhan_client_id,
                security_id='5520002',
                trading_symbol='BANKNIFTY 26OCT 55200 PE',
                exchange_segment='NSE_FNO',
                product_type='INTRADAY',
                buy_qty=30,
                buy_avg=Decimal('529.80'),
                sell_qty=0,
                sell_avg=Decimal('0.00'),
                net_qty=30,
                realized_profit=Decimal('0.00'),
                unrealized_profit=Decimal('240.00'),
            )
            self.stdout.write(self.style.SUCCESS("✓ Sample position & order created for Trader 2 (Aarav Algo)"))

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] Setup complete: 1 Admin and 2 Traders ready for sandbox!"))
