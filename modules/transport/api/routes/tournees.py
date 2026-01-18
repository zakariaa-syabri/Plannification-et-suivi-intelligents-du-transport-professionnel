"""
Endpoints pour la gestion des tournées
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from datetime import datetime, date
from pydantic import BaseModel
import psycopg2
from api.config import settings

router = APIRouter()


class TourneeCreate(BaseModel):
    """Modèle pour la création d'une tournée"""
    nom_tournee: str
    bus_id: str
    date_tournee: str
    heure_depart: str
    heure_arrivee_estimee: str
    statut: str = "planifiee"
    nombre_passagers: int = 0


class TourneeUpdate(BaseModel):
    """Modèle pour la mise à jour d'une tournée"""
    nom_tournee: Optional[str] = None
    bus_id: Optional[str] = None
    date_tournee: Optional[str] = None
    heure_depart: Optional[str] = None
    heure_arrivee_estimee: Optional[str] = None
    statut: Optional[str] = None
    nombre_passagers: Optional[int] = None


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


@router.post("/api/tournees", response_model=Dict)
async def create_tournee(tournee: TourneeCreate):
    """
    Crée une nouvelle tournée

    Args:
        tournee: Données de la tournée à créer

    Returns:
        Tournée créée avec son ID
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO public.tournees (
                nom_tournee, bus_id, date_tournee, heure_depart,
                heure_arrivee_estimee, statut, nombre_passagers
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nom_tournee, bus_id, date_tournee, heure_depart,
                      heure_arrivee_estimee, statut, nombre_passagers, created_at
        """, (
            tournee.nom_tournee,
            tournee.bus_id,
            tournee.date_tournee,
            tournee.heure_depart,
            tournee.heure_arrivee_estimee,
            tournee.statut,
            tournee.nombre_passagers
        ))

        row = cur.fetchone()
        conn.commit()

        result = {
            "id": str(row[0]),
            "nom_tournee": row[1],
            "bus_id": str(row[2]),
            "date_tournee": str(row[3]),
            "heure_depart": str(row[4]),
            "heure_arrivee_estimee": str(row[5]),
            "statut": row[6],
            "nombre_passagers": row[7],
            "created_at": row[8].isoformat()
        }

        cur.close()
        conn.close()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la tournée: {str(e)}")


@router.get("/api/tournees", response_model=List[Dict])
async def get_tournees():
    """
    Récupère la liste de toutes les tournées

    Returns:
        Liste des tournées
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT t.id, t.nom_tournee, t.bus_id, t.date_tournee, t.heure_depart,
                   t.heure_arrivee_estimee, t.statut, t.nombre_passagers,
                   b.numero_bus, b.immatriculation
            FROM public.tournees t
            LEFT JOIN public.bus b ON t.bus_id = b.id
            ORDER BY t.date_tournee DESC, t.heure_depart ASC
        """)

        tournees = []
        for row in cur.fetchall():
            tournees.append({
                "id": str(row[0]),
                "nom_tournee": row[1],
                "bus_id": str(row[2]),
                "date_tournee": str(row[3]),
                "heure_depart": str(row[4]),
                "heure_arrivee_estimee": str(row[5]),
                "statut": row[6],
                "nombre_passagers": row[7],
                "bus": {
                    "numero_bus": row[8],
                    "immatriculation": row[9]
                }
            })

        cur.close()
        conn.close()

        return tournees
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des tournées: {str(e)}")


