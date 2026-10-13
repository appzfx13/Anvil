from django.db import models
from django.conf import settings
from decimal import Decimal

class VirtualAccount(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='virtual_account')
    dhan_client_id = models.CharField(max_length=20, unique=True, db_index=True)
    account_name = models.CharField(max_length=150, default='Primary Trading Account')
    
    # Balance & Margins (Zero Initial Balance)
    availabel_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    sod_limit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    collateral_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    receiveable_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    utilized_margin = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    blocked_payout_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    withdrawable_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.account_name} ({self.dhan_client_id}) - ₹{self.availabel_balance}"

    def adjust_balance(self, amount: Decimal, reason: str = 'Manual Adjustment'):
        """Safely adjust virtual account balance."""
        self.availabel_balance += amount
        self.withdrawable_balance = max(Decimal('0.00'), self.availabel_balance)
        self.save()
        
        LedgerTransaction.objects.create(
            account=self,
            amount=amount,
            transaction_type='DEPOSIT' if amount > 0 else 'WITHDRAW',
            balance_after=self.availabel_balance,
            notes=reason
        )

    def block_margin(self, margin_amount: Decimal):
        """Block margin for open order or position."""
        self.utilized_margin += margin_amount
        self.availabel_balance = max(Decimal('0.00'), self.availabel_balance - margin_amount)
        self.withdrawable_balance = self.availabel_balance
        self.save()

    def release_margin(self, margin_amount: Decimal):
        """Release margin when order/position closes."""
        self.utilized_margin = max(Decimal('0.00'), self.utilized_margin - margin_amount)
        self.availabel_balance += margin_amount
        self.withdrawable_balance = self.availabel_balance
        self.save()

class LedgerTransaction(models.Model):
    account = models.ForeignKey(VirtualAccount, on_delete=models.CASCADE, related_name='ledger_transactions')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    transaction_type = models.CharField(max_length=40)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    notes = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {self.transaction_type}: ₹{self.amount} (Bal: ₹{self.balance_after})"
