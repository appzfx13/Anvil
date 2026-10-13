"""
ANVIL Precision Execution Engine — Stop Loss (SL) & Take Profit (TP) Matching Engine.
Handles:
1. STOP_LOSS (SL) & STOP_LOSS_MARKET (SL-M) pending order triggers based on market LTP.
2. LIMIT order matching when market price touches or crosses the limit price.
3. Position-level Bracket Order (BO) / Cover Order (CO) auto Stop Loss & Take Profit exits.
4. Real-time margin settlement, position updating, and Dhan v2 postback webhook dispatch.
"""
from decimal import Decimal
from typing import List, Dict, Any, Optional
from django.utils import timezone

from apps.core.constants import (
    TransactionType,
    OrderType,
    ProductType,
    OrderStatus,
    PositionType,
)
from apps.dhan_v2.models import Order, Trade, Position
from apps.accounts.models import VirtualAccount
from apps.fyers_feed.services import fyers_service

import re

def normalize_order_type(raw_type: str) -> str:
    """Normalizes Dhan HQ / Marmot order type aliases to canonical OrderType enum."""
    t = str(raw_type).strip().upper()
    if t in ['SL', 'STOP_LOSS', 'STOPLOSS']:
        return OrderType.STOP_LOSS.value
    elif t in ['SL-M', 'SLM', 'STOP_LOSS_MARKET', 'STOPLOSS_MARKET']:
        return OrderType.STOP_LOSS_MARKET.value
    elif t in ['L', 'LIMIT']:
        return OrderType.LIMIT.value
    elif t in ['M', 'MARKET']:
        return OrderType.MARKET.value
    return t

