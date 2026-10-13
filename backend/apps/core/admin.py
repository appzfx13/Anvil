from django.contrib import admin
from apps.core.models import SiteConfiguration

@admin.register(SiteConfiguration)
class SiteConfigurationAdmin(admin.ModelAdmin):
    list_display = ('id', 'feed_status', 'fyers_app_id', 'has_token', 'token_generated_at', 'updated_at')
    readonly_fields = ('updated_at', 'created_at')

    def has_token(self, obj):
        return bool(obj.fyers_access_token)
    has_token.boolean = True
