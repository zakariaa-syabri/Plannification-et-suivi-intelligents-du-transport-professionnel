"""
Endpoints pour la gestion des passagers (étudiants)
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel
import psycopg2
from api.config import settings
from api.services.optimization import optimize_school_bus_route
from geopy.geocoders import Nominatim
import time

router = APIRouter()


class PassagerCreate(BaseModel):
    """Modèle pour la création d'un passager"""
    nom: str
    prenom: str
    email: Optional[str] = None
    telephone: Optional[str] = None
    adresse_complete: str
    ville: str
    code_postal: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_naissance: Optional[str] = None
    ecole_id: Optional[str] = None


class PassagerUpdate(BaseModel):
    """Modèle pour la mise à jour d'un passager"""
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    adresse_complete: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_naissance: Optional[str] = None
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


def geocode_address(adresse: str, ville: str) -> tuple:
    """
    Géocode une adresse pour obtenir latitude et longitude

    Args:
        adresse: Adresse complète
        ville: Ville

    Returns:
        Tuple (latitude, longitude) ou (None, None) si échec
    """
    try:
        geolocator = Nominatim(user_agent="transport_app", timeout=5)
        location = geolocator.geocode(f"{adresse}, {ville}, France")

        if location:
            return (location.latitude, location.longitude)
        else:
            # Essayer juste avec la ville si l'adresse complète ne fonctionne pas
            location = geolocator.geocode(f"{ville}, France")
            if location:
                return (location.latitude, location.longitude)

        return (None, None)
    except Exception as e:
        print(f"Erreur de géocodage: {e}")
        return (None, None)


@router.get("/api/passagers", response_model=List[Dict])
async def get_passagers(ecole_id: Optional[str] = None):
    """
    Récupère la liste des passagers (étudiants)

    Args:
        ecole_id: Filtrer par école (optionnel)

    Returns:
        Liste des passagers
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if ecole_id:
            cur.execute("""
                SELECT p.id, p.nom, p.prenom, p.email, p.telephone,
                       p.adresse_complete, p.latitude, p.longitude, p.ville,
                       p.ecole_id, e.nom as ecole_nom
                FROM public.passagers p
                LEFT JOIN public.ecoles e ON p.ecole_id = e.id
                WHERE p.ecole_id = %s
                ORDER BY p.nom, p.prenom
            """, (ecole_id,))
        else:
            cur.execute("""
                SELECT p.id, p.nom, p.prenom, p.email, p.telephone,
                       p.adresse_complete, p.latitude, p.longitude, p.ville,
                       p.ecole_id, e.nom as ecole_nom
                FROM public.passagers p
                LEFT JOIN public.ecoles e ON p.ecole_id = e.id
                ORDER BY p.nom, p.prenom
            """)

        passagers = []
        for row in cur.fetchall():
            passagers.append({
                "id": str(row[0]),
                "nom": row[1],
                "prenom": row[2],
                "email": row[3],
                "telephone": row[4],
                "adresse_complete": row[5],
                "latitude": float(row[6]) if row[6] else None,
                "longitude": float(row[7]) if row[7] else None,
                "ville": row[8],
                "ecole_id": str(row[9]) if row[9] else None,
                "ecole_nom": row[10] if row[10] else None
            })

        cur.close()
        conn.close()

        return passagers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des passagers: {str(e)}")


@router.post("/api/passagers", response_model=Dict)
async def create_passager(passager: PassagerCreate):
    """
    Crée un nouveau passager

    Args:
        passager: Données du passager à créer

    Returns:
        Passager créé avec son ID
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Géocoder l'adresse si latitude/longitude ne sont pas fournis
        latitude = passager.latitude
        longitude = passager.longitude

        if (latitude is None or longitude is None) and passager.adresse_complete and passager.ville:
            lat, lon = geocode_address(passager.adresse_complete, passager.ville)
            if lat and lon:
                latitude = lat
                longitude = lon
                time.sleep(1)  # Rate limiting pour Nominatim

        cur.execute("""
            INSERT INTO public.passagers (
                nom, prenom, email, telephone, adresse_complete, ville,
                code_postal, latitude, longitude, date_naissance, ecole_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nom, prenom, email, telephone, adresse_complete,
                      ville, code_postal, latitude, longitude, date_naissance, ecole_id
        """, (
            passager.nom, passager.prenom, passager.email, passager.telephone,
            passager.adresse_complete, passager.ville, passager.code_postal,
            latitude, longitude, passager.date_naissance,
            passager.ecole_id
        ))

        row = cur.fetchone()
        conn.commit()

        result = {
            "id": str(row[0]),
            "nom": row[1],
            "prenom": row[2],
            "email": row[3],
            "telephone": row[4],
            "adresse_complete": row[5],
            "ville": row[6],
            "code_postal": row[7],
            "latitude": float(row[8]) if row[8] else None,
            "longitude": float(row[9]) if row[9] else None,
            "date_naissance": row[10],
            "ecole_id": str(row[11]) if row[11] else None
        }

        cur.close()
        conn.close()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du passager: {str(e)}")


