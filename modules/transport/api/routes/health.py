"""
Endpoint de santé (health check) de l'API
"""
from fastapi import APIRouter
from datetime import datetime
from typing import Dict
import psycopg2
import paho.mqtt.client as mqtt
from api.config import settings

router = APIRouter()


def check_database_connection() -> tuple[bool, str]:
    """Vérifie la connexion à la base de données"""
    try:
        conn = psycopg2.connect(
            host=settings.database_host,
            port=settings.database_port,
            dbname=settings.database_name,
            user=settings.database_user,
            password=settings.database_password,
            connect_timeout=5
        )
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return True, "operational"
    except psycopg2.OperationalError as e:
        return False, f"connection_failed: {str(e)}"
    except Exception as e:
        return False, f"error: {str(e)}"


def check_mqtt_connection() -> tuple[bool, str]:
    """Vérifie la connexion au broker MQTT"""
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.connect(settings.mqtt_broker, settings.mqtt_port, keepalive=5)
        client.disconnect()
        return True, "operational"
    except ConnectionRefusedError:
        return False, "connection_refused"
    except Exception as e:
        return False, f"error: {str(e)}"


@router.get("/health", response_model=Dict)
async def health_check():
    """
    Vérification de l'état de santé de l'API

    Returns:
        Dict contenant le statut, la version et le timestamp
    """
    db_ok, db_status = check_database_connection()
    mqtt_ok, mqtt_status = check_mqtt_connection()

    overall_status = "healthy" if (db_ok and mqtt_ok) else "degraded"

    return {
        "status": overall_status,
        "service": "transport-api",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "api": "operational",
            "database": db_status,
            "mqtt": mqtt_status
        }
    }


@router.get("/health/ready", response_model=Dict)
async def readiness_check():
    """
    Vérification que l'API est prête à recevoir des requêtes

    Returns:
        Dict indiquant si tous les services sont prêts
    """
    db_ok, _ = check_database_connection()
    mqtt_ok, _ = check_mqtt_connection()

    return {
        "ready": db_ok and mqtt_ok,
        "checks": {
            "database": db_ok,
            "mqtt": mqtt_ok
        }
    }


@router.get("/health/live", response_model=Dict)
async def liveness_check():
    """
    Vérification que l'API est vivante (pour Kubernetes/Docker)

    Returns:
        Dict avec status alive
    """
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat()
    }
