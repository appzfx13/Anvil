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
    PostbackReceiverView,
    TokenExchangeView,
    KillSwitchView,
    PostbackConfigView,
    TestPostbackView
)

urlpatterns = [
    # Permanent Token Exchange for MARMOT Sandbox Terminal
    path('token', TokenExchangeView.as_view(), name='dhan-token'),
    path('token/', TokenExchangeView.as_view()),
    path('auth/token', TokenExchangeView.as_view(), name='dhan-auth-token'),
    path('auth/token/', TokenExchangeView.as_view()),

    # Dhan v2 Kill Switch (Emergency Cancel Orders & Square Off Positions)
    path('killswitch', KillSwitchView.as_view(), name='dhan-killswitch'),
    path('killswitch/', KillSwitchView.as_view()),

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
    path('postback/config/', PostbackConfigView.as_view(), name='dhan-postback-config'),
    path('postback/test/', TestPostbackView.as_view(), name='dhan-postback-test'),
]
