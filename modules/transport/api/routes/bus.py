"""
Endpoints pour la gestion des bus
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel
import psycopg2
from api.config import settings

router = APIRouter()


class BusCreate(BaseModel):
    """Modèle pour la création d'un bus"""
    numero_bus: str
    immatriculation: str
    capacite: int
    type_bus: Optional[str] = None
    statut: Optional[str] = "disponible"
    ecole_id: Optional[str] = None


class BusUpdate(BaseModel):
    """Modèle pour la mise à jour d'un bus"""
    numero_bus: Optional[str] = None
    immatriculation: Optional[str] = None
    capacite: Optional[int] = None
    type_bus: Optional[str] = None
    statut: Optional[str] = None
    ecole_id: Optional[str] = None


def get_db_connection():
    """Créer une connexion à la base de données"""
    try:
        conn = psycopg2.connect(
            host=settings.database_host,
            port=settings.database_port,
            dbname=settings.database_name,
            user=settings.database_user,
            password=settings.database_password
        )
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de connexion à la base de données: {str(e)}")


@router.get("/api/bus", response_model=List[Dict])
async def get_buses():
    """
    Récupère la liste de tous les bus

    Returns:
        Liste des bus avec leurs informations
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, numero_bus, immatriculation, capacite, type_bus, statut, ecole_id
            FROM public.bus
            ORDER BY numero_bus
        """)

        buses = []
        for row in cur.fetchall():
            buses.append({
                "id": str(row[0]),
                "numero_bus": row[1],
                "immatriculation": row[2],
                "capacite": row[3],
                "type_bus": row[4],
                "statut": row[5],
                "ecole_id": str(row[6]) if row[6] else None
            })

        cur.close()
        conn.close()

        return buses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des bus: {str(e)}")


@router.get("/api/bus/{bus_id}", response_model=Dict)
async def get_bus(bus_id: str):
    """
    Récupère les détails d'un bus spécifique

    Args:
        bus_id: ID du bus

    Returns:
        Informations détaillées du bus
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, numero_bus, immatriculation, capacite, type_bus, statut, ecole_id
            FROM public.bus
            WHERE id = %s
        """, (bus_id,))

        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Bus non trouvé")

        bus = {
            "id": str(row[0]),
            "numero_bus": row[1],
            "immatriculation": row[2],
            "capacite": row[3],
            "type_bus": row[4],
            "statut": row[5],
            "ecole_id": str(row[6]) if row[6] else None
        }

        cur.close()
        conn.close()

        return bus
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du bus: {str(e)}")


@router.post("/api/bus", response_model=Dict)
async def create_bus(bus: BusCreate):
    """
    Crée un nouveau bus

    Args:
        bus: Données du bus à créer

    Returns:
        Bus créé avec son ID
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO public.bus (
                numero_bus, immatriculation, capacite, type_bus, statut, ecole_id
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, numero_bus, immatriculation, capacite, type_bus, statut, ecole_id
        """, (
            bus.numero_bus, bus.immatriculation, bus.capacite,
            bus.type_bus, bus.statut, bus.ecole_id
        ))

        row = cur.fetchone()
        conn.commit()

        result = {
            "id": str(row[0]),
            "numero_bus": row[1],
            "immatriculation": row[2],
            "capacite": row[3],
            "type_bus": row[4],
            "statut": row[5],
            "ecole_id": str(row[6]) if row[6] else None
        }

        cur.close()
        conn.close()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du bus: {str(e)}")


@router.put("/api/bus/{bus_id}", response_model=Dict)
async def update_bus(bus_id: str, bus: BusUpdate):
    """
    Met à jour un bus

    Args:
        bus_id: ID du bus
        bus: Données à mettre à jour

    Returns:
        Bus mis à jour
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        update_fields = []
        values = []

        if bus.numero_bus is not None:
            update_fields.append("numero_bus = %s")
            values.append(bus.numero_bus)
        if bus.immatriculation is not None:
            update_fields.append("immatriculation = %s")
            values.append(bus.immatriculation)
        if bus.capacite is not None:
            update_fields.append("capacite = %s")
            values.append(bus.capacite)
        if bus.type_bus is not None:
            update_fields.append("type_bus = %s")
            values.append(bus.type_bus)
        if bus.statut is not None:
            update_fields.append("statut = %s")
            values.append(bus.statut)
        if bus.ecole_id is not None:
            update_fields.append("ecole_id = %s")
            values.append(bus.ecole_id)

        if not update_fields:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

        values.append(bus_id)

        query = f"""
            UPDATE public.bus
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, numero_bus, immatriculation, capacite, type_bus, statut, ecole_id
        """

        cur.execute(query, values)
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Bus non trouvé")

        conn.commit()

        result = {
            "id": str(row[0]),
            "numero_bus": row[1],
            "immatriculation": row[2],
            "capacite": row[3],
            "type_bus": row[4],
            "statut": row[5],
            "ecole_id": str(row[6]) if row[6] else None
        }

        cur.close()
        conn.close()

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour du bus: {str(e)}")


@router.delete("/api/bus/{bus_id}")
async def delete_bus(bus_id: str):
    """
    Supprime un bus

    Args:
        bus_id: ID du bus à supprimer

    Returns:
        Message de confirmation
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("DELETE FROM public.bus WHERE id = %s RETURNING id", (bus_id,))
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Bus non trouvé")

        conn.commit()
        cur.close()
        conn.close()

        return {"message": "Bus supprimé avec succès", "id": str(row[0])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du bus: {str(e)}")
