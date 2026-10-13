import json
from django.shortcuts import redirect
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.core.models import SiteConfiguration
from apps.fyers_feed.services import fyers_service

class FyersConfigView(APIView):
    """
    GET /api/fyers/config
    POST /api/fyers/config
    Retrieves and updates Site Configuration & Fyers API v3 Data Feed credentials.
    """
    def get(self, request):
        config = SiteConfiguration.get_solo()
        has_token = bool(config.fyers_access_token)
        
        # Check if current status should be checked
        return Response({
            "app_id": config.fyers_app_id,
            "secret_key": config.fyers_secret_key,
            "redirect_uri": config.fyers_redirect_uri,
            "has_token": has_token,
            "feed_status": config.feed_status,
            "token_generated_at": config.token_generated_at,
            "last_error": config.last_error_message,
            "feed_active": config.feed_active,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        config = SiteConfiguration.get_solo()
        data = request.data

        if 'app_id' in data:
            config.fyers_app_id = str(data['app_id']).strip()
        if 'secret_key' in data:
            config.fyers_secret_key = str(data['secret_key']).strip()
        if 'redirect_uri' in data:
            config.fyers_redirect_uri = str(data['redirect_uri']).strip()
        if 'feed_active' in data:
            config.feed_active = bool(data['feed_active'])

        manual_token = str(data.get('access_token', '')).strip()
        if manual_token:
            config.fyers_access_token = manual_token
            config.token_generated_at = timezone.now()
            config.feed_status = 'AUTHENTICATED'
            config.last_error_message = ''
        
        # If user changed credentials but has no token yet
        if not config.fyers_access_token:
            if config.fyers_app_id and config.fyers_secret_key:
                config.feed_status = 'CONFIGURED'
            else:
                config.feed_status = 'DISCONNECTED'

        config.save()
        fyers_service.reload_credentials()

        # If token was set, test it immediately
        if manual_token:
            test_quotes = fyers_service.fetch_fyers_quote_live(["NSE:NIFTY50-INDEX"])
            if test_quotes:
                config.feed_status = 'ACTIVE'
                config.save()

        return Response({
            "success": True,
            "message": "Site configuration saved successfully.",
            "app_id": config.fyers_app_id,
            "secret_key": config.fyers_secret_key,
            "redirect_uri": config.fyers_redirect_uri,
            "has_token": bool(config.fyers_access_token),
            "feed_status": config.feed_status,
            "last_error": config.last_error_message,
        }, status=status.HTTP_200_OK)

class FyersAuthUrlView(APIView):
    """
    GET /api/fyers/auth-url
    Returns the exact Fyers OAuth Authorization URL.
    """
    def get(self, request):
        redirect_uri = request.query_params.get('redirect_uri', '').strip()
        try:
            auth_url = fyers_service.generate_auth_url(redirect_uri)
            return Response({"auth_url": auth_url}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Failed to generate auth URL: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FyersCallbackView(APIView):
    """
    GET /api/fyers/callback
    Fyers OAuth 2.0 redirection endpoint.
    Extracts authorization code, exchanges for access token, and redirects back to ANVIL dashboard.
    """
    def get(self, request):
        auth_code = (
            request.query_params.get('auth_code') or 
            request.query_params.get('code') or 
            request.query_params.get('authCode')
        )
        error = request.query_params.get('error_description') or request.query_params.get('message')

        if error:
            config = SiteConfiguration.get_solo()
            config.feed_status = 'ERROR'
            config.last_error_message = f"Fyers OAuth declined: {error}"
            config.save()
            return redirect(f"/?fyers_auth=error&msg={error}")

        if not auth_code:
            return redirect("/?fyers_auth=error&msg=No authorization code received from Fyers")

        # Determine redirect_uri used during initial request
        config = SiteConfiguration.get_solo()
        redirect_uri = config.fyers_redirect_uri or request.build_absolute_uri('/api/fyers/callback/')

        success, res = fyers_service.validate_auth_code(auth_code, redirect_uri)
        if success:
            return redirect("/?fyers_auth=success")
        else:
            err_msg = res.get('error', 'Token exchange failed')
            return redirect(f"/?fyers_auth=error&msg={err_msg}")

class FyersTestFeedView(APIView):
    """
    POST /api/fyers/test-feed
    Tests current live quote connectivity.
    """
    def post(self, request):
        quotes = fyers_service.fetch_fyers_quote_live(["NSE:NIFTY50-INDEX", "NSE:NIFTYBANK-INDEX"])
        if quotes:
            config = SiteConfiguration.get_solo()
            config.feed_status = 'ACTIVE'
            config.save()
            return Response({
                "success": True,
                "message": "Fyers API v3 connected! Real Level-1 quotes ingested.",
                "sample_quotes": quotes
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "success": False,
                "message": "Unable to fetch quotes with current credentials.",
                "is_configured": fyers_service.is_fyers_configured()
            }, status=status.HTTP_400_BAD_REQUEST)
