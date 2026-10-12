import json
import requests
from decimal import Decimal
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.core.constants import (
    TransactionType,
    OrderType,
    ProductType,
    OrderStatus,
    PositionType,
    ExchangeSegment,
    resolve_index,
    INDEX_SPECS
)
from apps.authentication.models import User
from apps.accounts.models import VirtualAccount
from apps.dhan_v2.models import Order, Trade, Position, Holding
from apps.fyers_feed.services import fyers_service

def resolve_client_id(request) -> str:
    """Extracts client-id from headers or defaults to first available sandbox user."""
    client_id = request.headers.get('client-id') or request.query_params.get('clientId')
    if not client_id and request.user and request.user.is_authenticated:
        client_id = request.user.dhan_client_id
    if not client_id:
        u = User.objects.first()
        client_id = u.dhan_client_id if u else "1000000001"
    return str(client_id)

def get_or_create_account(client_id: str) -> VirtualAccount:
    """Finds or creates VirtualAccount for client_id."""
    acc = VirtualAccount.objects.filter(dhan_client_id=client_id).first()
    if not acc:
        user = User.objects.filter(dhan_client_id=client_id).first()
        if not user:
            user = User.objects.create(email=f"trader_{client_id}@anvil.local", dhan_client_id=client_id)
        acc = VirtualAccount.objects.create(
            user=user,
            dhan_client_id=client_id,
            account_name=f"Sandbox Account {client_id}",
            availabel_balance=Decimal(str(settings.DEFAULT_SOD_BALANCE)),
            sod_limit=Decimal(str(settings.DEFAULT_SOD_BALANCE)),
        )
    return acc

def dispatch_postback(order: Order, event_type: str = 'ORDER_UPDATE'):
    """Dispatches webhook postback to configured target (e.g. Marmot)."""
    if not getattr(settings, 'POSTBACK_ENABLED', True):
        return
    url = getattr(settings, 'POSTBACK_WEBHOOK_URL', '')
    if not url:
        return
    payload = {
        'orderId': order.order_id,
        'dhanClientId': order.dhan_client_id,
        'correlationId': order.correlation_id,
        'orderStatus': order.order_status,
        'transactionType': order.transaction_type,
        'tradingSymbol': order.trading_symbol,
        'securityId': order.security_id,
        'quantity': order.quantity,
        'price': float(order.price),
        'avgPrice': float(order.average_price),
        'eventType': event_type,
        'timestamp': order.order_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
    }
    try:
        requests.post(url, json=payload, timeout=2.0)
    except Exception:
        pass

