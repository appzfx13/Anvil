from django.urls import path
from apps.accounts.views import AccountSummaryView, AdjustFundsView, ResetAccountView
from apps.dhan_v2.views import PostbackConfigView, TestPostbackView

urlpatterns = [
    path('summary/', AccountSummaryView.as_view(), name='account-summary'),
    path('adjust-funds/', AdjustFundsView.as_view(), name='account-adjust-funds'),
    path('reset/', ResetAccountView.as_view(), name='account-reset'),
    path('postback/', PostbackConfigView.as_view(), name='account-postback'),
    path('test-postback/', TestPostbackView.as_view(), name='account-test-postback'),
]
