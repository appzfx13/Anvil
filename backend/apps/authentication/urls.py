from django.urls import path
from apps.authentication.views import (
    SendOtpView,
    VerifyOtpView,
    GoogleSsoView,
    CurrentUserView,
    ResetCredentialsView,
    DemoLoginView,
    TokenAuthView,
    AdminLoginView
)

urlpatterns = [
    path('otp/send/', SendOtpView.as_view(), name='auth-otp-send'),
    path('otp/verify/', VerifyOtpView.as_view(), name='auth-otp-verify'),
    path('google/', GoogleSsoView.as_view(), name='auth-google-sso'),
    path('me/', CurrentUserView.as_view(), name='auth-current-user'),
    path('demo-login/', DemoLoginView.as_view(), name='auth-demo-login'),
    path('admin-login/', AdminLoginView.as_view(), name='auth-admin-login'),
    path('reset-keys/', ResetCredentialsView.as_view(), name='auth-reset-keys'),
    path('token/', TokenAuthView.as_view(), name='auth-token'),
    path('token', TokenAuthView.as_view()),
]
