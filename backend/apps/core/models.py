from django.db import models
from django.conf import settings

class SiteConfiguration(models.Model):
    """
    Global Site & Broker Data Feed Configuration.
    Manages Fyers API v3 OAuth credentials, token lifecycle, and market feed status.
    """
    # Fyers Broker API v3 Credentials
    fyers_app_id = models.CharField(max_length=150, blank=True, default='')
    fyers_secret_key = models.CharField(max_length=255, blank=True, default='')
    fyers_redirect_uri = models.CharField(max_length=255, blank=True, default='')
    fyers_access_token = models.TextField(blank=True, default='')
    fyers_refresh_token = models.TextField(blank=True, default='')
    token_generated_at = models.DateTimeField(null=True, blank=True)
    
    # Status: 'DISCONNECTED', 'CONFIGURED', 'AUTHENTICATED', 'ACTIVE', 'ERROR'
    feed_status = models.CharField(max_length=50, default='DISCONNECTED')
    last_error_message = models.TextField(blank=True, default='')

    # General Broker Sandbox Settings
    feed_active = models.BooleanField(default=True)
    postback_webhook_url = models.CharField(max_length=255, blank=True, default='')
    default_sod_balance = models.DecimalField(max_digits=14, decimal_places=2, default=500000.00)

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Site Configuration"
        verbose_name_plural = "Site Configuration"

    def __str__(self):
        token_state = "Token Present" if self.fyers_access_token else "No Token"
        return f"Site Configuration [{self.feed_status} | {token_state}]"

    @classmethod
    def get_solo(cls):
        """Singleton pattern: Retrieves or initializes the single site configuration record."""
        obj = cls.objects.first()
        if not obj:
            app_id = getattr(settings, 'FYERS_APP_ID', '')
            secret_key = getattr(settings, 'FYERS_SECRET_KEY', '')
            token = getattr(settings, 'FYERS_ACCESS_TOKEN', '')
            status_val = 'AUTHENTICATED' if (app_id and token) else ('CONFIGURED' if (app_id and secret_key) else 'DISCONNECTED')
            obj = cls.objects.create(
                fyers_app_id=app_id,
                fyers_secret_key=secret_key,
                fyers_access_token=token,
                feed_status=status_val,
                feed_active=getattr(settings, 'FYERS_FEED_ACTIVE', True),
                postback_webhook_url=getattr(settings, 'POSTBACK_WEBHOOK_URL', '')
            )
        return obj