def normalize_trading_symbol(raw_symbol: str) -> str:
    """Standardizes trading symbols to consistent 'INDEX DAY MONTH STRIKE CE/PE' format."""
    if not raw_symbol:
        return ""
    sym = str(raw_symbol).strip()
    if sym in ['NIFTY 50', 'BANK NIFTY', 'FIN NIFTY', 'SENSEX', 'MIDCPNIFTY']:
        return sym
    
    cleaned = re.sub(r'^(NSE:|BSE:)', '', sym, flags=re.IGNORECASE)
    cleaned = re.sub(r'-(CE|PE)$', r' \1', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s+CALL$', ' CE', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s+PUT$', ' PE', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'-SEP(\d{4})-', r' 26 SEP ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'-OCT(\d{4})-', r' 26 OCT ', cleaned, flags=re.IGNORECASE)

    # Compact pattern: NIFTY5026OCT25200CE or NIFTY26OCT25200CE
    m = re.match(r'^(NIFTY50|NIFTY|BANKNIFTY|FINNIFTY|SENSEX|MIDCPNIFTY)(\d{1,2}[A-Z]{3})(\d{4,6})(CE|PE)$', cleaned, re.IGNORECASE)
    if m:
        idx, exp, strike, opt = m.groups()
        if idx.upper() == 'NIFTY50':
            idx = 'NIFTY'
        exp_m = re.match(r'^(\d{1,2})([A-Z]{3})$', exp, re.IGNORECASE)
        exp_formatted = f"{exp_m.group(1)} {exp_m.group(2).upper()}" if exp_m else exp.upper()
        return f"{idx.upper()} {exp_formatted} {strike} {opt.upper()}"

    # Spaced pattern without space in expiry: NIFTY 26OCT 22500 CE
    m2 = re.match(r'^(NIFTY50|NIFTY|BANKNIFTY|FINNIFTY|SENSEX|MIDCPNIFTY)\s+(\d{1,2}[A-Z]{3})\s+(\d+)\s+(CE|PE)$', cleaned, re.IGNORECASE)
    if m2:
        idx, exp, strike, opt = m2.groups()
        if idx.upper() == 'NIFTY50':
            idx = 'NIFTY'
        exp_m = re.match(r'^(\d{1,2})([A-Z]{3})$', exp, re.IGNORECASE)
        exp_formatted = f"{exp_m.group(1)} {exp_m.group(2).upper()}" if exp_m else exp.upper()
        return f"{idx.upper()} {exp_formatted} {strike} {opt.upper()}"

    # Fully spaced pattern: NIFTY 13 OCT 22550 CE
    m3 = re.match(r'^(NIFTY50|NIFTY|BANKNIFTY|FINNIFTY|SENSEX|MIDCPNIFTY)\s+(\d{1,2})\s+([A-Z]{3})\s+(\d+)\s+(CE|PE)$', cleaned, re.IGNORECASE)
    if m3:
        idx, day, mon, strike, opt = m3.groups()
        if idx.upper() == 'NIFTY50':
            idx = 'NIFTY'
        return f"{idx.upper()} {day} {mon.upper()} {strike} {opt.upper()}"

    return cleaned.upper()

def get_instrument_ltp(trading_symbol: str, security_id: str = '') -> Decimal:
    """
    Resolves the current market LTP for an instrument from live Fyers feed, option chain, or spot quotes.
    1. Checks direct Fyers quote for exchange symbol (NSE:...)
    2. Scans live option chain for matching strike, option_type (CE/PE), security_id, or trading_symbol
    3. Resolves index spot quote (NIFTY50, BANKNIFTY, etc.)
    """
    if not trading_symbol:
        return Decimal('0.00')

    sym = str(trading_symbol).strip()
    sec_id = str(security_id).strip()

    # 1. Direct Fyers quote lookup if exchange prefix exists (e.g. NSE:NIFTY26O1322050CE)
    if sym.startswith(('NSE:', 'BSE:', 'MCX:')):
        try:
            live_quotes = fyers_service.fetch_fyers_quote_live([sym])
            if sym in live_quotes and float(live_quotes[sym].get('ltp', 0)) > 0:
                return Decimal(str(live_quotes[sym]['ltp']))
        except Exception:
            pass

    # 2. Check if it's an option contract (e.g. NIFTY 15OCT26 22050 CE, NIFTY 22050 PE, etc.)
    opt_match = re.search(r'(\d{4,5})\s*(CE|PE)', sym, re.IGNORECASE)
    idx_key = 'NIFTY50'
    if 'BANK' in sym.upper():
        idx_key = 'BANKNIFTY'
    elif 'FIN' in sym.upper():
        idx_key = 'FINNIFTY'
    elif 'MID' in sym.upper():
        idx_key = 'MIDCPNIFTY'
    elif 'SENSEX' in sym.upper():
        idx_key = 'SENSEX'

    if opt_match or sec_id or 'CE' in sym.upper() or 'PE' in sym.upper():
        target_strike = float(opt_match.group(1)) if opt_match else None
        target_opt_type = opt_match.group(2).upper() if opt_match else ('CE' if 'CE' in sym.upper() else 'PE')
        try:
            chain = fyers_service.get_option_chain(idx_key, strike_count=25)
            for strike_item in chain.get('strikes', []):
                strike_val = float(strike_item.get('strike_price', 0))
                # Check call contract
                call_data = strike_item.get('call', {})
                if (sec_id and str(call_data.get('security_id')) == sec_id) or \
                   (sym == call_data.get('trading_symbol')) or \
                   (target_strike and strike_val == target_strike and target_opt_type == 'CE'):
                    c_ltp = float(call_data.get('ltp', 0))
                    if c_ltp > 0:
                        return Decimal(str(c_ltp))

                # Check put contract
                put_data = strike_item.get('put', {})
                if (sec_id and str(put_data.get('security_id')) == sec_id) or \
                   (sym == put_data.get('trading_symbol')) or \
                   (target_strike and strike_val == target_strike and target_opt_type == 'PE'):
                    p_ltp = float(put_data.get('ltp', 0))
                    if p_ltp > 0:
                        return Decimal(str(p_ltp))
        except Exception:
            pass

    # 3. Check index spot quotes (NIFTY50, BANKNIFTY, etc.)
    try:
        quote = fyers_service.get_index_quote(sym)
        if quote and float(quote.get('ltp', 0)) > 0:
            return Decimal(str(quote['ltp']))
    except Exception:
        pass

    return Decimal('0.00')

def evaluate_orders_and_sltp(client_id: Optional[str] = None, simulated_ltps: Optional[Dict[str, Decimal]] = None) -> Dict[str, Any]:
    """
    Scans and evaluates:
    1. All PENDING SL, SL-M, and LIMIT orders.
    2. All open positions with active stop_loss or take_profit levels.
    Fills and executes orders when trigger/target conditions are satisfied.
    """
    from apps.dhan_v2.views import dispatch_postback, get_or_create_account

    orders_query = Order.objects.filter(order_status=OrderStatus.PENDING.value)
    if client_id:
        orders_query = orders_query.filter(dhan_client_id=client_id)

    pending_orders = list(orders_query)
    triggered_orders = []
    closed_positions = []

    # 1. EVALUATE PENDING ORDERS (SL, SL-M, LIMIT)
    for order in pending_orders:
        if simulated_ltps and order.trading_symbol in simulated_ltps:
            ltp = simulated_ltps[order.trading_symbol]
        else:
            ltp = get_instrument_ltp(order.trading_symbol, order.security_id)

        # If live LTP is unavailable, leave the order PENDING
        if ltp <= Decimal('0.00'):
            continue

        should_trigger = False
        exec_price = ltp

        is_buy = (order.transaction_type == TransactionType.BUY.value)
        order_type = normalize_order_type(order.order_type)

        if order_type == OrderType.LIMIT.value:
            # Buy Limit: fill when market price <= limit price
            # Sell Limit: fill when market price >= limit price
            if is_buy and ltp <= order.price:
                should_trigger = True
                exec_price = order.price
            elif not is_buy and ltp >= order.price:
                should_trigger = True
                exec_price = order.price

        elif order_type == OrderType.STOP_LOSS.value:
            # Buy SL: triggers when market price >= trigger_price
            # Sell SL: triggers when market price <= trigger_price
            if is_buy and ltp >= order.trigger_price:
                should_trigger = True
                exec_price = order.price if order.price > 0 else ltp
            elif not is_buy and ltp <= order.trigger_price:
                should_trigger = True
                exec_price = order.price if order.price > 0 else ltp

        elif order_type == OrderType.STOP_LOSS_MARKET.value:
            # Buy SL-M: triggers when market price >= trigger_price -> fills at market
            # Sell SL-M: triggers when market price <= trigger_price -> fills at market
            if is_buy and ltp >= order.trigger_price:
                should_trigger = True
                exec_price = ltp
            elif not is_buy and ltp <= order.trigger_price:
                should_trigger = True
                exec_price = ltp

        if should_trigger:
            # Transition to TRADED
            order.order_status = OrderStatus.TRADED.value
            order.average_price = exec_price
            order.filled_qty = order.quantity
            order.updated_at = timezone.now()
            order.save()

            # Record Trade
            trade_id = Trade.generate_trade_id()
            Trade.objects.create(
                trade_id=trade_id,
                order=order,
                dhan_client_id=order.dhan_client_id,
                trading_symbol=order.trading_symbol,
                security_id=order.security_id,
                transaction_type=order.transaction_type,
                traded_qty=order.quantity,
                traded_price=exec_price,
            )

            # Update Position
            pos, _ = Position.objects.get_or_create(
                dhan_client_id=order.dhan_client_id,
                security_id=order.security_id,
                product_type=order.product_type,
                defaults={
                    'trading_symbol': order.trading_symbol,
                    'exchange_segment': order.exchange_segment,
                    'stop_loss': order.bo_stop_loss_value,
                    'take_profit': order.bo_profit_value,
                }
            )

            if is_buy:
                total_bought = (pos.buy_avg * pos.buy_qty) + (exec_price * order.quantity)
                pos.buy_qty += order.quantity
                pos.buy_avg = total_bought / pos.buy_qty if pos.buy_qty > 0 else Decimal('0.00')
                pos.net_qty += order.quantity
            else:
                total_sold = (pos.sell_avg * pos.sell_qty) + (exec_price * order.quantity)
                pos.sell_qty += order.quantity
                pos.sell_avg = total_sold / pos.sell_qty if pos.sell_qty > 0 else Decimal('0.00')
                pos.net_qty -= order.quantity

            pos.position_type = (
                PositionType.LONG.value if pos.net_qty > 0 else
                (PositionType.SHORT.value if pos.net_qty < 0 else PositionType.CLOSED.value)
            )
            pos.save()

            # Settle Virtual Account margin
            account = get_or_create_account(order.dhan_client_id)
            total_cost = exec_price * Decimal(order.quantity)
            account.release_margin(total_cost)

            dispatch_postback(order, 'ORDER_TRADED')
            triggered_orders.append({
                'order_id': order.order_id,
                'order_type': order.order_type,
                'trading_symbol': order.trading_symbol,
                'fill_price': float(exec_price),
                'quantity': order.quantity,
            })

    # 2. EVALUATE POSITION-LEVEL STOP LOSS & TAKE PROFIT (BRACKET/COVER ORDERS)
    pos_query = Position.objects.exclude(position_type=PositionType.CLOSED.value).exclude(net_qty=0)
    if client_id:
        pos_query = pos_query.filter(dhan_client_id=client_id)

    open_positions = list(pos_query)
    for pos in open_positions:
        if pos.stop_loss <= Decimal('0.00') and pos.take_profit <= Decimal('0.00'):
            continue

        if simulated_ltps and pos.trading_symbol in simulated_ltps:
            ltp = simulated_ltps[pos.trading_symbol]
        else:
            ltp = get_instrument_ltp(pos.trading_symbol, pos.security_id)
        if ltp <= Decimal('0.00'):
            continue

        is_long = (pos.net_qty > 0)
        exit_reason = None
        exit_side = TransactionType.SELL.value if is_long else TransactionType.BUY.value
        qty_to_close = abs(pos.net_qty)

        if is_long:
            # Long Position: SL hit when LTP <= stop_loss; TP hit when LTP >= take_profit
            if pos.stop_loss > Decimal('0.00') and ltp <= pos.stop_loss:
                exit_reason = 'STOP_LOSS_TRIGGERED'
            elif pos.take_profit > Decimal('0.00') and ltp >= pos.take_profit:
                exit_reason = 'TAKE_PROFIT_TRIGGERED'
        else:
            # Short Position: SL hit when LTP >= stop_loss; TP hit when LTP <= take_profit
            if pos.stop_loss > Decimal('0.00') and ltp >= pos.stop_loss:
                exit_reason = 'STOP_LOSS_TRIGGERED'
            elif pos.take_profit > Decimal('0.00') and ltp <= pos.take_profit:
                exit_reason = 'TAKE_PROFIT_TRIGGERED'

        if exit_reason:
            # Create synthetic auto square-off market order
            auto_order_id = Order.generate_order_id()
            auto_order = Order.objects.create(
                order_id=auto_order_id,
                dhan_client_id=pos.dhan_client_id,
                correlation_id=f"AUTO_{exit_reason}",
                transaction_type=exit_side,
                exchange_segment=pos.exchange_segment,
                product_type=pos.product_type,
                order_type=OrderType.MARKET.value,
                validity='DAY',
                security_id=pos.security_id,
                trading_symbol=pos.trading_symbol,
                quantity=qty_to_close,
                price=ltp,
                average_price=ltp,
                filled_qty=qty_to_close,
                order_status=OrderStatus.TRADED.value,
                rejection_reason=f"Auto closed by {exit_reason} @ ₹{ltp}",
            )

            # Record trade
            Trade.objects.create(
                trade_id=Trade.generate_trade_id(),
                order=auto_order,
                dhan_client_id=pos.dhan_client_id,
                trading_symbol=pos.trading_symbol,
                security_id=pos.security_id,
                transaction_type=exit_side,
                traded_qty=qty_to_close,
                traded_price=ltp,
            )

            # Calculate Realized Profit
            if is_long:
                realized = (ltp - pos.buy_avg) * Decimal(qty_to_close)
                pos.sell_qty += qty_to_close
                pos.sell_avg = ltp
            else:
                realized = (pos.sell_avg - ltp) * Decimal(qty_to_close)
                pos.buy_qty += qty_to_close
                pos.buy_avg = ltp

            pos.realized_profit += realized
            pos.net_qty = 0
            pos.position_type = PositionType.CLOSED.value
            pos.save()

            # Credit/debit realized profit to account balance
            account = get_or_create_account(pos.dhan_client_id)
            account.availabel_balance += realized
            account.save(update_fields=['availabel_balance'])

            dispatch_postback(auto_order, exit_reason)
            closed_positions.append({
                'trading_symbol': pos.trading_symbol,
                'exit_reason': exit_reason,
                'exit_price': float(ltp),
                'realized_pnl': float(realized),
            })

    return {
        'status': 'success',
        'evaluated_pending_count': len(pending_orders),
        'triggered_orders': triggered_orders,
        'closed_positions': closed_positions,
        'timestamp': timezone.now().isoformat(),
    }
