from django.urls import path
from apps.core.admin_views import (
    AdminTradersListView,
    AdminTraderActionView,
    AdminTradesListView,
    AdminOrdersListView,
    AdminSystemOverviewView,
)

urlpatterns = [
    path('traders/', AdminTradersListView.as_view(), name='admin-traders-list'),
    path('traders/<int:user_id>/action/', AdminTraderActionView.as_view(), name='admin-trader-action'),
    path('trades/', AdminTradesListView.as_view(), name='admin-trades-list'),
    path('orders/', AdminOrdersListView.as_view(), name='admin-orders-list'),
    path('overview/', AdminSystemOverviewView.as_view(), name='admin-overview'),
]
