"""
Real-time FYERS API v3 Market Feed Service & OAuth 2.0 Ingress Handler.
Strict Data Integrity:
- Real-time Level-1 spot quotes from Fyers API v3.
- Real-time Option Chains directly from Fyers /data/options-chain-v3.
- NO synthetic drift or dummy Brownian motion fallbacks allowed.
- Caches quotes directly in Redis for sub-millisecond Go engine ingestion.
"""
import hashlib
import json
import threading
import time
import requests
from typing import Dict, Any, List, Optional, Tuple
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
import redis

from apps.core.constants import INDEX_SPECS, resolve_index

class FyersFeedService:
    def __init__(self):
        self.base_url = "https://api-t1.fyers.in/data"
        self.auth_base_url = "https://api-t1.fyers.in/api/v3"
        self.app_id = ""
        self.secret_key = ""
        self.access_token = ""
        self.headers = {}
        self._feeder_started = False
        
        # Redis client for low-latency engine sharing
        try:
            self.redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.redis_client.ping()
        except Exception:
            self.redis_client = None

        self.reload_credentials()
        self._start_background_feeder()

    def reload_credentials(self):
        """Loads latest credentials from SiteConfiguration or settings."""
        try:
            from apps.core.models import SiteConfiguration
            config = SiteConfiguration.get_solo()
            self.app_id = config.fyers_app_id or getattr(settings, 'FYERS_APP_ID', '')
            self.secret_key = config.fyers_secret_key or getattr(settings, 'FYERS_SECRET_KEY', '')
            self.access_token = config.fyers_access_token or getattr(settings, 'FYERS_ACCESS_TOKEN', '')
        except Exception:
            self.app_id = getattr(settings, 'FYERS_APP_ID', '')
            self.secret_key = getattr(settings, 'FYERS_SECRET_KEY', '')
            self.access_token = getattr(settings, 'FYERS_ACCESS_TOKEN', '')

        if self.app_id and self.access_token:
            self.headers = {
                "Authorization": f"{self.app_id}:{self.access_token}"
            }
        else:
            self.headers = {}

    def is_fyers_configured(self) -> bool:
        """Checks if active Fyers API credentials are set."""
        if not (self.app_id and self.access_token):
            self.reload_credentials()
        return bool(self.app_id and self.access_token)

    def generate_auth_url(self, redirect_uri: str) -> str:
        """Generates the Fyers v3 OAuth authorization URL."""
        self.reload_credentials()
        from apps.core.models import SiteConfiguration
        config = SiteConfiguration.get_solo()
        app_id = self.app_id or config.fyers_app_id
        if not app_id:
            raise ValueError("Fyers App ID is missing. Please save App ID in Data Feed Settings first.")
        
        redirect = redirect_uri or config.fyers_redirect_uri or "http://localhost:8500/api/fyers/callback/"
        return f"{self.auth_base_url}/generate-authcode?client_id={app_id}&redirect_uri={redirect}&response_type=code&state=anvil_fyers_auth"

    def validate_auth_code(self, auth_code: str, redirect_uri: str = "") -> Tuple[bool, Dict[str, Any]]:
        """
        Exchanges the Fyers auth_code for an access token using appIdHash.
        Saves the token to SiteConfiguration.
        """
        self.reload_credentials()
        from apps.core.models import SiteConfiguration
        config = SiteConfiguration.get_solo()
        app_id = self.app_id or config.fyers_app_id
        secret_key = self.secret_key or config.fyers_secret_key

        if not app_id or not secret_key:
            return False, {"error": "App ID or Secret Key is not configured."}

        # Calculate SHA-256 appIdHash: sha256("{app_id}:{secret_key}")
        hash_input = f"{app_id}:{secret_key}".encode('utf-8')
        app_id_hash = hashlib.sha256(hash_input).hexdigest()

        url = f"{self.auth_base_url}/validate-authcode"
        payload = {
            "grant_type": "authorization_code",
            "appIdHash": app_id_hash,
            "code": auth_code
        }

        try:
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
            data = res.json()
            if res.status_code == 200 and data.get('s') == 'ok':
                token = data.get('access_token')
                config.fyers_access_token = token
                config.token_generated_at = timezone.now()
                config.feed_status = 'AUTHENTICATED'
                config.last_error_message = ''
                config.save()

                self.reload_credentials()
                
                # Test quote fetch immediately
                quotes = self.fetch_fyers_quote_live(["NSE:NIFTY50-INDEX"])
                if quotes:
                    config.feed_status = 'ACTIVE'
                    config.save()
                return True, {"message": "Authenticated with Fyers successfully", "access_token": token}
            else:
                err_msg = data.get('message') or f"Fyers error code {data.get('code')}"
                config.feed_status = 'ERROR'
                config.last_error_message = err_msg
                config.save()
                return False, {"error": err_msg, "response": data}
        except Exception as e:
            err_msg = f"Network error during Fyers token exchange: {str(e)}"
            config.feed_status = 'ERROR'
            config.last_error_message = err_msg
            config.save()
            return False, {"error": err_msg}

    def set_manual_token(self, token: str) -> Tuple[bool, Dict[str, Any]]:
        """Sets a manually pasted access token and tests validity."""
        from apps.core.models import SiteConfiguration
        config = SiteConfiguration.get_solo()
        config.fyers_access_token = token.strip()
        config.token_generated_at = timezone.now()
        config.feed_status = 'AUTHENTICATED'
        config.last_error_message = ''
        config.save()

        self.reload_credentials()

        # Test token with a live request
        quotes = self.fetch_fyers_quote_live(["NSE:NIFTY50-INDEX"])
        if quotes:
            config.feed_status = 'ACTIVE'
            config.save()
            return True, {"message": "Token verified and active! Real-time data feed streaming.", "quotes": quotes}
        else:
            return True, {"message": "Token saved. Real-time data feed configured."}

    def fetch_fyers_quote_live(self, symbols: List[str]) -> Dict[str, Any]:
        """Fetch real-time Level-1 quotes directly from Fyers API v3."""
        if not self.is_fyers_configured():
            return {}

        symbols_param = ",".join(symbols)
        url = f"{self.base_url}/quotes?symbols={symbols_param}"
        try:
            res = requests.get(url, headers=self.headers, timeout=4.0)
            if res.status_code == 200:
                data = res.json()
                if data.get('s') == 'ok' and 'd' in data:
                    result = {}
                    for item in data['d']:
                        sym = item.get('n')
                        v = item.get('v', {})
                        quote_obj = {
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
                            'is_live': True,
                        }

                        # Match with internal index spec
                        for k, spec in INDEX_SPECS.items():
                            if spec['fyers_symbol'] == sym:
                                quote_obj['index_key'] = k
                                quote_obj['index_name'] = spec['name']
                                break

                        result[sym] = quote_obj
                        self._save_quote_to_cache(sym, quote_obj)
                    return result
            elif res.status_code == 401:
                from apps.core.models import SiteConfiguration
                config = SiteConfiguration.get_solo()
                config.feed_status = 'ERROR'
                config.last_error_message = 'Fyers access token expired (401 Unauthorized).'
                config.save()
        except Exception as e:
            pass
        return {}

    def get_index_quote(self, index_key: str) -> Dict[str, Any]:
        """
        Gets the spot quote for a supported index.
        STRICT: Only real Fyers Level-1 data. Zero synthetic/drift fallback.
        """
        norm_key = resolve_index(index_key)
        spec = INDEX_SPECS[norm_key]
        fyers_sym = spec['fyers_symbol']
        cache_key = f"anvil:fyers_quote:{fyers_sym}"

        # 1. Check Redis cache first
        if self.redis_client:
            try:
                raw = self.redis_client.get(cache_key)
                if raw:
                    q = json.loads(raw)
                    q['index_name'] = spec['name']
                    q['index_key'] = norm_key
                    return q
            except Exception:
                pass

        # 2. Try fetching live from Fyers if configured
        if self.is_fyers_configured():
            live_quotes = self.fetch_fyers_quote_live([fyers_sym])
            if fyers_sym in live_quotes:
                quote = live_quotes[fyers_sym]
                quote['index_name'] = spec['name']
                quote['index_key'] = norm_key
                self._save_quote_to_cache(fyers_sym, quote)
                return quote

        # 3. STRICT RULE: No synthetic fallback. Return clean disconnected state.
        return {
            'symbol': fyers_sym,
            'index_name': spec['name'],
            'index_key': norm_key,
            'ltp': 0.0,
            'open': 0.0,
            'high': 0.0,
            'low': 0.0,
            'prev_close': 0.0,
            'ch': 0.0,
            'chp': 0.0,
            'volume': 0,
            'timestamp': int(time.time()),
            'source': 'DISCONNECTED',
            'is_live': False,
            'error': 'Fyers Data Feed not authenticated or offline. No synthetic fallback.',
        }

    def get_all_index_quotes(self) -> List[Dict[str, Any]]:
        """Returns spot quotes for all 5 supported indices."""
        all_symbols = [spec['fyers_symbol'] for spec in INDEX_SPECS.values()]
        if self.is_fyers_configured():
            live_batch = self.fetch_fyers_quote_live(all_symbols)
            if len(live_batch) > 0:
                quotes = []
                for index_key, spec in INDEX_SPECS.items():
                    sym = spec['fyers_symbol']
                    if sym in live_batch:
                        q = live_batch[sym]
                        q['index_name'] = spec['name']
                        q['index_key'] = index_key
                        quotes.append(q)
                    else:
                        quotes.append(self.get_index_quote(index_key))
                return quotes

        quotes = []
        for index_key in INDEX_SPECS.keys():
            quotes.append(self.get_index_quote(index_key))
        return quotes

    def get_option_chain(self, index_key: str, strike_count: int = 10) -> Dict[str, Any]:
        """
        Fetches live Option Chain directly from Fyers API v3.
        STRICT: No dummy or synthetic fallback. If unauthenticated, returns error status.
        """
        norm_key = resolve_index(index_key)
        spec = INDEX_SPECS[norm_key]
        fyers_sym = spec['fyers_symbol']

        if not self.is_fyers_configured():
            return {
                'index_name': spec['name'],
                'index_symbol': norm_key,
                'fyers_symbol': fyers_sym,
                'spot_price': 0.0,
                'atm_strike': 0,
                'lot_size': spec['lot_size'],
                'strike_step': spec['strike_interval'],
                'is_live': False,
                'error': 'Fyers Data Feed token required to view live option chain. Please configure your Fyers token in Data Feed Settings.',
                'strikes': [],
                'timestamp': int(time.time()),
            }

        url = f"{self.base_url}/options-chain-v3?symbol={fyers_sym}&strikecount={strike_count}"
        try:
            res = requests.get(url, headers=self.headers, timeout=6.0)
            if res.status_code == 200:
                data = res.json()
                if data.get('s') == 'ok' and 'data' in data:
                    raw_chain = data['data'].get('optionsChain', [])
                    expiry_data = data['data'].get('expiryData', [])
                    indiavix_data = data['data'].get('indiavixData', {})

                    # 1. Spot price resolution
                    spot_price = 0.0
                    for item in raw_chain:
                        if item.get('strike_price') == -1:
                            spot_price = float(item.get('ltp', 0.0))
                            break
                    if spot_price <= 0:
                        spot_quote = self.get_index_quote(norm_key)
                        spot_price = float(spot_quote.get('ltp', 0.0))

                    # 2. Group Call and Put by strike price
                    strikes_map = {}
                    for item in raw_chain:
                        strike = item.get('strike_price')
                        if strike is None or strike <= 0:
                            continue
                        
                        if strike not in strikes_map:
                            strikes_map[strike] = {
                                'strike_price': strike,
                                'is_atm': False,
                                'call': {
                                    'trading_symbol': '',
                                    'security_id': '',
                                    'ltp': 0.0,
                                    'ch': 0.0,
                                    'chp': 0.0,
                                    'oi': 0,
                                    'volume': 0,
                                    'iv': 0.0,
                                },
                                'put': {
                                    'trading_symbol': '',
                                    'security_id': '',
                                    'ltp': 0.0,
                                    'ch': 0.0,
                                    'chp': 0.0,
                                    'oi': 0,
                                    'volume': 0,
                                    'iv': 0.0,
                                },
                            }

                        opt_type = item.get('option_type', '').upper()
                        contract_info = {
                            'trading_symbol': item.get('symbol', ''),
                            'security_id': str(item.get('fyToken', '')),
                            'ltp': float(item.get('ltp', 0.0)),
                            'ch': float(item.get('ltpch', 0.0)),
                            'chp': float(item.get('ltpchp', 0.0)),
                            'oi': int(item.get('oi', 0)),
                            'volume': int(item.get('volume', 0)),
                            'iv': float(item.get('iv', 0.0)) if item.get('iv') is not None else 0.0,
                            'bid': float(item.get('bid', 0.0)),
                            'ask': float(item.get('ask', 0.0)),
                        }

                        if opt_type == 'CE':
                            strikes_map[strike]['call'] = contract_info
                        elif opt_type == 'PE':
                            strikes_map[strike]['put'] = contract_info

                    # 3. Calculate ATM strike
                    atm_strike = 0
                    if strikes_map:
                        atm_strike = min(strikes_map.keys(), key=lambda s: abs(s - spot_price))
                        if atm_strike in strikes_map:
                            strikes_map[atm_strike]['is_atm'] = True

                    # Sort strikes ascending
                    sorted_strikes = [strikes_map[s] for s in sorted(strikes_map.keys())]

                    return {
                        'index_name': spec['name'],
                        'index_symbol': norm_key,
                        'fyers_symbol': fyers_sym,
                        'spot_price': spot_price,
                        'atm_strike': atm_strike,
                        'lot_size': spec['lot_size'],
                        'strike_step': spec['strike_interval'],
                        'expiry_data': expiry_data,
                        'indiavix_data': indiavix_data,
                        'is_live': True,
                        'source': 'FYERS_LIVE_V3',
                        'strikes': sorted_strikes,
                        'timestamp': int(time.time()),
                    }
                else:
                    err = data.get('message', 'Fyers returned non-ok response')
                    return {
                        'index_name': spec['name'],
                        'index_symbol': norm_key,
                        'fyers_symbol': fyers_sym,
                        'spot_price': 0.0,
                        'is_live': False,
                        'error': f"Fyers option chain error: {err}",
                        'strikes': [],
                        'timestamp': int(time.time()),
                    }
            elif res.status_code == 401:
                return {
                    'index_name': spec['name'],
                    'index_symbol': norm_key,
                    'is_live': False,
                    'error': 'Fyers access token expired (401 Unauthorized). Please re-authenticate.',
                    'strikes': [],
                    'timestamp': int(time.time()),
                }
        except Exception as e:
            return {
                'index_name': spec['name'],
                'index_symbol': norm_key,
                'is_live': False,
                'error': f"Network error contacting Fyers: {str(e)}",
                'strikes': [],
                'timestamp': int(time.time()),
            }

        return {
            'index_name': spec['name'],
            'index_symbol': norm_key,
            'is_live': False,
            'error': 'Unable to retrieve live option chain.',
            'strikes': [],
            'timestamp': int(time.time()),
        }

    def _save_quote_to_cache(self, fyers_sym: str, quote: Dict[str, Any]):
        """Persists quote to Redis and Django cache with 300s TTL."""
        payload = json.dumps(quote)
        if self.redis_client:
            try:
                self.redis_client.set(f"anvil:fyers_quote:{fyers_sym}", payload, ex=300)
                idx_key = quote.get('index_key')
                if idx_key:
                    self.redis_client.set(f"anvil:live_tick:{idx_key}", payload, ex=300)
            except Exception:
                pass
        cache.set(f"anvil:fyers_quote:{fyers_sym}", quote, timeout=300)

    def _start_background_feeder(self):
        """Spawns background daemon thread to maintain continuous Fyers tick ingestion into Redis."""
        if self._feeder_started:
            return
        self._feeder_started = True
        thread = threading.Thread(target=self._feed_worker_loop, daemon=True, name="fyers_live_feed_worker")
        thread.start()

    def _feed_worker_loop(self):
        """Continuously polls Fyers API v3 and keeps Redis tick cache fresh every second."""
        all_symbols = [spec['fyers_symbol'] for spec in INDEX_SPECS.values()]
        while True:
            try:
                if self.is_fyers_configured():
                    quotes = self.fetch_fyers_quote_live(all_symbols)
                    if quotes:
                        try:
                            from apps.core.models import SiteConfiguration
                            config = SiteConfiguration.get_solo()
                            if config.feed_status != 'ACTIVE':
                                config.feed_status = 'ACTIVE'
                                config.last_error_message = ''
                                config.save()
                        except Exception:
                            pass
            except Exception:
                pass
            time.sleep(1.0)

fyers_service = FyersFeedService()
