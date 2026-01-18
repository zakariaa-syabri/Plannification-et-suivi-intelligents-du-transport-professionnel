"""
Endpoints pour la gestion des écoles
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel
import psycopg2
from api.config import settings

router = APIRouter()


class EcoleCreate(BaseModel):
    """Modèle pour la création d'une école"""
    nom: str
    adresse: str
    ville: str
    code_postal: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    directeur: Optional[str] = None
    nombre_etudiants: int = 0


class EcoleUpdate(BaseModel):
    """Modèle pour la mise à jour d'une école"""
    nom: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    directeur: Optional[str] = None
    nombre_etudiants: Optional[int] = None


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


@router.get("/api/ecoles", response_model=List[Dict])
async def get_ecoles():
    """
    Récupère la liste de toutes les écoles

    Returns:
        Liste des écoles
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, nom, adresse, ville, code_postal, telephone,
                   email, directeur, nombre_etudiants
            FROM public.ecoles
            ORDER BY nom
        """)

        ecoles = []
        for row in cur.fetchall():
            ecoles.append({
                "id": str(row[0]),
                "nom": row[1],
                "adresse": row[2],
                "ville": row[3],
                "code_postal": row[4],
                "telephone": row[5],
                "email": row[6],
                "directeur": row[7],
                "nombre_etudiants": row[8]
            })

        cur.close()
        conn.close()

        return ecoles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/api/ecoles", response_model=Dict)
async def create_ecole(ecole: EcoleCreate):
    """
    Crée une nouvelle école

    Args:
        ecole: Données de l'école à créer

    Returns:
        École créée avec son ID
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO public.ecoles (
                nom, adresse, ville, code_postal, telephone,
                email, directeur, nombre_etudiants
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nom, adresse, ville, code_postal, telephone,
                      email, directeur, nombre_etudiants
        """, (
            ecole.nom, ecole.adresse, ecole.ville, ecole.code_postal,
            ecole.telephone, ecole.email, ecole.directeur, ecole.nombre_etudiants
        ))

        row = cur.fetchone()
        conn.commit()

        result = {
            "id": str(row[0]),
            "nom": row[1],
            "adresse": row[2],
            "ville": row[3],
            "code_postal": row[4],
            "telephone": row[5],
            "email": row[6],
            "directeur": row[7],
            "nombre_etudiants": row[8]
        }

        cur.close()
        conn.close()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.put("/api/ecoles/{ecole_id}", response_model=Dict)
async def update_ecole(ecole_id: str, ecole: EcoleUpdate):
    """
    Met à jour une école

    Args:
        ecole_id: ID de l'école
        ecole: Données à mettre à jour

    Returns:
        École mise à jour
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        update_fields = []
        values = []

        if ecole.nom is not None:
            update_fields.append("nom = %s")
            values.append(ecole.nom)
        if ecole.adresse is not None:
            update_fields.append("adresse = %s")
            values.append(ecole.adresse)
        if ecole.ville is not None:
            update_fields.append("ville = %s")
            values.append(ecole.ville)
        if ecole.code_postal is not None:
            update_fields.append("code_postal = %s")
            values.append(ecole.code_postal)
        if ecole.telephone is not None:
            update_fields.append("telephone = %s")
            values.append(ecole.telephone)
        if ecole.email is not None:
            update_fields.append("email = %s")
            values.append(ecole.email)
        if ecole.directeur is not None:
            update_fields.append("directeur = %s")
            values.append(ecole.directeur)
        if ecole.nombre_etudiants is not None:
            update_fields.append("nombre_etudiants = %s")
            values.append(ecole.nombre_etudiants)

        if not update_fields:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

        values.append(ecole_id)

        query = f"""
            UPDATE public.ecoles
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, nom, adresse, ville, code_postal, telephone,
                      email, directeur, nombre_etudiants
        """

        cur.execute(query, values)
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="École non trouvée")

        conn.commit()

        result = {
            "id": str(row[0]),
            "nom": row[1],
            "adresse": row[2],
            "ville": row[3],
            "code_postal": row[4],
            "telephone": row[5],
            "email": row[6],
            "directeur": row[7],
            "nombre_etudiants": row[8]
        }

        cur.close()
        conn.close()

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.delete("/api/ecoles/{ecole_id}")
async def delete_ecole(ecole_id: str):
    """
    Supprime une école

    Args:
        ecole_id: ID de l'école à supprimer

    Returns:
        Message de confirmation
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("DELETE FROM public.ecoles WHERE id = %s RETURNING id", (ecole_id,))
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="École non trouvée")

        conn.commit()
        cur.close()
        conn.close()

        return {"message": "École supprimée avec succès", "id": str(row[0])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
