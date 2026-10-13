from django.urls import path
from apps.fyers_feed.views import (
    FyersConfigView,
    FyersAuthUrlView,
    FyersCallbackView,
    FyersTestFeedView
)

urlpatterns = [
    path('config/', FyersConfigView.as_view(), name='fyers-config'),
    path('auth-url/', FyersAuthUrlView.as_view(), name='fyers-auth-url'),
    path('callback/', FyersCallbackView.as_view(), name='fyers-callback'),
    path('test-feed/', FyersTestFeedView.as_view(), name='fyers-test-feed'),
]
