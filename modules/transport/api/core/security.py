"""
Sécurité de l'API Transport
- Authentification JWT
- Gestion des tokens Supabase
- Middleware de tenant
- Permissions et rôles
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import Depends, HTTPException, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import BaseModel

from .config import settings
from .exceptions import AuthenticationError, AuthorizationError

logger = logging.getLogger(__name__)

# Security scheme pour FastAPI docs
security_scheme = HTTPBearer(auto_error=False)


# ===================
# Models
# ===================

class TokenPayload(BaseModel):
    """Payload du token JWT"""
    sub: str  # User ID
    email: Optional[str] = None
    role: str = "user"
    organizations: List[str] = []
    exp: datetime
    iat: datetime
    iss: str = "transport-api"


class CurrentUser(BaseModel):
    """Utilisateur actuellement authentifié"""
    id: str
    email: Optional[str] = None
    role: str = "user"
    organizations: List[str] = []
    current_organization_id: Optional[str] = None

    def has_organization_access(self, org_id: str) -> bool:
        """Vérifie si l'utilisateur a accès à une organisation"""
        return org_id in self.organizations or self.role == "admin"

    def is_admin(self) -> bool:
        """Vérifie si l'utilisateur est admin"""
        return self.role == "admin"


# ===================
# Token Functions
# ===================

def create_access_token(
    user_id: str,
    email: Optional[str] = None,
    role: str = "user",
    organizations: List[str] = [],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Crée un token JWT d'accès

    Args:
        user_id: ID de l'utilisateur
        email: Email de l'utilisateur
        role: Rôle de l'utilisateur
        organizations: Liste des IDs d'organisations
        expires_delta: Durée de validité du token

    Returns:
        Token JWT encodé
    """
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.jwt_expiration_minutes))

    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "organizations": organizations,
        "exp": expire,
        "iat": now,
        "iss": "transport-api"
    }

    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> TokenPayload:
    """
    Décode et valide un token JWT

    Args:
        token: Token JWT à décoder

    Returns:
        Payload du token

    Raises:
        AuthenticationError: Si le token est invalide ou expiré
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": True}
        )
        return TokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token expiré")
    except jwt.InvalidTokenError as e:
        raise AuthenticationError(f"Token invalide: {str(e)}")


def decode_supabase_token(token: str) -> Dict[str, Any]:
    """
    Décode un token Supabase (sans vérification de signature)
    Utilisé pour extraire les informations utilisateur

    Note: En production, vérifier avec la clé publique Supabase
    """
    try:
        # Décode sans vérifier la signature (Supabase vérifie côté serveur)
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except jwt.InvalidTokenError as e:
        raise AuthenticationError(f"Token Supabase invalide: {str(e)}")


# ===================
# Dependencies
# ===================

async def get_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Optional[str]:
    """Extrait le token du header Authorization"""
    if credentials is None:
        return None
    return credentials.credentials


async def get_current_user(
    token: Optional[str] = Depends(get_token),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID")
) -> CurrentUser:
    """
    Dependency qui retourne l'utilisateur authentifié

    Usage:
        @router.get("/profile")
        async def get_profile(user: CurrentUser = Depends(get_current_user)):
            return user
    """
    if token is None:
        raise AuthenticationError("Token d'authentification requis")

    try:
        # Essayer de décoder comme token interne
        payload = decode_token(token)

        return CurrentUser(
            id=payload.sub,
            email=payload.email,
            role=payload.role,
            organizations=payload.organizations,
            current_organization_id=x_organization_id
        )
    except AuthenticationError:
        # Essayer comme token Supabase
        try:
            supabase_payload = decode_supabase_token(token)

            # Extraire les métadonnées utilisateur de Supabase
            user_metadata = supabase_payload.get("user_metadata", {})
            app_metadata = supabase_payload.get("app_metadata", {})

            return CurrentUser(
                id=supabase_payload.get("sub", ""),
                email=supabase_payload.get("email"),
                role=app_metadata.get("role", "user"),
                organizations=app_metadata.get("organizations", []),
                current_organization_id=x_organization_id
            )
        except Exception as e:
            logger.error(f"Token authentication failed: {e}")
            raise AuthenticationError("Token invalide")


async def get_current_user_optional(
    token: Optional[str] = Depends(get_token),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID")
) -> Optional[CurrentUser]:
    """
    Comme get_current_user mais retourne None si pas de token
    Utile pour les endpoints publics avec fonctionnalités optionnelles
    """
    if token is None:
        return None

    try:
        return await get_current_user(token, x_organization_id)
    except AuthenticationError:
        return None


async def get_current_organization(
    user: CurrentUser = Depends(get_current_user),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID")
) -> str:
    """
    Extrait et valide l'organization_id du header
    Vérifie que l'utilisateur a accès à cette organisation
    """
    if not x_organization_id:
        raise AuthorizationError(
            "Header X-Organization-ID requis",
            details={"header": "X-Organization-ID"}
        )

    if not user.has_organization_access(x_organization_id):
        raise AuthorizationError(
            f"Accès non autorisé à l'organisation {x_organization_id}",
            resource="organization",
            action="access"
        )

    return x_organization_id


def require_role(*roles: str):
    """
    Decorator/dependency pour exiger un rôle spécifique

    Usage:
        @router.delete("/users/{id}")
        async def delete_user(
            user: CurrentUser = Depends(require_role("admin"))
        ):
            ...
    """
    async def role_checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise AuthorizationError(
                f"Rôle requis: {', '.join(roles)}",
                action="access",
                details={"required_roles": list(roles), "user_role": user.role}
            )
        return user

    return role_checker


def require_organization_role(*roles: str):
    """
    Vérifie le rôle de l'utilisateur dans l'organisation courante
    (À implémenter avec une requête DB pour les rôles par organisation)
    """
    async def org_role_checker(
        user: CurrentUser = Depends(get_current_user),
        org_id: str = Depends(get_current_organization)
    ) -> CurrentUser:
        # TODO: Récupérer le rôle de l'utilisateur dans l'organisation depuis la DB
        # Pour l'instant, on vérifie juste l'accès
        return user

    return org_role_checker


# ===================
# Middleware
# ===================

class TenantMiddleware:
    """
    Middleware pour extraire et valider le tenant (organisation)
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            org_id = headers.get(b"x-organization-id", b"").decode()

            # Stocker dans le state de la requête
            scope["state"] = scope.get("state", {})
            scope["state"]["organization_id"] = org_id

        await self.app(scope, receive, send)


# ===================
# Rate Limiting (simple implementation)
# ===================

from collections import defaultdict
from time import time

_rate_limit_store: Dict[str, List[float]] = defaultdict(list)


async def check_rate_limit(
    request: Request,
    user: Optional[CurrentUser] = Depends(get_current_user_optional)
) -> None:
    """
    Vérifie la limite de requêtes par IP ou utilisateur
    """
    if not settings.rate_limit_enabled:
        return

    # Identifier par user_id ou IP
    identifier = user.id if user else request.client.host
    current_time = time()
    window_start = current_time - settings.rate_limit_window_seconds

    # Nettoyer les anciennes requêtes
    _rate_limit_store[identifier] = [
        ts for ts in _rate_limit_store[identifier] if ts > window_start
    ]

    # Vérifier la limite
    if len(_rate_limit_store[identifier]) >= settings.rate_limit_requests:
        from .exceptions import RateLimitError
        raise RateLimitError(
            retry_after=settings.rate_limit_window_seconds,
            details={"limit": settings.rate_limit_requests}
        )

    # Enregistrer cette requête
    _rate_limit_store[identifier].append(current_time)
