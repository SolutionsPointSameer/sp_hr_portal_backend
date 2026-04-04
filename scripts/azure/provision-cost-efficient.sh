#!/usr/bin/env bash

set -euo pipefail

# Minimal Azure bootstrap for this repository.
# Fill these before running:
#   SUBSCRIPTION_ID
#   LOCATION
#   RESOURCE_GROUP
#   POSTGRES_ADMIN_USER
#   POSTGRES_ADMIN_PASSWORD

SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-}"
LOCATION="${LOCATION:-centralindia}"
RESOURCE_GROUP="${RESOURCE_GROUP:-hr-portal-rg}"

POSTGRES_SERVER="${POSTGRES_SERVER:-hrportalpg$RANDOM}"
POSTGRES_DB="${POSTGRES_DB:-hr_portal}"
POSTGRES_ADMIN_USER="${POSTGRES_ADMIN_USER:-}"
POSTGRES_ADMIN_PASSWORD="${POSTGRES_ADMIN_PASSWORD:-}"

STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-hrportal$RANDOM}"
STORAGE_CONTAINER="${STORAGE_CONTAINER:-hr-portal-documents}"

CONTAINERAPPS_ENV="${CONTAINERAPPS_ENV:-hr-portal-env}"
CONTAINERAPP_NAME="${CONTAINERAPP_NAME:-hr-portal-api}"

if [[ -z "$SUBSCRIPTION_ID" || -z "$POSTGRES_ADMIN_USER" || -z "$POSTGRES_ADMIN_PASSWORD" ]]; then
  echo "Set SUBSCRIPTION_ID, POSTGRES_ADMIN_USER, and POSTGRES_ADMIN_PASSWORD before running."
  exit 1
fi

az account set --subscription "$SUBSCRIPTION_ID"

az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$POSTGRES_SERVER" \
  --location "$LOCATION" \
  --admin-user "$POSTGRES_ADMIN_USER" \
  --admin-password "$POSTGRES_ADMIN_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0

az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$POSTGRES_SERVER" \
  --database-name "$POSTGRES_DB"

az storage account create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --allow-blob-public-access false

az storage container create \
  --account-name "$STORAGE_ACCOUNT" \
  --name "$STORAGE_CONTAINER" \
  --auth-mode login

az containerapp env create \
  --name "$CONTAINERAPPS_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

cat <<EOF

Provisioning complete.

Next steps:

1. Build and push the backend image to a registry Azure Container Apps can pull from.
2. Create the container app:

   az containerapp create \\
     --name "$CONTAINERAPP_NAME" \\
     --resource-group "$RESOURCE_GROUP" \\
     --environment "$CONTAINERAPPS_ENV" \\
     --image <your-registry>/<image>:<tag> \\
     --target-port 3000 \\
     --ingress external \\
     --min-replicas 0 \\
     --max-replicas 1 \\
     --cpu 0.5 \\
     --memory 1Gi

3. Set backend secrets and env vars on the container app:

   NODE_ENV=production
   FRONTEND_URL=https://<your-static-web-app-domain>
   DATABASE_URL=postgresql://${POSTGRES_ADMIN_USER}:${POSTGRES_ADMIN_PASSWORD}@${POSTGRES_SERVER}.postgres.database.azure.com:5432/${POSTGRES_DB}?sslmode=require
   JWT_SECRET=<long-random-secret>
   JWT_REFRESH_SECRET=<long-random-secret>

4. Get the storage connection string:

   az storage account show-connection-string \\
     --resource-group "$RESOURCE_GROUP" \\
     --name "$STORAGE_ACCOUNT" \\
     --query connectionString -o tsv

5. Add these backend storage settings:

   AZURE_STORAGE_CONNECTION_STRING=<connection-string>
   AZURE_STORAGE_CONTAINER=${STORAGE_CONTAINER}

6. Deploy the frontend separately to Azure Static Web Apps with:

   VITE_API_BASE_URL=https://<your-container-app-domain>

EOF
