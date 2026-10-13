from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.accounts.models import VirtualAccount, LedgerTransaction
from apps.authentication.models import User

def get_target_account(request) -> VirtualAccount:
    """Helper to locate the active account from auth headers or request params."""
    client_id = request.headers.get('client-id') or request.query_params.get('clientId') or request.data.get('clientId')
    if client_id:
        acc = VirtualAccount.objects.filter(dhan_client_id=client_id).first()
        if acc:
            return acc
    
    # Try finding account via JWT/Session user
    if request.user and request.user.is_authenticated:
        acc = getattr(request.user, 'virtual_account', None)
        if acc:
            return acc

    # Default to first available account
    return VirtualAccount.objects.first()

class AccountSummaryView(APIView):
    """
    GET /api/accounts/summary
    Retrieves full telemetry for the active trading account.
    """
    def get(self, request):
        account = get_target_account(request)
        if not account:
            return Response({'error': 'No active account found'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': True,
            'dhan_client_id': account.dhan_client_id,
            'account_name': account.account_name,
            'availabel_balance': float(account.availabel_balance),
            'sod_limit': float(account.sod_limit),
            'collateral_amount': float(account.collateral_amount),
            'utilized_margin': float(account.utilized_margin),
            'withdrawable_balance': float(account.withdrawable_balance),
            'transactions': [
                {
                    'id': tx.id,
                    'amount': float(tx.amount),
                    'type': tx.transaction_type,
                    'balance_after': float(tx.balance_after),
                    'notes': tx.notes,
                    'timestamp': tx.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                } for tx in account.ledger_transactions.all()[:10]
            ]
        }, status=status.HTTP_200_OK)

class AdjustFundsView(APIView):
    """
    POST /api/accounts/adjust-funds
    Deposit or withdraw virtual sandbox funds.
    """
    def post(self, request):
        account = get_target_account(request)
        if not account:
            return Response({'error': 'No active account found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            amount = Decimal(str(request.data.get('amount', '0')))
        except Exception:
            return Response({'error': 'Invalid numeric amount'}, status=status.HTTP_400_BAD_REQUEST)

        if amount == 0:
            return Response({'error': 'Amount must be non-zero'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', 'Sandbox Virtual Adjustment')
        account.adjust_balance(amount, reason)

        return Response({
            'success': True,
            'message': f"Account successfully adjusted by ₹{amount:,.2f}",
            'availabel_balance': float(account.availabel_balance),
            'withdrawable_balance': float(account.withdrawable_balance),
        }, status=status.HTTP_200_OK)

class ResetAccountView(APIView):
    """
    POST /api/accounts/reset
    Resets account balance, wipes all trades, orders, and positions back to SOD state.
    """
    def post(self, request):
        account = get_target_account(request)
        if not account:
            return Response({'error': 'No active account found'}, status=status.HTTP_404_NOT_FOUND)

        client_id = (
            getattr(account.user, 'dhan_client_id', '') or 
            getattr(account, 'dhan_client_id', '') or 
            request.headers.get('client-id') or 
            request.query_params.get('clientId') or 
            '1000000001'
        )

        # 1. Reset ledger values
        account.availabel_balance = account.sod_limit
        account.utilized_margin = Decimal('0.00')
        account.withdrawable_balance = account.sod_limit
        account.save()

        # 2. Completely purge all trades, orders, and positions for this client
        try:
            from apps.dhan_v2.models import Position, Order, Trade
            Trade.objects.filter(dhan_client_id=client_id).delete()
            Order.objects.filter(dhan_client_id=client_id).delete()
            Position.objects.filter(dhan_client_id=client_id).delete()
        except Exception:
            pass

        # 3. Clean up ledger transactions and create fresh baseline
        LedgerTransaction.objects.filter(account=account).delete()
        LedgerTransaction.objects.create(
            account=account,
            amount=Decimal('0.00'),
            transaction_type='SESSION_RESET',
            balance_after=account.availabel_balance,
            notes='Session reset to Start of Day (SOD) limit'
        )

        return Response({
            'success': True,
            'message': 'Sandbox session, orders, trades, and positions completely reset to SOD.',
            'availabel_balance': float(account.availabel_balance),
            'sod_limit': float(account.sod_limit),
            'utilized_margin': 0.0,
        }, status=status.HTTP_200_OK)


