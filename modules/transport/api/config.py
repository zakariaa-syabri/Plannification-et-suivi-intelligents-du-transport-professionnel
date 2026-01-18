"""Configuration de l'API Transport"""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, computed_field
from typing import List, Any


def parse_cors_origins(v: Any) -> List[str]:
    """Parse CORS origins depuis CSV ou liste"""
    if isinstance(v, str):
        return [origin.strip() for origin in v.split(',') if origin.strip()]
    if isinstance(v, list):
        return v
    return ["http://localhost:3000"]


class Settings(BaseSettings):
    """Paramètres de configuration de l'application"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database - Use uppercase to match env var directly
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@postgres:5432/transport"
    )

    # Individual DB params for health checks - extracted from DATABASE_URL
    @property
    def database_url(self) -> str:
        """Alias for DATABASE_URL for backward compatibility"""
        return self.DATABASE_URL

    @property
    def database_host(self) -> str:
        """Extract host from DATABASE_URL"""
        try:
            # Parse URL like postgresql+asyncpg://user:pass@host:port/db
            url = self.DATABASE_URL
            # Remove driver prefix
            if "://" in url:
                url = url.split("://", 1)[1]
            # Get host from user:pass@host:port/db
            if "@" in url:
                url = url.split("@", 1)[1]
            # Get host from host:port/db
            host = url.split(":")[0] if ":" in url else url.split("/")[0]
            return host
        except Exception:
            return "postgres"

    @property
    def database_port(self) -> int:
        """Extract port from DATABASE_URL"""
        try:
            url = self.DATABASE_URL
            if "://" in url:
                url = url.split("://", 1)[1]
            if "@" in url:
                url = url.split("@", 1)[1]
            if ":" in url:
                port_part = url.split(":")[1].split("/")[0]
                return int(port_part)
        except Exception:
            pass
        return 5432

    @property
    def database_name(self) -> str:
        """Extract database name from DATABASE_URL"""
        try:
            url = self.DATABASE_URL
            if "/" in url:
                return url.rsplit("/", 1)[1].split("?")[0]
        except Exception:
            pass
        return "transport"

    @property
    def database_user(self) -> str:
        """Extract user from DATABASE_URL"""
        try:
            url = self.DATABASE_URL
            if "://" in url:
                url = url.split("://", 1)[1]
            if "@" in url:
                user_pass = url.split("@")[0]
                return user_pass.split(":")[0]
        except Exception:
            pass
        return "postgres"

    @property
    def database_password(self) -> str:
        """Extract password from DATABASE_URL"""
        try:
            url = self.DATABASE_URL
            if "://" in url:
                url = url.split("://", 1)[1]
            if "@" in url:
                user_pass = url.split("@")[0]
                if ":" in user_pass:
                    return user_pass.split(":")[1]
        except Exception:
            pass
        return "postgres"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    DEBUG: bool = Field(default=False)

    @property
    def debug(self) -> bool:
        """Alias for DEBUG"""
        return self.DEBUG

    # CORS
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:3001"
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from string"""
        return parse_cors_origins(self.CORS_ORIGINS)

    # MQTT
    MQTT_BROKER: str = Field(default="localhost")
    MQTT_PORT: int = Field(default=1883)
    mqtt_topic_prefix: str = "transport/"

    @property
    def mqtt_broker(self) -> str:
        return self.MQTT_BROKER

    @property
    def mqtt_port(self) -> int:
        return self.MQTT_PORT

    # Optimisation
    max_tournee_duration_minutes: int = 180
    max_bus_capacity: int = 50
    max_distance_km: int = 100


# Instance globale des settings
settings = Settings()
