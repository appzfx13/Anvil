"""
ANVIL Root URL Configuration.
Provides seamless routing for Django Management APIs and Dhan v2 REST Wire Endpoints.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Internal Web Management & Telemetry APIs
    path('api/auth/', include('apps.authentication.urls')),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/admin-portal/', include('apps.core.admin_urls')),
    path('api/fyers/', include('apps.fyers_feed.urls')),
    path('api/core/', include('apps.fyers_feed.urls')),
    path('api/v2/', include('apps.dhan_v2.urls')),
    path('api/v1/market/', include('apps.market.urls')),

    # 100% Dhan v2 Standard Wire API Route (for official Dhan Python SDK / Go SDK / bots)
    path('v2/', include('apps.dhan_v2.urls')),
    
    # Marmot Emulator Compatibility Route
    path('mock/v2/', include('apps.dhan_v2.urls')),
]