class OrdersView(APIView):
    """
    POST /v2/orders - Place a new simulated order
    GET  /v2/orders - List all orders for the client
    """
    def get(self, request):
        client_id = resolve_client_id(request)
        orders = Order.objects.filter(dhan_client_id=client_id).order_by('-order_timestamp')
        
        data = [
            {
                "dhanClientId": o.dhan_client_id,
                "orderId": o.order_id,
                "correlationId": o.correlation_id,
                "orderStatus": o.order_status,
                "transactionType": o.transaction_type,
                "exchangeSegment": o.exchange_segment,
                "productType": o.product_type,
                "orderType": o.order_type,
                "validity": o.validity,
                "tradingSymbol": o.trading_symbol,
                "securityId": o.security_id,
                "quantity": o.quantity,
                "disclosedQuantity": o.disclosed_quantity,
                "price": float(o.price),
                "triggerPrice": float(o.trigger_price),
                "afterMarketOrder": False,
                "boProfitValue": float(o.bo_profit_value),
                "boStopLossValue": float(o.bo_stop_loss_value),
                "legName": "ENTRY_LEG",
                "createTime": o.order_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                "updateTime": o.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
                "exchangeTime": o.order_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                "exchangeOrderId": o.exchange_order_id or f"EX{o.order_id}",
                "averagePrice": float(o.average_price),
                "filledQty": o.filled_qty,
                "rejectionReason": o.rejection_reason,
            }
            for o in orders
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        client_id = resolve_client_id(request)
        account = get_or_create_account(client_id)

        # Parse request body (Dhan camelCase or snake_case)
        d = request.data
        correlation_id = d.get('correlationId') or d.get('correlation_id', '')
        transaction_type = (d.get('transactionType') or d.get('transaction_type', 'BUY')).upper()
        exchange_segment = d.get('exchangeSegment') or d.get('exchange_segment', ExchangeSegment.NSE_FNO.value)
        product_type = d.get('productType') or d.get('product_type', ProductType.INTRADAY.value)
        order_type = (d.get('orderType') or d.get('order_type', OrderType.MARKET.value)).upper()
        validity = d.get('validity', 'DAY').upper()
        security_id = str(d.get('securityId') or d.get('security_id', '49081'))
        trading_symbol = d.get('tradingSymbol') or d.get('trading_symbol', 'NIFTY_MOCK_OPT')
        
        try:
            quantity = int(d.get('quantity', 0))
            price = Decimal(str(d.get('price', 0)))
            trigger_price = Decimal(str(d.get('triggerPrice') or d.get('trigger_price', 0)))
            bo_profit_value = Decimal(str(d.get('boProfitValue') or d.get('bo_profit_value', 0)))
            bo_stop_loss_value = Decimal(str(d.get('boStopLossValue') or d.get('bo_stop_loss_value', 0)))
        except Exception:
            return Response({'status': 'failure', 'remarks': 'Invalid numeric parameters'}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            return Response({'status': 'failure', 'remarks': 'Quantity must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

        order_id = Order.generate_order_id()

        # Determine Execution Price
        exec_price = price
        if order_type in [OrderType.MARKET.value, OrderType.STOP_LOSS_MARKET.value] or price == Decimal('0.00'):
            # Estimate price based on live Fyers tick or base premium
            exec_price = Decimal(str(round(float(price) if price > 0 else 145.50, 2)))

        # Margin Calculation
        required_margin = exec_price * Decimal(quantity)
        if transaction_type == TransactionType.SELL.value and product_type in [ProductType.INTRADAY.value, ProductType.MARGIN.value]:
            # Naked option selling requires SPAN-like margin approximation
            required_margin = Decimal('45000.00') * Decimal(max(1, quantity // 25))

        # Check virtual account balance
        if account.availabel_balance < required_margin:
            order = Order.objects.create(
                order_id=order_id,
                dhan_client_id=client_id,
                correlation_id=correlation_id,
                transaction_type=transaction_type,
                exchange_segment=exchange_segment,
                product_type=product_type,
                order_type=order_type,
                validity=validity,
                security_id=security_id,
                trading_symbol=trading_symbol,
                quantity=quantity,
                price=price,
                trigger_price=trigger_price,
                bo_profit_value=bo_profit_value,
                bo_stop_loss_value=bo_stop_loss_value,
                order_status=OrderStatus.REJECTED.value,
                rejection_reason=f"Insufficient funds: Required ₹{required_margin:,.2f}, Available ₹{account.availabel_balance:,.2f}",
            )
            dispatch_postback(order, 'ORDER_REJECTED')
            return Response({
                "status": "failure",
                "remarks": order.rejection_reason,
                "data": {
                    "orderId": order_id,
                    "orderStatus": OrderStatus.REJECTED.value,
                    "orderTimestamp": order.order_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Block margin
        account.block_margin(required_margin)

        # Immediate Fill for MARKET orders, PENDING for LIMIT/SL
        is_fill_immediate = (order_type == OrderType.MARKET.value)
        final_status = OrderStatus.TRADED.value if is_fill_immediate else OrderStatus.PENDING.value
        avg_price = exec_price if is_fill_immediate else Decimal('0.00')
        filled_qty = quantity if is_fill_immediate else 0

        order = Order.objects.create(
            order_id=order_id,
            dhan_client_id=client_id,
            correlation_id=correlation_id,
            transaction_type=transaction_type,
            exchange_segment=exchange_segment,
            product_type=product_type,
            order_type=order_type,
            validity=validity,
            security_id=security_id,
            trading_symbol=trading_symbol,
            quantity=quantity,
            price=price,
            trigger_price=trigger_price,
            bo_profit_value=bo_profit_value,
            bo_stop_loss_value=bo_stop_loss_value,
            order_status=final_status,
            average_price=avg_price,
            filled_qty=filled_qty,
            exchange_order_id=f"EX{order_id}",
        )

        if is_fill_immediate:
            # 1. Record Trade Fill
            trade_id = Trade.generate_trade_id()
            Trade.objects.create(
                trade_id=trade_id,
                order=order,
                dhan_client_id=client_id,
                trading_symbol=trading_symbol,
                security_id=security_id,
                transaction_type=transaction_type,
                traded_qty=quantity,
                traded_price=avg_price,
            )

            # 2. Update Position
            pos, created = Position.objects.get_or_create(
                dhan_client_id=client_id,
                security_id=security_id,
                product_type=product_type,
                defaults={
                    'trading_symbol': trading_symbol,
                    'exchange_segment': exchange_segment,
                    'stop_loss': bo_stop_loss_value,
                    'take_profit': bo_profit_value,
                }
            )
            
            if transaction_type == TransactionType.BUY.value:
                total_bought = (pos.buy_avg * pos.buy_qty) + (avg_price * quantity)
                pos.buy_qty += quantity
                pos.buy_avg = total_bought / pos.buy_qty if pos.buy_qty > 0 else Decimal('0.00')
                pos.net_qty += quantity
            else: # SELL
                total_sold = (pos.sell_avg * pos.sell_qty) + (avg_price * quantity)
                pos.sell_qty += quantity
                pos.sell_avg = total_sold / pos.sell_qty if pos.sell_qty > 0 else Decimal('0.00')
                pos.net_qty -= quantity

            pos.position_type = PositionType.LONG.value if pos.net_qty > 0 else (PositionType.SHORT.value if pos.net_qty < 0 else PositionType.CLOSED.value)
            pos.save()

            dispatch_postback(order, 'ORDER_TRADED')
        else:
            dispatch_postback(order, 'ORDER_PENDING')

        return Response({
            "orderId": order_id,
            "orderStatus": final_status,
            "orderTimestamp": order.order_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        }, status=status.HTTP_200_OK)

class OrderDetailView(APIView):
    """
    GET    /v2/orders/{orderId} - Query single order status
    PUT    /v2/orders/{orderId} - Modify pending order
    DELETE /v2/orders/{orderId} - Cancel pending order
    """
    def get(self, request, order_id):
        client_id = resolve_client_id(request)
        try:
            o = Order.objects.get(order_id=order_id, dhan_client_id=client_id)
        except Order.DoesNotExist:
            return Response({'status': 'failure', 'remarks': f'Order {order_id} not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "dhanClientId": o.dhan_client_id,
            "orderId": o.order_id,
            "correlationId": o.correlation_id,
            "orderStatus": o.order_status,
            "transactionType": o.transaction_type,
            "exchangeSegment": o.exchange_segment,
            "productType": o.product_type,
            "orderType": o.order_type,
            "validity": o.validity,
            "tradingSymbol": o.trading_symbol,
            "securityId": o.security_id,
            "quantity": o.quantity,
            "disclosedQuantity": o.disclosed_quantity,
            "price": float(o.price),
            "triggerPrice": float(o.trigger_price),
            "averagePrice": float(o.average_price),
            "filledQty": o.filled_qty,
            "orderTimestamp": o.order_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        }, status=status.HTTP_200_OK)

    def put(self, request, order_id):
        client_id = resolve_client_id(request)
        try:
            o = Order.objects.get(order_id=order_id, dhan_client_id=client_id)
        except Order.DoesNotExist:
            return Response({'status': 'failure', 'remarks': f'Order {order_id} not found'}, status=status.HTTP_404_NOT_FOUND)

        if o.order_status != OrderStatus.PENDING.value:
            return Response({'status': 'failure', 'remarks': f'Cannot modify order in {o.order_status} status'}, status=status.HTTP_400_BAD_REQUEST)

        d = request.data
        if 'price' in d:
            o.price = Decimal(str(d['price']))
        if 'triggerPrice' in d:
            o.trigger_price = Decimal(str(d['triggerPrice']))
        if 'quantity' in d:
            o.quantity = int(d['quantity'])
        o.save()
        dispatch_postback(o, 'ORDER_MODIFIED')

        return Response({"orderId": o.order_id, "orderStatus": o.order_status}, status=status.HTTP_200_OK)

    def delete(self, request, order_id):
        client_id = resolve_client_id(request)
        try:
            o = Order.objects.get(order_id=order_id, dhan_client_id=client_id)
        except Order.DoesNotExist:
            return Response({'status': 'failure', 'remarks': f'Order {order_id} not found'}, status=status.HTTP_404_NOT_FOUND)

        if o.order_status == OrderStatus.PENDING.value:
            o.order_status = OrderStatus.CANCELLED.value
            o.save()
            # Release blocked margin
            account = get_or_create_account(client_id)
            refund_margin = o.price * Decimal(o.quantity)
            account.release_margin(refund_margin)
            dispatch_postback(o, 'ORDER_CANCELLED')
            return Response({"orderId": o.order_id, "orderStatus": OrderStatus.CANCELLED.value}, status=status.HTTP_200_OK)

        return Response({'status': 'failure', 'remarks': f'Cannot cancel order with status {o.order_status}'}, status=status.HTTP_400_BAD_REQUEST)

class ExternalOrderView(APIView):
    """GET /v2/orders/external/{correlationId}"""
    def get(self, request, correlation_id):
        client_id = resolve_client_id(request)
        o = Order.objects.filter(correlation_id=correlation_id, dhan_client_id=client_id).first()
        if not o:
            return Response({'status': 'failure', 'remarks': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({"orderId": o.order_id, "orderStatus": o.order_status, "filledQty": o.filled_qty}, status=status.HTTP_200_OK)

class TradesView(APIView):
    """GET /v2/trades and GET /v2/trades/{orderId}"""
    def get(self, request, order_id=None):
        client_id = resolve_client_id(request)
        qs = Trade.objects.filter(dhan_client_id=client_id)
        if order_id:
            qs = qs.filter(order__order_id=order_id)
        
        data = [
            {
                "tradeId": t.trade_id,
                "orderId": t.order.order_id,
                "exchangeOrderId": t.order.exchange_order_id,
                "dhanClientId": t.dhan_client_id,
                "tradingSymbol": t.trading_symbol,
                "securityId": t.security_id,
                "transactionType": t.transaction_type,
                "tradedQuantity": t.traded_qty,
                "tradedPrice": float(t.traded_price),
                "exchangeTime": t.exchange_time.strftime('%Y-%m-%d %H:%M:%S'),
            }
            for t in qs
        ]
        return Response(data, status=status.HTTP_200_OK)

class PositionsView(APIView):
    """
    GET /v2/positions - All open & closed positions with live MTM valuation
    """
    def get(self, request):
        client_id = resolve_client_id(request)
        positions = Position.objects.filter(dhan_client_id=client_id)

        result = []
        for p in positions:
            # Estimate current LTP for MTM
            ltp = float(p.buy_avg if p.buy_avg > 0 else (p.sell_avg if p.sell_avg > 0 else 150.0))
            # Realized / Unrealized calculations
            unrealized = 0.0
            if p.net_qty > 0: # LONG
                unrealized = round((ltp - float(p.buy_avg)) * p.net_qty, 2)
            elif p.net_qty < 0: # SHORT
                unrealized = round((float(p.sell_avg) - ltp) * abs(p.net_qty), 2)

            result.append({
                "dhanClientId": p.dhan_client_id,
                "tradingSymbol": p.trading_symbol,
                "securityId": p.security_id,
                "positionType": p.position_type,
                "exchangeSegment": p.exchange_segment,
                "productType": p.product_type,
                "buyAvg": float(p.buy_avg),
                "buyQty": p.buy_qty,
                "sellAvg": float(p.sell_avg),
                "sellQty": p.sell_qty,
                "netQty": p.net_qty,
                "realizedProfit": float(p.realized_profit),
                "unrealizedProfit": unrealized,
                "stopLoss": float(p.stop_loss),
                "takeProfit": float(p.take_profit),
                "entryTime": p.entry_time.strftime('%H:%M:%S'),
            })

        return Response(result, status=status.HTTP_200_OK)

class ConvertPositionView(APIView):
    """POST /v2/positions/convert"""
    def post(self, request):
        return Response({"status": "success", "message": "Position converted successfully"}, status=status.HTTP_200_OK)

class HoldingsView(APIView):
    """GET /v2/holdings"""
    def get(self, request):
        client_id = resolve_client_id(request)
        holdings = Holding.objects.filter(dhan_client_id=client_id)
        data = [
            {
                "dhanClientId": h.dhan_client_id,
                "tradingSymbol": h.trading_symbol,
                "securityId": h.security_id,
                "totalQty": h.total_qty,
                "dpQty": h.dp_qty,
                "availableQty": h.available_qty,
                "avgCostPrice": float(h.avg_cost_price),
            }
            for h in holdings
        ]
        return Response(data, status=status.HTTP_200_OK)

class FundLimitView(APIView):
    """
    GET /v2/fundlimit - Exact Dhan balance contract
    """
    def get(self, request):
        client_id = resolve_client_id(request)
        account = get_or_create_account(client_id)
        
        return Response({
            "dhanClientId": account.dhan_client_id,
            "availabelBalance": float(account.availabel_balance),
            "sodLimit": float(account.sod_limit),
            "collateralAmount": float(account.collateral_amount),
            "receiveableAmount": float(account.receiveable_amount),
            "utilizedAmount": float(account.utilized_margin),
            "blockedPayoutAmount": float(account.blocked_payout_amount),
            "withdrawableBalance": float(account.withdrawable_balance),
        }, status=status.HTTP_200_OK)

class MarginCalculatorView(APIView):
    """POST /v2/margincalculator"""
    def post(self, request):
        d = request.data
        price = float(d.get('price', 100))
        qty = int(d.get('quantity', 25))
        total_margin = price * qty
        return Response({
            "totalMargin": total_margin,
            "spanMargin": round(total_margin * 0.7, 2),
            "exposureMargin": round(total_margin * 0.3, 2),
            "insufficient": False,
        }, status=status.HTTP_200_OK)

class OptionChainView(APIView):
    """GET /v2/optionchain?index=NIFTY50"""
    def get(self, request):
        index_param = request.query_params.get('index', 'NIFTY50')
        try:
            chain = fyers_service.get_option_chain(index_param)
            return Response(chain, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class QuotesView(APIView):
    """GET /v2/quotes?symbols=NSE:NIFTY50-INDEX"""
    def get(self, request):
        symbols = request.query_params.get('symbols', '')
        if not symbols:
            quotes = fyers_service.get_all_index_quotes()
            return Response({'quotes': quotes}, status=status.HTTP_200_OK)

        sym_list = [s.strip() for s in symbols.split(',') if s.strip()]
        quotes = [fyers_service.get_index_quote(s) for s in sym_list]
        return Response({'quotes': quotes}, status=status.HTTP_200_OK)

class PostbackReceiverView(APIView):
    """
    POST /api/v2/postback/
    Development webhook receiver & logger.
    """
    def post(self, request):
        print(f"[ANVIL-WEBHOOK-EVENT] Received postback: {request.data}")
        return Response({"status": "received"}, status=status.HTTP_200_OK)
