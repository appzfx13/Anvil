from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.authentication.models import User
from apps.authentication.services import (
    generate_numeric_otp,
    send_gmail_otp,
    generate_jwt_token,
    decode_jwt_token
)
from apps.accounts.models import VirtualAccount

class SendOtpView(APIView):
    """
    POST /api/auth/otp/send
    Sends a 6-digit verification code to the provided email via Gmail SMTP.
    """
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email or '@' not in email:
            return Response({'error': 'A valid email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create inactive user placeholder
        user, _ = User.objects.get_or_create(email=email)
        otp = generate_numeric_otp(6)
        user.otp_code = otp
        user.otp_created_at = timezone.now()
        user.save()

        # Send via Gmail SMTP
        sent = send_gmail_otp(email, otp)

        response_data = {
            'success': True,
            'message': f'Verification OTP sent to {email}.',
            'email': email,
        }

        # Include dev_otp for developer convenience if in DEBUG mode
        if settings.DEBUG:
            response_data['dev_otp'] = otp

        return Response(response_data, status=status.HTTP_200_OK)

class VerifyOtpView(APIView):
    """
    POST /api/auth/otp/verify
    Validates the 6-digit OTP and authenticates or registers the user.
    """
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = str(request.data.get('otp', '')).strip()

        if not email or not otp:
            return Response({'error': 'Email and OTP are strictly required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found. Please request a new OTP.'}, status=status.HTTP_404_NOT_FOUND)

        # Validate OTP expiration (10 minutes)
        if not user.otp_code or not user.otp_created_at:
            return Response({'error': 'No active OTP found. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() - user.otp_created_at > timedelta(minutes=10):
            return Response({'error': 'Verification OTP has expired. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.otp_code != otp:
            return Response({'error': 'Invalid verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark verified & clear single-use OTP
        user.is_verified = True
        user.otp_code = None
        user.save()

        # Ensure Virtual Account ledger exists
        account, _ = VirtualAccount.objects.get_or_create(
            user=user,
            defaults={
                'dhan_client_id': user.dhan_client_id,
                'account_name': user.full_name or f"Sandbox Account {user.dhan_client_id}",
                'availabel_balance': settings.DEFAULT_SOD_BALANCE,
                'sod_limit': settings.DEFAULT_SOD_BALANCE,
            }
        )

        jwt_token = generate_jwt_token(user)

        return Response({
            'success': True,
            'token': jwt_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'dhan_client_id': user.dhan_client_id,
                'access_token': user.access_token,
                'is_verified': user.is_verified,
            },
            'account': {
                'available_balance': float(account.availabel_balance),
                'sod_limit': float(account.sod_limit),
                'utilized_margin': float(account.utilized_margin),
            }
        }, status=status.HTTP_200_OK)

class GoogleSsoView(APIView):
    """
    POST /api/auth/google
    Handles Google OAuth SSO login/registration.
    """
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        full_name = request.data.get('name', '').strip()
        google_id = request.data.get('google_id', '').strip()

        if not email or '@' not in email:
            return Response({'error': 'Valid Google email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(email=email)
        if full_name and not user.full_name:
            user.full_name = full_name
        if google_id:
            user.google_id = google_id
        user.is_verified = True
        user.save()

        # Ensure Virtual Account ledger exists
        account, _ = VirtualAccount.objects.get_or_create(
            user=user,
            defaults={
                'dhan_client_id': user.dhan_client_id,
                'account_name': user.full_name or f"Sandbox Account {user.dhan_client_id}",
                'availabel_balance': settings.DEFAULT_SOD_BALANCE,
                'sod_limit': settings.DEFAULT_SOD_BALANCE,
            }
        )

        jwt_token = generate_jwt_token(user)

        return Response({
            'success': True,
            'token': jwt_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'dhan_client_id': user.dhan_client_id,
                'access_token': user.access_token,
                'is_verified': user.is_verified,
            },
            'account': {
                'available_balance': float(account.availabel_balance),
                'sod_limit': float(account.sod_limit),
                'utilized_margin': float(account.utilized_margin),
            }
        }, status=status.HTTP_200_OK)

class CurrentUserView(APIView):
    """
    GET /api/auth/me
    Returns current authenticated user details and active sandbox credentials.
    """
    def get(self, request):
        auth_header = request.headers.get('Authorization', '')
        client_id_header = request.headers.get('client-id', '')

        user = None
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = decode_jwt_token(token)
                user = User.objects.get(id=payload['user_id'])
            except Exception:
                pass

        if not user and client_id_header:
            try:
                user = User.objects.get(dhan_client_id=client_id_header)
            except User.DoesNotExist:
                pass

        if not user:
            # Fallback to default demo sandbox user
            user = User.objects.first()
            if not user:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

        account = VirtualAccount.objects.filter(user=user).first()
        available = float(account.availabel_balance) if account else settings.DEFAULT_SOD_BALANCE
        sod = float(account.sod_limit) if account else settings.DEFAULT_SOD_BALANCE
        utilized = float(account.utilized_margin) if account else 0.0

        return Response({
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'dhan_client_id': user.dhan_client_id,
                'access_token': user.access_token,
                'is_verified': user.is_verified,
            },
            'account': {
                'available_balance': available,
                'sod_limit': sod,
                'utilized_margin': utilized,
            }
        }, status=status.HTTP_200_OK)

class ResetCredentialsView(APIView):
    """
    POST /api/auth/reset-keys
    Regenerates Dhan Client Access Token for the user.
    """
    def post(self, request):
        client_id = request.headers.get('client-id') or request.data.get('client_id')
        user = None
        if client_id:
            user = User.objects.filter(dhan_client_id=client_id).first()
        if not user:
            user = User.objects.first()

        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        user.access_token = User.generate_new_access_token()
        user.save()

        return Response({
            'success': True,
            'message': 'Sandbox Access Token regenerated successfully.',
            'dhan_client_id': user.dhan_client_id,
            'access_token': user.access_token,
        }, status=status.HTTP_200_OK)
