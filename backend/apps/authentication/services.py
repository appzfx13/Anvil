import secrets
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

def generate_numeric_otp(length: int = 6) -> str:
    """Generate a secure 6-digit numeric OTP."""
    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(length))

def send_gmail_otp(to_email: str, otp: str) -> bool:
    """
    Sends 6-digit verification code to the user via Gmail SMTP.
    """
    subject = f"Your ANVIL Sandbox Verification Code: {otp}"
    message = (
        f"Welcome to ANVIL — Precision Indian Derivative Execution Sandbox.\n\n"
        f"Your 6-digit one-time access verification code is: {otp}\n\n"
        f"This code will expire in 10 minutes.\n"
        f"If you did not request this verification, please ignore this email.\n\n"
        f"— Team ANVIL"
    )
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'ANVIL Sandbox <no-reply@anvil.local>')
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[to_email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"[ANVIL-EMAIL-ERROR] Failed to send email via SMTP: {e}")
        # In development console fallback mode, print directly to console
        print(f"============================================================")
        print(f"[SANDBOX DEV OTP] Code for {to_email}: {otp}")
        print(f"============================================================")
        return False

def generate_jwt_token(user) -> str:
    """Generate JWT auth token for user session."""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'dhan_client_id': user.dhan_client_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

def decode_jwt_token(token: str) -> dict:
    """Decode and validate JWT auth token."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
