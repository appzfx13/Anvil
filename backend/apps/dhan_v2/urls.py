from django.urls import path
from apps.dhan_v2.views import (
    OrdersView,
    OrderDetailView,
    ExternalOrderView,
    TradesView,
    PositionsView,
    ConvertPositionView,
    HoldingsView,
    FundLimitView,
    MarginCalculatorView,
    OptionChainView,
    QuotesView,
    PostbackReceiverView
)

urlpatterns = [
    # Dhan v2 Core Endpoints
    path('orders', OrdersView.as_view(), name='dhan-orders'),
    path('orders/', OrdersView.as_view()),
    path('orders/<str:order_id>', OrderDetailView.as_view(), name='dhan-order-detail'),
    path('orders/<str:order_id>/', OrderDetailView.as_view()),
    path('orders/external/<str:correlation_id>', ExternalOrderView.as_view(), name='dhan-order-external'),
    path('trades', TradesView.as_view(), name='dhan-trades'),
    path('trades/', TradesView.as_view()),
    path('trades/<str:order_id>', TradesView.as_view(), name='dhan-trades-by-order'),
    path('positions', PositionsView.as_view(), name='dhan-positions'),
    path('positions/', PositionsView.as_view()),
    path('positions/convert', ConvertPositionView.as_view(), name='dhan-positions-convert'),
    path('holdings', HoldingsView.as_view(), name='dhan-holdings'),
    path('holdings/', HoldingsView.as_view()),
    path('fundlimit', FundLimitView.as_view(), name='dhan-fundlimit'),
    path('fundlimit/', FundLimitView.as_view()),
    path('margincalculator', MarginCalculatorView.as_view(), name='dhan-margin-calculator'),
    path('optionchain', OptionChainView.as_view(), name='dhan-optionchain'),
    path('optionchain/', OptionChainView.as_view()),
    path('quotes', QuotesView.as_view(), name='dhan-quotes'),
    path('quotes/', QuotesView.as_view()),
    path('postback/', PostbackReceiverView.as_view(), name='dhan-postback'),
]
