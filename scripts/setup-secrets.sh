#!/bin/bash

# ===========================================
# Script de configuration des secrets
# Usage: ./scripts/setup-secrets.sh
# ===========================================

set -e

SECRETS_DIR="./secrets"

echo "🔐 Configuration des secrets pour le module Transport"
echo "=================================================="

# Créer le dossier secrets s'il n'existe pas
if [ ! -d "$SECRETS_DIR" ]; then
    mkdir -p "$SECRETS_DIR"
    echo "✅ Dossier secrets créé"
fi

# Fonction pour générer une clé aléatoire
generate_key() {
    openssl rand -hex 32
}

# Fonction pour demander une valeur avec valeur par défaut
prompt_value() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"

    read -p "$prompt [$default]: " value
    echo "${value:-$default}"
}

# ===========================================
# Configuration Database
# ===========================================
echo ""
echo "📦 Configuration de la base de données"
echo "---------------------------------------"

DB_USER=$(prompt_value "Nom d'utilisateur PostgreSQL" "transport_user")
DB_PASSWORD=$(prompt_value "Mot de passe PostgreSQL (laisser vide pour générer)" "")

if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(generate_key | head -c 24)
    echo "🔑 Mot de passe généré: $DB_PASSWORD"
fi

DB_HOST=$(prompt_value "Hôte PostgreSQL" "postgres")
DB_PORT=$(prompt_value "Port PostgreSQL" "5432")
DB_NAME=$(prompt_value "Nom de la base" "transport")

# Construire l'URL de connexion
DATABASE_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Écrire les secrets
echo "$DB_USER" > "$SECRETS_DIR/db_user.txt"
echo "$DB_PASSWORD" > "$SECRETS_DIR/db_password.txt"
echo "$DATABASE_URL" > "$SECRETS_DIR/database_url.txt"

echo "✅ Secrets database créés"

# ===========================================
# Configuration API
# ===========================================
echo ""
echo "🔑 Configuration de l'API"
echo "-------------------------"

SECRET_KEY=$(prompt_value "Clé secrète JWT (laisser vide pour générer)" "")

if [ -z "$SECRET_KEY" ]; then
    SECRET_KEY=$(generate_key)
    echo "🔑 Clé secrète générée"
fi

echo "$SECRET_KEY" > "$SECRETS_DIR/secret_key.txt"

echo "✅ Secret API créé"

# ===========================================
# Sécuriser les fichiers
# ===========================================
chmod 600 "$SECRETS_DIR"/*.txt
chmod 700 "$SECRETS_DIR"

echo ""
echo "🔒 Permissions sécurisées appliquées"

# ===========================================
# Créer le fichier .gitignore pour les secrets
# ===========================================
if [ ! -f "$SECRETS_DIR/.gitignore" ]; then
    echo "*" > "$SECRETS_DIR/.gitignore"
    echo "!.gitignore" >> "$SECRETS_DIR/.gitignore"
    echo "✅ .gitignore créé pour le dossier secrets"
fi

# ===========================================
# Résumé
# ===========================================
echo ""
echo "=================================================="
echo "✅ Configuration terminée!"
echo ""
echo "Fichiers créés dans $SECRETS_DIR/:"
ls -la "$SECRETS_DIR"
echo ""
echo "⚠️  IMPORTANT: Ne jamais commiter ces fichiers!"
echo "    Le dossier secrets/ est ignoré par git."
echo ""
echo "🚀 Pour démarrer en production:"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