@router.get("/api/tournees/{tournee_id}", response_model=Dict)
async def get_tournee(tournee_id: str):
    """
    Récupère les détails d'une tournée spécifique avec ses arrêts

    Args:
        tournee_id: ID de la tournée

    Returns:
        Détails complets de la tournée
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Récupérer la tournée
        cur.execute("""
            SELECT t.id, t.nom_tournee, t.date_tournee, t.heure_depart,
                   t.heure_arrivee_estimee, t.statut, t.nombre_passagers,
                   t.distance_totale_km, t.duree_estimee_minutes,
                   b.numero_bus, b.immatriculation, b.capacite
            FROM public.tournees t
            LEFT JOIN public.bus b ON t.bus_id = b.id
            WHERE t.id = %s
        """, (tournee_id,))

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Tournée non trouvée")

        tournee = {
            "id": str(row[0]),
            "nom_tournee": row[1],
            "date_tournee": str(row[2]),
            "heure_depart": str(row[3]),
            "heure_arrivee_estimee": str(row[4]),
            "statut": row[5],
            "nombre_passagers": row[6],
            "distance_totale_km": float(row[7]) if row[7] else 0,
            "duree_estimee_minutes": row[8],
            "bus": {
                "numero_bus": row[9],
                "immatriculation": row[10],
                "capacite": row[11]
            },
            "arrets": []
        }

        # Récupérer les arrêts de la tournée
        cur.execute("""
            SELECT a.id, a.ordre_sequence, a.adresse, a.heure_prevue,
                   a.heure_reelle, a.type_arret, a.statut,
                   p.nom, p.prenom
            FROM public.arrets a
            LEFT JOIN public.passagers p ON a.passager_id = p.id
            WHERE a.tournee_id = %s
            ORDER BY a.ordre_sequence
        """, (tournee_id,))

        for arret_row in cur.fetchall():
            arret = {
                "id": str(arret_row[0]),
                "ordre_sequence": arret_row[1],
                "adresse": arret_row[2],
                "heure_prevue": str(arret_row[3]),
                "heure_reelle": str(arret_row[4]) if arret_row[4] else None,
                "type_arret": arret_row[5],
                "statut": arret_row[6]
            }
            if arret_row[7] and arret_row[8]:
                arret["passager"] = {
                    "nom": arret_row[7],
                    "prenom": arret_row[8]
                }
            tournee["arrets"].append(arret)

        cur.close()
        conn.close()

        return tournee
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la tournée: {str(e)}")


@router.put("/api/tournees/{tournee_id}", response_model=Dict)
async def update_tournee(tournee_id: str, tournee: TourneeUpdate):
    """
    Met à jour une tournée existante

    Args:
        tournee_id: ID de la tournée à modifier
        tournee: Données à mettre à jour

    Returns:
        Tournée mise à jour
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Construire la requête de mise à jour dynamiquement
        update_fields = []
        values = []

        if tournee.nom_tournee is not None:
            update_fields.append("nom_tournee = %s")
            values.append(tournee.nom_tournee)
        if tournee.bus_id is not None:
            update_fields.append("bus_id = %s")
            values.append(tournee.bus_id)
        if tournee.date_tournee is not None:
            update_fields.append("date_tournee = %s")
            values.append(tournee.date_tournee)
        if tournee.heure_depart is not None:
            update_fields.append("heure_depart = %s")
            values.append(tournee.heure_depart)
        if tournee.heure_arrivee_estimee is not None:
            update_fields.append("heure_arrivee_estimee = %s")
            values.append(tournee.heure_arrivee_estimee)
        if tournee.statut is not None:
            update_fields.append("statut = %s")
            values.append(tournee.statut)
        if tournee.nombre_passagers is not None:
            update_fields.append("nombre_passagers = %s")
            values.append(tournee.nombre_passagers)

        if not update_fields:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

        update_fields.append("updated_at = now()")
        values.append(tournee_id)

        query = f"""
            UPDATE public.tournees
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, nom_tournee, bus_id, date_tournee, heure_depart,
                      heure_arrivee_estimee, statut, nombre_passagers
        """

        cur.execute(query, values)
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Tournée non trouvée")

        conn.commit()

        result = {
            "id": str(row[0]),
            "nom_tournee": row[1],
            "bus_id": str(row[2]),
            "date_tournee": str(row[3]),
            "heure_depart": str(row[4]),
            "heure_arrivee_estimee": str(row[5]),
            "statut": row[6],
            "nombre_passagers": row[7]
        }

        cur.close()
        conn.close()

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour de la tournée: {str(e)}")


@router.delete("/api/tournees/{tournee_id}")
async def delete_tournee(tournee_id: str):
    """
    Supprime une tournée

    Args:
        tournee_id: ID de la tournée à supprimer

    Returns:
        Message de confirmation
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("DELETE FROM public.tournees WHERE id = %s RETURNING id", (tournee_id,))
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Tournée non trouvée")

        conn.commit()
        cur.close()
        conn.close()

        return {"message": "Tournée supprimée avec succès", "id": str(row[0])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression de la tournée: {str(e)}")
