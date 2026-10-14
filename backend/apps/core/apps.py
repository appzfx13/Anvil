import os
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'

    def ready(self):
        """Log active Ngrok Tunnel URL when development server starts."""
        if os.environ.get('RUN_MAIN') == 'true':
            from apps.core.utils import fetch_ngrok_url
            tunnel_url = fetch_ngrok_url(timeout=2, retries=8, delay=1)
            if tunnel_url:
                print(f"\n{'=' * 65}")
                print(f"🚀 NGROK TUNNEL URL: {tunnel_url}")
                print(f"   Terminal & Dashboard: {tunnel_url}")
                print(f"{'=' * 65}\n")
