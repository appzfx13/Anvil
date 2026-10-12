from django.urls import path
from apps.authentication.views import (
    SendOtpView,
    VerifyOtpView,
    GoogleSsoView,
    CurrentUserView,
    ResetCredentialsView
)

urlpatterns = [
    path('otp/send/', SendOtpView.as_view(), name='auth-otp-send'),
    path('otp/verify/', VerifyOtpView.as_view(), name='auth-otp-verify'),
    path('google/', GoogleSsoView.as_view(), name='auth-google-sso'),
    path('me/', CurrentUserView.as_view(), name='auth-current-user'),
    path('reset-keys/', ResetCredentialsView.as_view(), name='auth-reset-keys'),
]
