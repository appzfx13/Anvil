import secrets
import time
from decimal import Decimal
from django.db import models
from django.utils import timezone
from apps.core.constants import (
    TransactionType,
    OrderType,
    ProductType,
    OrderValidity,
    OrderStatus,
    PositionType,
    ExchangeSegment
)

class Order(models.Model):
    order_id = models.CharField(max_length=32, unique=True, db_index=True)
    dhan_client_id = models.CharField(max_length=20, db_index=True)
    correlation_id = models.CharField(max_length=50, blank=True, default='')
    
    # Order Parameters
    transaction_type = models.CharField(max_length=10, choices=[(t.value, t.value) for t in TransactionType])
    exchange_segment = models.CharField(max_length=20, choices=[(s.value, s.value) for s in ExchangeSegment], default=ExchangeSegment.NSE_FNO.value)
    product_type = models.CharField(max_length=20, choices=[(p.value, p.value) for p in ProductType], default=ProductType.INTRADAY.value)
    order_type = models.CharField(max_length=20, choices=[(o.value, o.value) for o in OrderType], default=OrderType.MARKET.value)
    validity = models.CharField(max_length=10, choices=[(v.value, v.value) for v in OrderValidity], default=OrderValidity.DAY.value)
    
    # Instrument Details
    security_id = models.CharField(max_length=30, db_index=True)
    trading_symbol = models.CharField(max_length=50)
    
    # Quantity & Pricing
    quantity = models.PositiveIntegerField()
    disclosed_quantity = models.PositiveIntegerField(default=0)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    trigger_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # Bracket Order Values
    bo_profit_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    bo_stop_loss_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # Lifecycle & Execution Status
    order_status = models.CharField(max_length=20, choices=[(s.value, s.value) for s in OrderStatus], default=OrderStatus.PENDING.value)
    rejection_reason = models.CharField(max_length=255, blank=True, default='')
    average_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    filled_qty = models.PositiveIntegerField(default=0)
    
    exchange_order_id = models.CharField(max_length=40, blank=True, default='')
    order_timestamp = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-order_timestamp']

    def __str__(self):
        return f"[{self.order_id}] {self.transaction_type} {self.quantity}x {self.trading_symbol} @ {self.price} ({self.order_status})"

    @classmethod
    def generate_order_id(cls) -> str:
        """Generates Dhan style Order ID: DHN{timestamp_ms}{4_random_digits}."""
        ts = int(time.time() * 1000)
        rand = secrets.randbelow(9000) + 1000
        return f"DHN{ts}{rand}"

class Trade(models.Model):
    trade_id = models.CharField(max_length=32, unique=True, db_index=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='trades')
    dhan_client_id = models.CharField(max_length=20, db_index=True)
    
    trading_symbol = models.CharField(max_length=50)
    security_id = models.CharField(max_length=30)
    transaction_type = models.CharField(max_length=10)
    
    traded_qty = models.PositiveIntegerField()
    traded_price = models.DecimalField(max_digits=12, decimal_places=2)
    exchange_time = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-exchange_time']

    def __str__(self):
        return f"[{self.trade_id}] {self.transaction_type} {self.traded_qty}x {self.trading_symbol} @ ₹{self.traded_price}"

    @classmethod
    def generate_trade_id(cls) -> str:
        ts = int(time.time() * 1000)
        rand = secrets.randbelow(900) + 100
        return f"TRD{ts}{rand}"

class Position(models.Model):
    dhan_client_id = models.CharField(max_length=20, db_index=True)
    security_id = models.CharField(max_length=30, db_index=True)
    trading_symbol = models.CharField(max_length=50)
    exchange_segment = models.CharField(max_length=20, default=ExchangeSegment.NSE_FNO.value)
    product_type = models.CharField(max_length=20, default=ProductType.INTRADAY.value)
    position_type = models.CharField(max_length=15, default=PositionType.LONG.value)
    
    buy_qty = models.PositiveIntegerField(default=0)
    buy_avg = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    sell_qty = models.PositiveIntegerField(default=0)
    sell_avg = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    net_qty = models.IntegerField(default=0)
    
    realized_profit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    unrealized_profit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    
    stop_loss = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    take_profit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    entry_time = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('dhan_client_id', 'security_id', 'product_type')

    def __str__(self):
        return f"{self.trading_symbol} (Net: {self.net_qty}, BuyAvg: ₹{self.buy_avg}, SellAvg: ₹{self.sell_avg})"

class Holding(models.Model):
    dhan_client_id = models.CharField(max_length=20, db_index=True)
    security_id = models.CharField(max_length=30, db_index=True)
    trading_symbol = models.CharField(max_length=50)
    exchange = models.CharField(max_length=10, default="NSE")
    
    total_qty = models.PositiveIntegerField(default=0)
    dp_qty = models.PositiveIntegerField(default=0)
    available_qty = models.PositiveIntegerField(default=0)
    collateral_qty = models.PositiveIntegerField(default=0)
    avg_cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    def __str__(self):
        return f"{self.trading_symbol}: {self.total_qty} shares @ ₹{self.avg_cost_price}"
