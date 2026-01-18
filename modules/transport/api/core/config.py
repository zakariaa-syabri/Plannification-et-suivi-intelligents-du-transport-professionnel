"""
Configuration centralisée de l'API Transport
Utilise pydantic-settings pour une gestion sécurisée des variables d'environnement
"""

from functools import lru_cache
from typing import List, Optional, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


def parse_cors_origins(v: Any) -> List[str]:
    """Parse CORS origins depuis CSV ou liste"""
    if isinstance(v, str):
        return [origin.strip() for origin in v.split(',') if origin.strip()]
    if isinstance(v, list):
        return v
    return ["http://localhost:3000"]


class Settings(BaseSettings):
    """Configuration de l'application avec valeurs par défaut sécurisées"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # ===================
    # Database
    # ===================
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:54322/postgres",
        validation_alias="DATABASE_URL",
        description="URL de connexion à la base de données (async)"
    )
    database_pool_size: int = Field(default=20, ge=5, le=100)
    database_max_overflow: int = Field(default=10, ge=0, le=50)
    database_pool_timeout: int = Field(default=30, ge=10, le=120)
    database_echo: bool = Field(default=False, description="Log des requêtes SQL")

    # ===================
    # API Server
    # ===================
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"
    debug: bool = Field(default=False, description="Mode debug (False en production!)")

    # ===================
    # Security
    # ===================
    secret_key: str = Field(
        default="CHANGE-ME-IN-PRODUCTION-USE-SECURE-SECRET",
        min_length=32,
        description="Clé secrète pour JWT"
    )
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = Field(default=60, ge=15, le=1440)

    # API Keys pour services externes (optionnel)
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_service_role_key: Optional[str] = None

    # ===================
    # CORS - Use string to avoid parsing issues
    # ===================
    cors_origins_str: str = Field(
        default="http://localhost:3000",
        alias="CORS_ORIGINS",
        description="Origines autorisées pour CORS (séparées par virgule)"
    )
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    cors_allow_headers: List[str] = ["Authorization", "Content-Type", "X-Organization-ID"]

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from string"""
        return parse_cors_origins(self.cors_origins_str)

    # ===================
    # MQTT / Real-time
    # ===================
    mqtt_enabled: bool = True
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: Optional[str] = None
    mqtt_password: Optional[str] = None
    mqtt_topic_prefix: str = "transport/"
    mqtt_keepalive: int = 60

    # ===================
    # Optimization
    # ===================
    optimization_timeout_seconds: int = Field(default=30, ge=5, le=300)
    max_route_duration_minutes: int = Field(default=180, ge=30, le=480)
    max_vehicle_capacity: int = Field(default=50, ge=1, le=200)
    max_route_distance_km: int = Field(default=100, ge=10, le=500)
    default_service_time_minutes: int = Field(default=2, ge=1, le=15)
    default_speed_kmh: float = Field(default=30.0, ge=10.0, le=120.0)

    # ===================
    # Rate Limiting
    # ===================
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60

    # ===================
    # Logging
    # ===================
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


@lru_cache
def get_settings() -> Settings:
    """
    Retourne l'instance de configuration (singleton via cache)
    Utilise LRU cache pour éviter de recréer l'objet à chaque appel
    """
    return Settings()


# Instance globale pour import direct
settings = get_settings()
