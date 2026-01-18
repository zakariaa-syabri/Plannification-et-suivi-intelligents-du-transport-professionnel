"""
Exceptions personnalisées pour l'API Transport
Hiérarchie d'exceptions cohérente pour une gestion d'erreurs uniforme
"""

from typing import Optional, Dict, Any


class TransportException(Exception):
    """Exception de base pour toutes les erreurs de l'API Transport"""

    def __init__(
        self,
        message: str,
        code: str = "TRANSPORT_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convertit l'exception en dictionnaire pour la réponse API"""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details
            }
        }


class NotFoundError(TransportException):
    """Ressource non trouvée (404)"""

    def __init__(
        self,
        resource: str,
        identifier: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        message = f"{resource} non trouvé"
        if identifier:
            message = f"{resource} avec l'identifiant '{identifier}' non trouvé"

        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=404,
            details={"resource": resource, "identifier": identifier, **(details or {})}
        )


class ValidationError(TransportException):
    """Erreur de validation des données (400)"""

    def __init__(
        self,
        message: str = "Données invalides",
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if field:
            error_details["field"] = field

        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=400,
            details=error_details
        )


class AuthenticationError(TransportException):
    """Erreur d'authentification (401)"""

    def __init__(
        self,
        message: str = "Authentification requise",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            status_code=401,
            details=details
        )


class AuthorizationError(TransportException):
    """Erreur d'autorisation (403)"""

    def __init__(
        self,
        message: str = "Accès non autorisé",
        resource: Optional[str] = None,
        action: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if resource:
            error_details["resource"] = resource
        if action:
            error_details["action"] = action

        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            status_code=403,
            details=error_details
        )


class ConflictError(TransportException):
    """Conflit de données (409)"""

    def __init__(
        self,
        message: str = "Conflit de données",
        resource: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if resource:
            error_details["resource"] = resource

        super().__init__(
            message=message,
            code="CONFLICT_ERROR",
            status_code=409,
            details=error_details
        )


class RateLimitError(TransportException):
    """Limite de requêtes atteinte (429)"""

    def __init__(
        self,
        message: str = "Trop de requêtes, veuillez réessayer plus tard",
        retry_after: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if retry_after:
            error_details["retry_after_seconds"] = retry_after

        super().__init__(
            message=message,
            code="RATE_LIMIT_ERROR",
            status_code=429,
            details=error_details
        )


class DatabaseError(TransportException):
    """Erreur de base de données (500)"""

    def __init__(
        self,
        message: str = "Erreur de base de données",
        operation: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if operation:
            error_details["operation"] = operation

        super().__init__(
            message=message,
            code="DATABASE_ERROR",
            status_code=500,
            details=error_details
        )


class OptimizationError(TransportException):
    """Erreur lors de l'optimisation de routes"""

    def __init__(
        self,
        message: str = "Erreur lors de l'optimisation",
        reason: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if reason:
            error_details["reason"] = reason

        super().__init__(
            message=message,
            code="OPTIMIZATION_ERROR",
            status_code=422,
            details=error_details
        )


class ExternalServiceError(TransportException):
    """Erreur d'un service externe (502)"""

    def __init__(
        self,
        service: str,
        message: str = "Erreur du service externe",
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = {"service": service, **(details or {})}

        super().__init__(
            message=message,
            code="EXTERNAL_SERVICE_ERROR",
            status_code=502,
            details=error_details
        )
