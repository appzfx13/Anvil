from django.urls import path
from apps.accounts.views import AccountSummaryView, AdjustFundsView, ResetAccountView

urlpatterns = [
    path('summary/', AccountSummaryView.as_view(), name='account-summary'),
    path('adjust-funds/', AdjustFundsView.as_view(), name='account-adjust-funds'),
    path('reset/', ResetAccountView.as_view(), name='account-reset'),
]
