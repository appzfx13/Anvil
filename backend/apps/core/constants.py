"""
Core System Constants & Strict Enums for ANVIL Precision Sandbox Broker.
STRICTLY ZERO FALLBACKS - Everything is explicitly mapped and validated.
"""
from enum import Enum
from typing import Dict, Any

class ExchangeSegment(str, Enum):
    NSE_FNO = "NSE_FNO"
    BSE_FNO = "BSE_FNO"
    NSE_EQ = "NSE_EQ"
    BSE_EQ = "BSE_EQ"

class TransactionType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP_LOSS = "STOP_LOSS"
    STOP_LOSS_MARKET = "STOP_LOSS_MARKET"

class ProductType(str, Enum):
    INTRADAY = "INTRADAY"
    CNC = "CNC"
    MARGIN = "MARGIN"
    BO = "BO"

class OrderValidity(str, Enum):
    DAY = "DAY"
    IOC = "IOC"

class OrderStatus(str, Enum):
    TRANSIT = "TRANSIT"
    PENDING = "PENDING"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    TRADED = "TRADED"
    EXPIRED = "EXPIRED"

class PositionType(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"
    CLOSED = "CLOSED"

# Supported Indian Indices
class SupportedIndex(str, Enum):
    NIFTY50 = "NIFTY50"
    BANKNIFTY = "BANKNIFTY"
    FINNIFTY = "FINNIFTY"
    MIDCAPNIFTY = "MIDCAPNIFTY"
    SENSEX = "SENSEX"

# Index Configuration Specifications (Fyers Symbol, Exchange, Strike Step, Lot Size)
INDEX_SPECS: Dict[str, Dict[str, Any]] = {
    SupportedIndex.NIFTY50.value: {
        "name": "NIFTY 50",
        "symbol": "NIFTY50",
        "fyers_symbol": "NSE:NIFTY50-INDEX",
        "exchange": ExchangeSegment.NSE_FNO.value,
        "strike_interval": 50,
        "lot_size": 25,
        "base_spot": 25200.00,
        "expiry_day": "Thursday",
    },
    SupportedIndex.BANKNIFTY.value: {
        "name": "BANK NIFTY",
        "symbol": "BANKNIFTY",
        "fyers_symbol": "NSE:NIFTYBANK-INDEX",
        "exchange": ExchangeSegment.NSE_FNO.value,
        "strike_interval": 100,
        "lot_size": 15,
        "base_spot": 52100.00,
        "expiry_day": "Wednesday",
    },
    SupportedIndex.FINNIFTY.value: {
        "name": "FINNIFTY",
        "symbol": "FINNIFTY",
        "fyers_symbol": "NSE:FINNIFTY-INDEX",
        "exchange": ExchangeSegment.NSE_FNO.value,
        "strike_interval": 50,
        "lot_size": 25,
        "base_spot": 24350.00,
        "expiry_day": "Tuesday",
    },
    SupportedIndex.MIDCAPNIFTY.value: {
        "name": "MIDCAP NIFTY",
        "symbol": "MIDCAPNIFTY",
        "fyers_symbol": "NSE:MIDCPNIFTY-INDEX",
        "exchange": ExchangeSegment.NSE_FNO.value,
        "strike_interval": 25,
        "lot_size": 50,
        "base_spot": 13150.00,
        "expiry_day": "Monday",
    },
    SupportedIndex.SENSEX.value: {
        "name": "BSE SENSEX",
        "symbol": "SENSEX",
        "fyers_symbol": "BSE:SENSEX-INDEX",
        "exchange": ExchangeSegment.BSE_FNO.value,
        "strike_interval": 100,
        "lot_size": 10,
        "base_spot": 82400.00,
        "expiry_day": "Friday",
    },
}

# Aliases to normalize input query parameters
INDEX_ALIASES: Dict[str, str] = {
    "NIFTY": SupportedIndex.NIFTY50.value,
    "NIFTY50": SupportedIndex.NIFTY50.value,
    "BANKNIFTY": SupportedIndex.BANKNIFTY.value,
    "BANK_NIFTY": SupportedIndex.BANKNIFTY.value,
    "FINNIFTY": SupportedIndex.FINNIFTY.value,
    "MIDCPNIFTY": SupportedIndex.MIDCAPNIFTY.value,
    "MIDCAPNIFTY": SupportedIndex.MIDCAPNIFTY.value,
    "SENSEX": SupportedIndex.SENSEX.value,
}

def resolve_index(index_key: str) -> str:
    """Normalize and resolve index name strictly without silent fallbacks."""
    if not index_key:
        raise ValueError("Index parameter is required.")
    cleaned = index_key.upper().strip()
    resolved = INDEX_ALIASES.get(cleaned)
    if not resolved:
        valid_options = ", ".join(INDEX_SPECS.keys())
        raise ValueError(f"Unsupported index '{index_key}'. Supported indices: {valid_options}")
    return resolved
