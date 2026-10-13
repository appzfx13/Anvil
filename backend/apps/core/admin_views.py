"""
ANVIL Admin Portal Management APIs.
Provides multi-trader administration, ledger controls, global order/trade monitoring,
and risk management for the Sandbox Terminal.
"""
from decimal import Decimal
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.authentication.models import User
from apps.accounts.models import VirtualAccount, LedgerTransaction
from apps.dhan_v2.models import Order, Trade, Position
from apps.core.models import SiteConfiguration

class AdminTradersListView(APIView):
    """
    GET /api/admin-portal/traders/
    Retrieves full roster of registered sandbox traders with live ledger telemetry.
    """
    def get(self, request):
        users = User.objects.all().order_by('id')
        trader_list = []

        for u in users:
            acct = VirtualAccount.objects.filter(user=u).first()
            avail = float(acct.availabel_balance) if acct else 500000.0
            sod = float(acct.sod_limit) if acct else 500000.0
            utilized = float(acct.utilized_margin) if acct else 0.0

            orders_count = Order.objects.filter(dhan_client_id=u.dhan_client_id).count()
            trades_count = Trade.objects.filter(dhan_client_id=u.dhan_client_id).count()
            positions_count = Position.objects.filter(dhan_client_id=u.dhan_client_id).count()

            trader_list.append({
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name or 'Quant Trader',
                'dhan_client_id': u.dhan_client_id,
                'client_secret': u.client_secret,
                'access_token': u.access_token,
                'kill_switch_active': u.kill_switch_active,
                'is_staff': u.is_staff,
                'is_superuser': u.is_superuser,
                'is_active': u.is_active,
                'date_joined': u.date_joined,
                'available_balance': avail,
                'sod_limit': sod,
                'utilized_margin': utilized,
                'orders_count': orders_count,
                'trades_count': trades_count,
                'positions_count': positions_count,
            })

        return Response({'traders': trader_list, 'total_count': len(trader_list)}, status=status.HTTP_200_OK)

