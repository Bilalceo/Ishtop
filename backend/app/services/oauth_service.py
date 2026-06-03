"""
=============================================================================
OAUTH2 SERVICE - Google & LinkedIn Integration
=============================================================================

Bu service OAuth2 provider'lar bilan ishlaydi:
- Google OAuth2
- LinkedIn OAuth2

Xususiyatlari:
- Authorization URL generation
- Token exchange
- User info retrieval
- Auto user creation

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import logging
from typing import Optional, Dict, Any
from urllib.parse import urlencode

import httpx
from authlib.integrations.starlette_client import OAuth

from app.config import settings

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# OAUTH CLIENT CONFIGURATION
# =============================================================================

class OAuthService:
    """
    OAuth2 service for Google and LinkedIn.
    """
    
    def __init__(self):
        """Initialize OAuth service."""
        self.google_client_id = settings.GOOGLE_CLIENT_ID
        self.google_client_secret = settings.GOOGLE_CLIENT_SECRET
        self.google_redirect_uri = settings.GOOGLE_REDIRECT_URI
        
        self.linkedin_client_id = settings.LINKEDIN_CLIENT_ID
        self.linkedin_client_secret = settings.LINKEDIN_CLIENT_SECRET
        self.linkedin_redirect_uri = settings.LINKEDIN_REDIRECT_URI
        
        self.enabled = settings.OAUTH_ENABLED
        
        logger.info(f"OAuthService initialized. Enabled: {self.enabled}")
    
    # =========================================================================
    # GOOGLE OAUTH
    # =========================================================================
    
    def get_google_auth_url(self, state: str) -> str:
        """
        Get Google authorization URL.
        
        Args:
            state: CSRF protection token
            
        Returns:
            Authorization URL
        """
        params = {
            "client_id": self.google_client_id,
            "redirect_uri": self.google_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
        
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        return f"{base_url}?{urlencode(params)}"
    
    async def get_google_user_info(self, code: str) -> Dict[str, Any]:
        """
        Exchange code for access token and get user info.
        
        Args:
            code: Authorization code from callback
            
        Returns:
            User info dict with email, name, picture
        """
        # Exchange code for access token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": self.google_client_id,
            "client_secret": self.google_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.google_redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            # Get access token
            token_response = await client.post(token_url, data=token_data)
            
            if token_response.status_code != 200:
                logger.error(f"Google token exchange failed: {token_response.text}")
                raise ValueError("Failed to exchange code for token")
            
            token_json = token_response.json()
            access_token = token_json.get("access_token")
            
            if not access_token:
                raise ValueError("No access token in response")
            
            # Get user info
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            
            userinfo_response = await client.get(userinfo_url, headers=headers)
            
            if userinfo_response.status_code != 200:
                logger.error(f"Google userinfo failed: {userinfo_response.text}")
                raise ValueError("Failed to get user info")
            
            user_info = userinfo_response.json()
            
            logger.info(f"Google OAuth successful for: {user_info.get('email', 'unknown')[:3]}***")
            
            return {
                "email": user_info.get("email"),
                "name": user_info.get("name"),
                "given_name": user_info.get("given_name"),
                "family_name": user_info.get("family_name"),
                "picture": user_info.get("picture"),
                "email_verified": user_info.get("verified_email", False),
                "provider": "google",
                "provider_user_id": user_info.get("id"),
            }
    
    # =========================================================================
    # LINKEDIN OAUTH
    # =========================================================================
    
    def get_linkedin_auth_url(self, state: str) -> str:
        """
        Get LinkedIn authorization URL.
        
        Args:
            state: CSRF protection token
            
        Returns:
            Authorization URL
        """
        params = {
            "client_id": self.linkedin_client_id,
            "redirect_uri": self.linkedin_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        }
        
        base_url = "https://www.linkedin.com/oauth/v2/authorization"
        return f"{base_url}?{urlencode(params)}"
    
    async def get_linkedin_user_info(self, code: str) -> Dict[str, Any]:
        """
        Exchange code for access token and get user info.
        
        Args:
            code: Authorization code from callback
            
        Returns:
            User info dict
        """
        # Exchange code for access token
        token_url = "https://www.linkedin.com/oauth/v2/accessToken"
        token_data = {
            "client_id": self.linkedin_client_id,
            "client_secret": self.linkedin_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.linkedin_redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            # Get access token
            token_response = await client.post(
                token_url,
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if token_response.status_code != 200:
                logger.error(f"LinkedIn token exchange failed: {token_response.text}")
                raise ValueError("Failed to exchange code for token")
            
            token_json = token_response.json()
            access_token = token_json.get("access_token")
            
            if not access_token:
                raise ValueError("No access token in response")
            
            # Get user info (OpenID Connect userinfo endpoint)
            userinfo_url = "https://api.linkedin.com/v2/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            
            userinfo_response = await client.get(userinfo_url, headers=headers)
            
            if userinfo_response.status_code != 200:
                logger.error(f"LinkedIn userinfo failed: {userinfo_response.text}")
                raise ValueError("Failed to get user info")
            
            user_info = userinfo_response.json()
            
            logger.info(f"LinkedIn OAuth successful for: {user_info.get('email', 'unknown')[:3]}***")
            
            return {
                "email": user_info.get("email"),
                "name": user_info.get("name"),
                "given_name": user_info.get("given_name"),
                "family_name": user_info.get("family_name"),
                "picture": user_info.get("picture"),
                "email_verified": user_info.get("email_verified", False),
                "provider": "linkedin",
                "provider_user_id": user_info.get("sub"),
            }
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def is_configured(self) -> Dict[str, bool]:
        """Check which providers are configured."""
        return {
            "google": bool(self.google_client_id and self.google_client_secret),
            "linkedin": bool(self.linkedin_client_id and self.linkedin_client_secret),
            "enabled": self.enabled,
        }


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

oauth_service = OAuthService()








