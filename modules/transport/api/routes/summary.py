"""
Endpoint de résumé pour le tableau de bord
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, List
from datetime import datetime, date
import psycopg2
from api.config import settings

router = APIRouter()


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


@router.get("/summary", response_model=Dict)
async def get_summary():
    """
    Retourne un résumé des données pour le tableau de bord admin

    Returns:
        Dict contenant les statistiques principales
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        today = date.today()

        # Statistiques des tournées
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE statut = 'en_cours') as tournees_actives,
                COUNT(*) FILTER (WHERE statut = 'planifiee') as tournees_planifiees,
                COUNT(*) FILTER (WHERE statut = 'terminee' AND COALESCE(date, date_tournee) = %s) as tournees_terminees_aujourdhui
            FROM public.tournees
        """, (today,))
        tournee_stats = cur.fetchone()

        # Statistiques des passagers
        cur.execute("SELECT COUNT(*) FROM public.passagers")
        total_passagers = cur.fetchone()[0] or 0

        # Statistiques des bus
        cur.execute("""
            SELECT
                COUNT(*) as total_bus,
                COUNT(*) FILTER (WHERE statut = 'en_service') as bus_en_service,
                COUNT(*) FILTER (WHERE statut = 'disponible') as bus_disponibles,
                COUNT(*) FILTER (WHERE statut = 'maintenance') as bus_maintenance
            FROM public.bus
        """)
        bus_stats = cur.fetchone()

        # Tournées du jour
        cur.execute("""
            SELECT t.id, COALESCE(t.nom, t.nom_tournee) as nom, t.heure_depart, t.statut,
                   t.nombre_passagers, b.numero_bus
            FROM public.tournees t
            LEFT JOIN public.bus b ON t.bus_id = b.id
            WHERE COALESCE(t.date, t.date_tournee) = %s
            ORDER BY t.heure_depart ASC
            LIMIT 10
        """, (today,))
        tournees_jour = []
        for row in cur.fetchall():
            tournees_jour.append({
                "id": str(row[0]),
                "nom": row[1],
                "heure_depart": str(row[2]) if row[2] else None,
                "statut": row[3],
                "nombre_passagers": row[4] or 0,
                "bus": row[5] or "N/A"
            })

        # Performances (moyennes sur les tournées terminées)
        cur.execute("""
            SELECT
                AVG(CASE WHEN heure_arrivee_reelle <= heure_arrivee_estimee THEN 100 ELSE 0 END) as taux_ponctualite,
                AVG(COALESCE(distance_km, distance_totale_km, 0)) as distance_moyenne,
                AVG(EXTRACT(EPOCH FROM (heure_arrivee_reelle - heure_depart))/60) as duree_moyenne,
                AVG(CASE WHEN nombre_passagers > 0 THEN (nombre_passagers * 100.0 / NULLIF(capacite_max, 0)) ELSE 0 END) as taux_occupation
            FROM public.tournees t
            LEFT JOIN public.bus b ON t.bus_id = b.id
            WHERE t.statut = 'terminee'
        """)
        perf_stats = cur.fetchone()

        # Alertes (tournées en retard ou problèmes)
        cur.execute("""
            SELECT t.id, COALESCE(t.nom, t.nom_tournee) as nom, 'retard' as type_alerte,
                   'Tournée en retard' as message
            FROM public.tournees t
            WHERE t.statut = 'en_cours'
            AND t.heure_arrivee_estimee < CURRENT_TIME
            AND COALESCE(t.date, t.date_tournee) = %s
            LIMIT 5
        """, (today,))
        alertes = []
        for row in cur.fetchall():
            alertes.append({
                "tournee_id": str(row[0]),
                "tournee_nom": row[1],
                "type": row[2],
                "message": row[3]
            })

        cur.close()
        conn.close()

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "statistiques": {
                "tournees_actives": tournee_stats[0] or 0,
                "tournees_planifiees": tournee_stats[1] or 0,
                "tournees_terminees_aujourdhui": tournee_stats[2] or 0,
                "total_passagers": total_passagers,
                "total_bus": bus_stats[0] or 0,
                "bus_en_service": bus_stats[1] or 0,
                "bus_disponibles": bus_stats[2] or 0,
                "bus_maintenance": bus_stats[3] or 0
            },
            "alertes": alertes,
            "tournees_du_jour": tournees_jour,
            "performances": {
                "taux_ponctualite": round(perf_stats[0] or 0, 1),
                "distance_moyenne_km": round(perf_stats[1] or 0, 1),
                "duree_moyenne_minutes": round(perf_stats[2] or 0, 1),
                "taux_occupation": round(perf_stats[3] or 0, 1)
            }
        }

    except Exception as e:
        print(f"Erreur lors de la récupération du résumé: {str(e)}")
        # Retourner des valeurs par défaut en cas d'erreur
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "statistiques": {
                "tournees_actives": 0,
                "tournees_planifiees": 0,
                "tournees_terminees_aujourdhui": 0,
                "total_passagers": 0,
                "total_bus": 0,
                "bus_en_service": 0,
                "bus_disponibles": 0,
                "bus_maintenance": 0
            },
            "alertes": [],
            "tournees_du_jour": [],
            "performances": {
                "taux_ponctualite": 0,
                "distance_moyenne_km": 0,
                "duree_moyenne_minutes": 0,
                "taux_occupation": 0
            },
            "error": str(e)
        }


@router.get("/summary/tournees", response_model=Dict)
async def get_tournees_summary():
    """
    Retourne un résumé détaillé des tournées

    Returns:
        Dict contenant la liste des tournées avec leurs détails
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Récupérer toutes les tournées avec leurs informations de bus
        cur.execute("""
            SELECT t.id,
                   COALESCE(t.nom, t.nom_tournee) as nom,
                   COALESCE(t.date, t.date_tournee) as date,
                   t.heure_depart,
                   t.heure_arrivee_estimee,
                   t.statut,
                   t.nombre_passagers,
                   COALESCE(t.distance_km, t.distance_totale_km, 0) as distance_km,
                   b.id as bus_id,
                   b.numero_bus,
                   b.immatriculation,
                   COALESCE(t.nombre_arrets, COUNT(a.id), 0) as nombre_arrets,
                   COALESCE(t.progression_pourcent, 0) as progression_pourcent
            FROM public.tournees t
            LEFT JOIN public.bus b ON t.bus_id = b.id
            LEFT JOIN public.arrets a ON t.id = a.tournee_id
            GROUP BY t.id, t.nom, t.nom_tournee, t.date, t.date_tournee,
                     t.heure_depart, t.heure_arrivee_estimee, t.statut,
                     t.nombre_passagers, t.distance_km, t.distance_totale_km,
                     t.nombre_arrets, t.progression_pourcent,
                     b.id, b.numero_bus, b.immatriculation
            ORDER BY COALESCE(t.date, t.date_tournee) DESC, t.heure_depart ASC
        """)

        tournees = []
        for row in cur.fetchall():
            tournees.append({
                "id": str(row[0]),
                "nom": row[1],
                "date": str(row[2]),
                "heure_depart": str(row[3]),
                "heure_arrivee_estimee": str(row[4]),
                "statut": row[5],
                "nombre_passagers": row[6],
                "distance_km": float(row[7]) if row[7] else 0,
                "bus": {
                    "id": str(row[8]) if row[8] else "",
                    "numero": row[9] if row[9] else "N/A",
                    "immatriculation": row[10] if row[10] else "N/A"
                },
                "nombre_arrets": row[11],
                "progression_pourcent": row[12]
            })

        cur.close()
        conn.close()

        return {
            "total": len(tournees),
            "tournees": tournees
        }
    except Exception as e:
        # En cas d'erreur, retourner une liste vide plutôt qu'une erreur
        print(f"Erreur lors de la récupération des tournées: {str(e)}")
        return {
            "total": 0,
            "tournees": []
        }
