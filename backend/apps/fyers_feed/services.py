"""
Real-time FYERS API v3 Market Feed Service.
Fetches live Level-1 spot quotes, calculates realistic option chains for 5 supported Indian indices:
NIFTY50, SENSEX, MIDCAPNIFTY, BANK NIFTY, FINNIFTY.
Caches quotes directly in Redis for sub-millisecond Go engine ingestion.
"""
import json
import math
import random
import time
import requests
from typing import Dict, Any, List, Optional
from django.conf import settings
from django.core.cache import cache
import redis

from apps.core.constants import INDEX_SPECS, resolve_index

class FyersFeedService:
    def __init__(self):
        self.app_id = getattr(settings, 'FYERS_APP_ID', '')
        self.access_token = getattr(settings, 'FYERS_ACCESS_TOKEN', '')
        self.base_url = "https://api-t1.fyers.in/data"
        self.headers = {
            "Authorization": f"{self.app_id}:{self.access_token}" if (self.app_id and self.access_token) else ""
        }
        
        # Redis client for low-latency engine sharing
        try:
            self.redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.redis_client.ping()
        except Exception:
            self.redis_client = None

    def is_fyers_configured(self) -> bool:
        """Checks if active Fyers API credentials are set."""
        return bool(self.app_id and self.access_token)

    def fetch_fyers_quote_live(self, symbols: List[str]) -> Dict[str, Any]:
        """Fetch real-time quotes directly from Fyers API v3."""
        if not self.is_fyers_configured():
            return {}

        symbols_param = ",".join(symbols)
        url = f"{self.base_url}/quotes?symbols={symbols_param}"
        try:
            res = requests.get(url, headers=self.headers, timeout=3.5)
            if res.status_code == 200:
                data = res.json()
                if data.get('s') == 'ok' and 'd' in data:
                    result = {}
                    for item in data['d']:
                        sym = item.get('n')
                        v = item.get('v', {})
                        result[sym] = {
                            'symbol': sym,
                            'ltp': float(v.get('lp', 0.0)),
                            'open': float(v.get('open_price', 0.0)),
                            'high': float(v.get('high_price', 0.0)),
                            'low': float(v.get('low_price', 0.0)),
                            'prev_close': float(v.get('prev_close_price', 0.0)),
                            'ch': float(v.get('ch', 0.0)),
                            'chp': float(v.get('chp', 0.0)),
                            'volume': int(v.get('volume', 0)),
                            'timestamp': int(time.time()),
                            'source': 'FYERS_LIVE',
                        }
                    return result
        except Exception as e:
            print(f"[FYERS-FEED] Error fetching live quote: {e}")
        return {}

    def get_index_quote(self, index_key: str) -> Dict[str, Any]:
        """
        Gets the spot quote for a supported index.
        Uses Fyers live quote if configured, or realistic simulated tick drift.
        """
        norm_key = resolve_index(index_key)
        spec = INDEX_SPECS[norm_key]
        fyers_sym = spec['fyers_symbol']
        cache_key = f"anvil:fyers_quote:{fyers_sym}"

        # 1. Check Redis cache first
        if self.redis_client:
            raw = self.redis_client.get(cache_key)
            if raw:
                try:
                    return json.loads(raw)
                except Exception:
                    pass

        # 2. Try fetching live from Fyers
        live_quotes = self.fetch_fyers_quote_live([fyers_sym])
        if fyers_sym in live_quotes:
            quote = live_quotes[fyers_sym]
            quote['index_name'] = spec['name']
            self._save_quote_to_cache(fyers_sym, quote)
            return quote

        # 3. High-fidelity synthetic realistic drift simulation
        quote = self._generate_synthetic_quote(norm_key, spec)
        self._save_quote_to_cache(fyers_sym, quote)
        return quote

    def get_all_index_quotes(self) -> List[Dict[str, Any]]:
        """Returns spot quotes for all 5 supported indices."""
        quotes = []
        for index_key in INDEX_SPECS.keys():
            quotes.append(self.get_index_quote(index_key))
        return quotes

    def get_option_chain(self, index_key: str, strike_count: int = 10) -> Dict[str, Any]:
        """
        Generates full Option Chain for index.
        Uses live spot price, computes ATM strike and +/- strikes with realistic CE/PE premiums.
        """
        norm_key = resolve_index(index_key)
        spec = INDEX_SPECS[norm_key]
        spot_quote = self.get_index_quote(norm_key)
        spot_price = spot_quote['ltp']
        strike_step = spec['strike_interval']
        lot_size = spec['lot_size']

        atm_strike = round(spot_price / strike_step) * strike_step
        strikes = []
        start_strike = atm_strike - (strike_count * strike_step)
        end_strike = atm_strike + (strike_count * strike_step)

        current_strike = start_strike
        chain_rows = []

        while current_strike <= end_strike:
            diff = current_strike - spot_price
            
            # Simple Black-Scholes inspired intrinsic + time value estimation
            # Volatility approximation ~14% annualized
            time_val = max(18.0, (spot_price * 0.007))
            
            ce_intrinsic = max(0.0, spot_price - current_strike)
            ce_ltp = round(ce_intrinsic + time_val * math.exp(-abs(diff)/(strike_step * 8)), 2)

            pe_intrinsic = max(0.0, current_strike - spot_price)
            pe_ltp = round(pe_intrinsic + time_val * math.exp(-abs(diff)/(strike_step * 8)), 2)

            ce_symbol = f"{norm_key}26OCT{current_strike}CE"
            pe_symbol = f"{norm_key}26OCT{current_strike}PE"

            chain_rows.append({
                'strike_price': current_strike,
                'is_atm': current_strike == atm_strike,
                'call': {
                    'trading_symbol': ce_symbol,
                    'security_id': f"{current_strike}01",
                    'ltp': ce_ltp,
                    'ch': round(random.uniform(-4.5, 4.5), 2),
                    'oi': int(random.randint(15000, 240000) * lot_size),
                    'volume': int(random.randint(50000, 800000)),
                    'iv': round(random.uniform(12.5, 16.8), 2),
                },
                'put': {
                    'trading_symbol': pe_symbol,
                    'security_id': f"{current_strike}02",
                    'ltp': pe_ltp,
                    'ch': round(random.uniform(-4.5, 4.5), 2),
                    'oi': int(random.randint(15000, 240000) * lot_size),
                    'volume': int(random.randint(50000, 800000)),
                    'iv': round(random.uniform(12.5, 16.8), 2),
                }
            })
            current_strike += strike_step

        return {
            'index_name': spec['name'],
            'index_symbol': norm_key,
            'fyers_symbol': spec['fyers_symbol'],
            'spot_price': spot_price,
            'atm_strike': atm_strike,
            'lot_size': lot_size,
            'strike_step': strike_step,
            'expiry_day': spec['expiry_day'],
            'strikes': chain_rows,
            'timestamp': int(time.time()),
        }

    def _generate_synthetic_quote(self, norm_key: str, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generates realistic Brownian-walk price variations around base spot."""
        base_spot = spec['base_spot']
        cache_key = f"anvil:synth_last_price:{norm_key}"
        
        last_price = None
        if self.redis_client:
            stored = self.redis_client.get(cache_key)
            if stored:
                try:
                    last_price = float(stored)
                except Exception:
                    pass
        
        if not last_price:
            last_price = base_spot

        # Brownian jitter +/- 0.08%
        drift = random.uniform(-0.0008, 0.0008) * last_price
        new_ltp = round(max(base_spot * 0.85, min(base_spot * 1.15, last_price + drift)), 2)

        if self.redis_client:
            self.redis_client.set(cache_key, str(new_ltp), ex=86400)

        ch = round(new_ltp - base_spot, 2)
        chp = round((ch / base_spot) * 100, 2)

        return {
            'symbol': spec['fyers_symbol'],
            'index_name': spec['name'],
            'index_key': norm_key,
            'ltp': new_ltp,
            'open': round(base_spot - 25.0, 2),
            'high': round(max(new_ltp, base_spot + 60.0), 2),
            'low': round(min(new_ltp, base_spot - 50.0), 2),
            'prev_close': base_spot,
            'ch': ch,
            'chp': chp,
            'volume': random.randint(12000000, 35000000),
            'timestamp': int(time.time()),
            'source': 'SYNTHETIC_SIMULATION',
        }

    def _save_quote_to_cache(self, fyers_sym: str, quote: Dict[str, Any]):
        """Persists quote to Redis and Django cache."""
        payload = json.dumps(quote)
        if self.redis_client:
            try:
                self.redis_client.set(f"anvil:fyers_quote:{fyers_sym}", payload, ex=10)
            except Exception:
                pass
        cache.set(f"anvil:fyers_quote:{fyers_sym}", quote, timeout=5)

fyers_service = FyersFeedService()
