import json
import os
import time
import urllib.request


def fetch_ngrok_url(timeout=2, retries=5, delay=1):
    env_url = os.environ.get('NGROK_URL') or os.environ.get('TUNNEL_URL')
    if env_url:
        return env_url

    api_endpoints = [
        'http://ngrok:4040/api/tunnels',
        'http://127.0.0.1:4040/api/tunnels',
        'http://localhost:4040/api/tunnels',
        'http://localhost:8540/api/tunnels',
    ]

    for attempt in range(retries):
        for endpoint in api_endpoints:
            try:
                req = urllib.request.Request(endpoint, headers={'User-Agent': 'ANVIL-Sandbox/1.0'})
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    tunnels = data.get('tunnels', [])
                    for tunnel in tunnels:
                        public_url = tunnel.get('public_url')
                        if public_url:
                            return public_url
            except Exception:
                pass
        if attempt < retries - 1:
            time.sleep(delay)
    return None