@router.put("/api/passagers/{passager_id}", response_model=Dict)
async def update_passager(passager_id: str, passager: PassagerUpdate):
    """
    Met à jour un passager

    Args:
        passager_id: ID du passager
        passager: Données à mettre à jour

    Returns:
        Passager mis à jour
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        update_fields = []
        values = []

        if passager.nom is not None:
            update_fields.append("nom = %s")
            values.append(passager.nom)
        if passager.prenom is not None:
            update_fields.append("prenom = %s")
            values.append(passager.prenom)
        if passager.email is not None:
            update_fields.append("email = %s")
            values.append(passager.email)
        if passager.telephone is not None:
            update_fields.append("telephone = %s")
            values.append(passager.telephone)
        if passager.adresse_complete is not None:
            update_fields.append("adresse_complete = %s")
            values.append(passager.adresse_complete)
        if passager.ville is not None:
            update_fields.append("ville = %s")
            values.append(passager.ville)
        if passager.code_postal is not None:
            update_fields.append("code_postal = %s")
            values.append(passager.code_postal)
        if passager.latitude is not None:
            update_fields.append("latitude = %s")
            values.append(passager.latitude)
        if passager.longitude is not None:
            update_fields.append("longitude = %s")
            values.append(passager.longitude)
        if passager.date_naissance is not None:
            update_fields.append("date_naissance = %s")
            values.append(passager.date_naissance)
        if passager.ecole_id is not None:
            update_fields.append("ecole_id = %s")
            values.append(passager.ecole_id)

        if not update_fields:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

        values.append(passager_id)

        query = f"""
            UPDATE public.passagers
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, nom, prenom, email, telephone, adresse_complete,
                      ville, code_postal, latitude, longitude, date_naissance, ecole_id
        """

        cur.execute(query, values)
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Passager non trouvé")

        conn.commit()

        result = {
            "id": str(row[0]),
            "nom": row[1],
            "prenom": row[2],
            "email": row[3],
            "telephone": row[4],
            "adresse_complete": row[5],
            "ville": row[6],
            "code_postal": row[7],
            "latitude": float(row[8]) if row[8] else None,
            "longitude": float(row[9]) if row[9] else None,
            "date_naissance": row[10],
            "ecole_id": str(row[11]) if row[11] else None
        }

        cur.close()
        conn.close()

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour du passager: {str(e)}")


@router.delete("/api/passagers/{passager_id}")
async def delete_passager(passager_id: str):
    """
    Supprime un passager

    Args:
        passager_id: ID du passager à supprimer

    Returns:
        Message de confirmation
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("DELETE FROM public.passagers WHERE id = %s RETURNING id", (passager_id,))
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Passager non trouvé")

        conn.commit()
        cur.close()
        conn.close()

        return {"message": "Passager supprimé avec succès", "id": str(row[0])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du passager: {str(e)}")


@router.get("/api/passagers/disponibles/{tournee_id}", response_model=List[Dict])
async def get_passagers_disponibles(tournee_id: str):
    """
    Récupère les passagers non encore inscrits à une tournée

    Args:
        tournee_id: ID de la tournée

    Returns:
        Liste des passagers disponibles
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Récupérer les passagers qui ne sont pas déjà inscrits à cette tournée
        cur.execute("""
            SELECT p.id, p.nom, p.prenom, p.email, p.adresse_complete,
                   p.latitude, p.longitude, p.ville, e.nom as ecole_nom
            FROM public.passagers p
            LEFT JOIN public.ecoles e ON p.ecole_id = e.id
            WHERE p.id NOT IN (
                SELECT a.passager_id
                FROM public.arrets a
                WHERE a.tournee_id = %s AND a.passager_id IS NOT NULL
            )
            ORDER BY p.nom, p.prenom
        """, (tournee_id,))

        passagers = []
        for row in cur.fetchall():
            passagers.append({
                "id": str(row[0]),
                "nom": row[1],
                "prenom": row[2],
                "email": row[3],
                "adresse_complete": row[4],
                "latitude": float(row[5]) if row[5] else None,
                "longitude": float(row[6]) if row[6] else None,
                "ville": row[7],
                "ecole_nom": row[8] if row[8] else None
            })

        cur.close()
        conn.close()

        return passagers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


class AffectationPassagers(BaseModel):
    """Modèle pour affecter des passagers à une tournée"""
    passager_ids: List[str]
    type_arret: str = "ramassage"  # ramassage ou depose


@router.post("/api/tournees/{tournee_id}/affecter-passagers")
async def affecter_passagers(tournee_id: str, affectation: AffectationPassagers):
    """
    Affecte des passagers à une tournée et crée les arrêts

    Args:
        tournee_id: ID de la tournée
        affectation: IDs des passagers à affecter

    Returns:
        Résumé de l'affectation
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Vérifier que la tournée existe
        cur.execute("SELECT id FROM public.tournees WHERE id = %s", (tournee_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Tournée non trouvée")

        # Récupérer le dernier ordre de séquence
        cur.execute("""
            SELECT COALESCE(MAX(ordre_sequence), 0)
            FROM public.arrets
            WHERE tournee_id = %s
        """, (tournee_id,))
        dernier_ordre = cur.fetchone()[0]

        arrets_crees = []
        ordre = dernier_ordre + 1

        for passager_id in affectation.passager_ids:
            # Récupérer les infos du passager
            cur.execute("""
                SELECT nom, prenom, adresse_complete, latitude, longitude, ville
                FROM public.passagers
                WHERE id = %s
            """, (passager_id,))

            passager = cur.fetchone()
            if not passager:
                continue

            nom, prenom, adresse, lat, lon, ville = passager

            # Géocoder si pas de coordonnées
            if lat is None or lon is None:
                if adresse and ville:
                    lat, lon = geocode_address(adresse, ville)
                    # Mettre à jour le passager avec les coordonnées
                    if lat and lon:
                        cur.execute("""
                            UPDATE public.passagers
                            SET latitude = %s, longitude = %s
                            WHERE id = %s
                        """, (lat, lon, passager_id))
                        time.sleep(1)  # Rate limiting

            # Si toujours pas de coordonnées, sauter ce passager
            if lat is None or lon is None:
                continue

            # Créer l'arrêt
            cur.execute("""
                INSERT INTO public.arrets (
                    tournee_id, passager_id, ordre_sequence, adresse,
                    latitude, longitude, type_arret, statut, heure_prevue
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'planifie', '08:00')
                RETURNING id
            """, (
                tournee_id, passager_id, ordre, adresse,
                lat, lon, affectation.type_arret
            ))

            arret_id = cur.fetchone()[0]
            arrets_crees.append({
                "id": str(arret_id),
                "passager": f"{prenom} {nom}",
                "adresse": adresse,
                "ordre": ordre
            })
            ordre += 1

        # Mettre à jour le nombre de passagers de la tournée
        cur.execute("""
            UPDATE public.tournees
            SET nombre_passagers = (
                SELECT COUNT(DISTINCT passager_id)
                FROM public.arrets
                WHERE tournee_id = %s AND passager_id IS NOT NULL
            )
            WHERE id = %s
        """, (tournee_id, tournee_id))

        conn.commit()
        cur.close()
        conn.close()

        return {
            "message": f"{len(arrets_crees)} passager(s) affecté(s) à la tournée",
            "arrets_crees": arrets_crees
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'affectation: {str(e)}")


@router.delete("/api/tournees/{tournee_id}/retirer-passager/{passager_id}")
async def retirer_passager(tournee_id: str, passager_id: str):
    """
    Retire un passager d'une tournée

    Args:
        tournee_id: ID de la tournée
        passager_id: ID du passager à retirer

    Returns:
        Message de confirmation
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Supprimer l'arrêt
        cur.execute("""
            DELETE FROM public.arrets
            WHERE tournee_id = %s AND passager_id = %s
            RETURNING id
        """, (tournee_id, passager_id))

        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Passager non trouvé dans cette tournée")

        # Réorganiser les ordres de séquence
        cur.execute("""
            WITH numbered AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY ordre_sequence) as new_order
                FROM public.arrets
                WHERE tournee_id = %s
            )
            UPDATE public.arrets a
            SET ordre_sequence = n.new_order
            FROM numbered n
            WHERE a.id = n.id
        """, (tournee_id,))

        # Mettre à jour le nombre de passagers
        cur.execute("""
            UPDATE public.tournees
            SET nombre_passagers = (
                SELECT COUNT(DISTINCT passager_id)
                FROM public.arrets
                WHERE tournee_id = %s AND passager_id IS NOT NULL
            )
            WHERE id = %s
        """, (tournee_id, tournee_id))

        conn.commit()
        cur.close()
        conn.close()

        return {"message": "Passager retiré avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/api/tournees/{tournee_id}/optimiser-itineraire")
async def optimiser_itineraire(tournee_id: str):
    """
    Optimise l'itinéraire de la tournée (ordre des arrêts)
    Utilise l'algorithme VRP/VRPTW de Google OR-Tools avec calcul d'ETA

    Args:
        tournee_id: ID de la tournée

    Returns:
        Itinéraire optimisé avec ETA pour chaque arrêt
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Récupérer la tournée avec son heure de départ
        cur.execute("""
            SELECT t.heure_depart, t.heure_arrivee_estimee
            FROM public.tournees t
            WHERE t.id = %s
        """, (tournee_id,))

        tournee_info = cur.fetchone()
        if not tournee_info:
            raise HTTPException(status_code=404, detail="Tournée non trouvée")

        # Convertir time objects en strings
        heure_depart_obj = tournee_info[0]
        heure_arrivee_obj = tournee_info[1]

        if heure_depart_obj:
            if isinstance(heure_depart_obj, str):
                heure_depart = heure_depart_obj
            else:
                heure_depart = heure_depart_obj.strftime('%H:%M')
        else:
            heure_depart = "07:00"

        if heure_arrivee_obj:
            if isinstance(heure_arrivee_obj, str):
                heure_arrivee = heure_arrivee_obj
            else:
                heure_arrivee = heure_arrivee_obj.strftime('%H:%M')
        else:
            heure_arrivee = "08:30"

        # Récupérer tous les arrêts avec leurs coordonnées
        cur.execute("""
            SELECT a.id, a.latitude, a.longitude, a.adresse
            FROM public.arrets a
            WHERE a.tournee_id = %s AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
            ORDER BY a.ordre_sequence
        """, (tournee_id,))

        arrets = cur.fetchall()

        if len(arrets) < 2:
            cur.close()
            conn.close()
            return {
                "message": "Pas assez d'arrêts pour optimiser (minimum 2 requis)",
                "arrets_optimises": [],
                "success": False
            }

        # Préparer les données pour l'optimisation
        stops = [
            {
                "id": str(row[0]),
                "latitude": float(row[1]),
                "longitude": float(row[2]),
                "adresse": row[3]
            }
            for row in arrets
        ]

        # Utiliser le premier arrêt comme dépôt (point de départ)
        depot_location = (stops[0]['latitude'], stops[0]['longitude'])

        # Optimiser avec VRP/VRPTW
        result = optimize_school_bus_route(
            stops=stops,
            depot_location=depot_location,
            start_time=heure_depart,
            school_arrival_time=heure_arrivee,
            average_speed_kmh=30.0
        )

        if not result['success']:
            cur.close()
            conn.close()
            return {
                "message": result.get('message', 'Erreur lors de l\'optimisation'),
                "success": False
            }

        # Mettre à jour l'ordre et les ETA dans la base de données
        route = result['route']
        for i, stop_info in enumerate(route):
            if stop_info.get('stop_id'):
                cur.execute("""
                    UPDATE public.arrets
                    SET ordre_sequence = %s,
                        heure_prevue = %s
                    WHERE id = %s
                """, (i + 1, stop_info['arrival_time'], stop_info['stop_id']))

        # Mettre à jour les statistiques de la tournée
        stats = result['statistics']

        # Mettre à jour toutes les statistiques en une seule requête
        cur.execute("""
            UPDATE public.tournees
            SET distance_km = %s,
                nombre_arrets = (
                    SELECT COUNT(*)
                    FROM public.arrets
                    WHERE tournee_id = %s
                ),
                progression_pourcent = 0
            WHERE id = %s
        """, (
            stats['total_distance_km'],
            tournee_id,
            tournee_id
        ))

        conn.commit()
        cur.close()
        conn.close()

        return {
            "success": True,
            "message": f"Itinéraire optimisé avec succès (VRP/VRPTW)",
            "algorithm": "Google OR-Tools VRP/VRPTW",
            "arrets_optimises": [
                {
                    "ordre": i + 1,
                    "adresse": stop.get('adresse', ''),
                    "eta": stop['arrival_time'],
                    "distance_cumulee_km": stop['cumulative_distance_km'],
                    "temps_cumule_min": stop['cumulative_time_minutes']
                }
                for i, stop in enumerate(route)
            ],
            "statistics": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'optimisation: {str(e)}")