class AdminTraderActionView(APIView):
    """
    POST /api/admin-portal/traders/<user_id>/action/
    Admin actions: 'adjust_balance', 'toggle_killswitch', 'reset_ledger', 'update_profile'
    """
    def post(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'error': 'Trader not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        account, _ = VirtualAccount.objects.get_or_create(
            user=user,
            defaults={
                'dhan_client_id': user.dhan_client_id,
                'account_name': user.full_name or 'Trading Ledger',
                'availabel_balance': Decimal('500000.00'),
                'sod_limit': Decimal('500000.00'),
            }
        )

        if action == 'adjust_balance':
            try:
                amt = Decimal(str(request.data.get('amount', '0')))
                reason = request.data.get('reason', 'Admin Ledger Adjustment')
                account.adjust_balance(amt, reason=reason)
                return Response({
                    'success': True,
                    'message': f"Adjusted balance by ₹{amt:,.2f} for {user.email}.",
                    'new_balance': float(account.availabel_balance)
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': f"Failed to adjust balance: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        elif action == 'toggle_killswitch':
            new_state = not user.kill_switch_active
            user.kill_switch_active = new_state
            user.save(update_fields=['kill_switch_active'])

            cancelled_orders = 0
            squared_positions = 0
            if new_state:
                # Cancel pending orders
                pending = Order.objects.filter(dhan_client_id=user.dhan_client_id, order_status='PENDING')
                cancelled_orders = pending.count()
                pending.update(order_status='CANCELLED', rejection_reason='Admin Emergency Kill Switch Triggered')

                # Square off positions
                open_pos = Position.objects.filter(dhan_client_id=user.dhan_client_id, net_qty__gt=0)
                squared_positions = open_pos.count()
                open_pos.update(net_qty=0)

            return Response({
                'success': True,
                'kill_switch_active': new_state,
                'cancelled_orders': cancelled_orders,
                'squared_positions': squared_positions,
                'message': f"Kill switch {'ACTIVATED' if new_state else 'DEACTIVATED'} for {user.dhan_client_id}."
            }, status=status.HTTP_200_OK)

        elif action == 'reset_ledger':
            # Reset balance to SOD 500,000, clear utilized margin, cancel orders, clear positions
            account.availabel_balance = Decimal('500000.00')
            account.utilized_margin = Decimal('0.00')
            account.withdrawable_balance = Decimal('500000.00')
            account.save()

            Order.objects.filter(dhan_client_id=user.dhan_client_id, order_status='PENDING').update(
                order_status='CANCELLED', rejection_reason='Admin Ledger Reset'
            )
            Position.objects.filter(dhan_client_id=user.dhan_client_id).delete()

            return Response({
                'success': True,
                'message': f"Ledger reset to ₹500,000.00 for {user.email}.",
                'available_balance': 500000.00
            }, status=status.HTTP_200_OK)

        elif action == 'update_profile':
            full_name = request.data.get('full_name')
            email = request.data.get('email')
            is_staff = request.data.get('is_staff')

            if full_name is not None:
                user.full_name = str(full_name).strip()
            if email:
                user.email = str(email).strip().lower()
            if is_staff is not None:
                user.is_staff = bool(is_staff)

            user.save()
            return Response({
                'success': True,
                'message': f"Updated profile for {user.dhan_client_id}.",
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'is_staff': user.is_staff,
                }
            }, status=status.HTTP_200_OK)

        return Response({'error': f"Unknown action: {action}"}, status=status.HTTP_400_BAD_REQUEST)

class AdminTradesListView(APIView):
    """
    GET /api/admin-portal/trades/
    Returns unified trade execution log across all traders in reverse chronological order.
    """
    def get(self, request):
        trades = Trade.objects.all().select_related('order').order_by('-exchange_time')[:100]
        trade_data = []

        # Map client IDs to names
        user_map = {u.dhan_client_id: u for u in User.objects.all()}

        for t in trades:
            u = user_map.get(t.dhan_client_id)
            trade_data.append({
                'id': t.id,
                'trade_id': t.trade_id,
                'order_id': t.order.order_id if t.order else '',
                'dhan_client_id': t.dhan_client_id,
                'trader_name': u.full_name if u else 'Trader',
                'trader_email': u.email if u else '',
                'trading_symbol': t.trading_symbol,
                'security_id': t.security_id,
                'transaction_type': t.transaction_type,
                'traded_qty': t.traded_qty,
                'traded_price': float(t.traded_price),
                'exchange_time': t.exchange_time,
            })

        return Response({'trades': trade_data, 'total_count': len(trade_data)}, status=status.HTTP_200_OK)

class AdminOrdersListView(APIView):
    """
    GET /api/admin-portal/orders/
    Returns unified order book across all traders.
    """
    def get(self, request):
        orders = Order.objects.all().order_by('-order_timestamp')[:100]
        user_map = {u.dhan_client_id: u for u in User.objects.all()}

        order_data = []
        for o in orders:
            u = user_map.get(o.dhan_client_id)
            order_data.append({
                'id': o.id,
                'order_id': o.order_id,
                'dhan_client_id': o.dhan_client_id,
                'trader_name': u.full_name if u else 'Trader',
                'trader_email': u.email if u else '',
                'trading_symbol': o.trading_symbol,
                'transaction_type': o.transaction_type,
                'exchange_segment': o.exchange_segment,
                'product_type': o.product_type,
                'order_type': o.order_type,
                'quantity': o.quantity,
                'price': float(o.price),
                'order_status': o.order_status,
                'rejection_reason': o.rejection_reason,
                'filled_qty': o.filled_qty,
                'average_price': float(o.average_price),
                'order_timestamp': o.order_timestamp,
            })

        return Response({'orders': order_data, 'total_count': len(order_data)}, status=status.HTTP_200_OK)

class AdminSystemOverviewView(APIView):
    """
    GET /api/admin-portal/overview/
    High-level platform and risk telemetry for the master admin console.
    """
    def get(self, request):
        total_traders = User.objects.count()
        total_orders = Order.objects.count()
        total_trades = Trade.objects.count()
        total_positions = Position.objects.count()

        config = SiteConfiguration.get_solo()
        active_kill_switches = User.objects.filter(kill_switch_active=True).count()

        total_margin = sum([float(a.availabel_balance) for a in VirtualAccount.objects.all()])
        total_utilized = sum([float(a.utilized_margin) for a in VirtualAccount.objects.all()])

        return Response({
            'total_traders': total_traders,
            'total_orders': total_orders,
            'total_trades': total_trades,
            'total_positions': total_positions,
            'active_kill_switches': active_kill_switches,
            'total_virtual_margin': total_margin,
            'total_utilized_margin': total_utilized,
            'feed_status': config.feed_status,
            'feed_app_id': config.fyers_app_id,
            'has_feed_token': bool(config.fyers_access_token),
            'timestamp': timezone.now(),
        }, status=status.HTTP_200_OK)
