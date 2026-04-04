#!/usr/bin/env bash

set -euo pipefail

AZ="${AZ:-/opt/homebrew/bin/az}"
AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR:-/tmp/azure-config}"

SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-21c3bc9b-628a-4598-947d-d5d9f59097dd}"
RESOURCE_GROUP="${RESOURCE_GROUP:-hr-portal}"
LOCATION="${LOCATION:-centralindia}"
KEY_VAULT_NAME="${KEY_VAULT_NAME:-hr-portal-kv}"

ACR_NAME="${ACR_NAME:-hrportalacr}"
CONTAINERAPPS_ENV="${CONTAINERAPPS_ENV:-hr-portal-env}"
CONTAINERAPP_NAME="${CONTAINERAPP_NAME:-hr-portal-api}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d%H%M%S)}"
IMAGE_NAME="${IMAGE_NAME:-${ACR_NAME}.azurecr.io/hr-portal-api:${IMAGE_TAG}}"

APP_PORT="${APP_PORT:-3000}"
MIN_REPLICAS="${MIN_REPLICAS:-0}"
MAX_REPLICAS="${MAX_REPLICAS:-1}"
CPU="${CPU:-0.5}"
MEMORY="${MEMORY:-1Gi}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/sp_hr_portal_backend"

required_commands=("$AZ" docker)
for cmd in "${required_commands[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    exit 1
  fi
done

secret_uri() {
  local name="$1"
  echo "https://${KEY_VAULT_NAME}.vault.azure.net/secrets/${name}"
}

echo "Using Azure subscription: ${SUBSCRIPTION_ID}"
AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" account set --subscription "${SUBSCRIPTION_ID}"

echo "Ensuring resource group exists..."
AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" group create \
  --name "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --output none

echo "Ensuring ACR exists..."
if ! AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" acr show --name "${ACR_NAME}" --resource-group "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" acr create \
    --name "${ACR_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --location "${LOCATION}" \
    --sku Basic \
    --admin-enabled true \
    --output none
fi

echo "Logging into ACR..."
AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" acr login --name "${ACR_NAME}"

echo "Building backend image ${IMAGE_NAME}..."
docker build -t "${IMAGE_NAME}" "${BACKEND_DIR}"
docker push "${IMAGE_NAME}"

echo "Ensuring Container Apps environment exists..."
if ! AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" containerapp env show --name "${CONTAINERAPPS_ENV}" --resource-group "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" containerapp env create \
    --name "${CONTAINERAPPS_ENV}" \
    --resource-group "${RESOURCE_GROUP}" \
    --location "${LOCATION}" \
    --output none
fi

echo "Creating or updating container app..."
if ! AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" containerapp show --name "${CONTAINERAPP_NAME}" --resource-group "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" containerapp create \
    --name "${CONTAINERAPP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --environment "${CONTAINERAPPS_ENV}" \
    --image "${IMAGE_NAME}" \
    --target-port "${APP_PORT}" \
    --ingress external \
    --min-replicas "${MIN_REPLICAS}" \
    --max-replicas "${MAX_REPLICAS}" \
    --cpu "${CPU}" \
    --memory "${MEMORY}" \
    --system-assigned \
    --output none
else
  AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" containerapp update \
    --name "${CONTAINERAPP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --image "${IMAGE_NAME}" \
    --min-replicas "${MIN_REPLICAS}" \
    --max-replicas "${MAX_REPLICAS}" \
    --cpu "${CPU}" \
    --memory "${MEMORY}" \
    --output none
fi

CONTAINERAPP_PRINCIPAL_ID="$(
  AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" containerapp show \
    --name "${CONTAINERAPP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --query identity.principalId \
    --output tsv
)"

if [[ -z "${CONTAINERAPP_PRINCIPAL_ID}" ]]; then
  echo "Could not resolve the container app managed identity principal ID."
  exit 1
fi

KEY_VAULT_SCOPE="$(
  AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" keyvault show \
    --name "${KEY_VAULT_NAME}" \
    --query id \
    --output tsv
)"

echo "Granting Key Vault Secrets User to the container app identity..."
AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" role assignment create \
  --assignee-object-id "${CONTAINERAPP_PRINCIPAL_ID}" \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "${KEY_VAULT_SCOPE}" \
  --output none || true

echo "Binding Key Vault secrets to the container app..."
AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" containerapp secret set \
  --name "${CONTAINERAPP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --secrets \
    node-env=keyvaultref:$(secret_uri NODE-ENV),identityref:system \
    port=keyvaultref:$(secret_uri PORT),identityref:system \
    frontend-url=keyvaultref:$(secret_uri FRONTEND-URL),identityref:system \
    database-url=keyvaultref:$(secret_uri DATABASE-URL),identityref:system \
    jwt-secret=keyvaultref:$(secret_uri JWT-SECRET),identityref:system \
    jwt-refresh-secret=keyvaultref:$(secret_uri JWT-REFRESH-SECRET),identityref:system \
    jwt-expires-in=keyvaultref:$(secret_uri JWT-EXPIRES-IN),identityref:system \
    jwt-refresh-expires-in=keyvaultref:$(secret_uri JWT-REFRESH-EXPIRES-IN),identityref:system \
    smtp-host=keyvaultref:$(secret_uri SMTP-HOST),identityref:system \
    smtp-port=keyvaultref:$(secret_uri SMTP-PORT),identityref:system \
    smtp-user=keyvaultref:$(secret_uri SMTP-USER),identityref:system \
    smtp-pass=keyvaultref:$(secret_uri SMTP-PASS),identityref:system \
    ses-sender=keyvaultref:$(secret_uri SES-SENDER),identityref:system \
    storage-connection=keyvaultref:$(secret_uri AZURE-STORAGE-CONNECTION-STRING),identityref:system \
    storage-container=keyvaultref:$(secret_uri AZURE-STORAGE-CONTAINER),identityref:system \
  --output none

AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" containerapp update \
  --name "${CONTAINERAPP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --set-env-vars \
    NODE_ENV=secretref:node-env \
    PORT=secretref:port \
    FRONTEND_URL=secretref:frontend-url \
    DATABASE_URL=secretref:database-url \
    JWT_SECRET=secretref:jwt-secret \
    JWT_REFRESH_SECRET=secretref:jwt-refresh-secret \
    JWT_EXPIRES_IN=secretref:jwt-expires-in \
    JWT_REFRESH_EXPIRES_IN=secretref:jwt-refresh-expires-in \
    SMTP_HOST=secretref:smtp-host \
    SMTP_PORT=secretref:smtp-port \
    SMTP_USER=secretref:smtp-user \
    SMTP_PASS=secretref:smtp-pass \
    SES_SENDER=secretref:ses-sender \
    AZURE_STORAGE_CONNECTION_STRING=secretref:storage-connection \
    AZURE_STORAGE_CONTAINER=secretref:storage-container \
    AZURE_KEY_VAULT_URL="https://${KEY_VAULT_NAME}.vault.azure.net/" \
  --output none

APP_FQDN="$(
  AZURE_CONFIG_DIR="${AZURE_CONFIG_DIR}" "$AZ" containerapp show \
    --name "${CONTAINERAPP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --query properties.configuration.ingress.fqdn \
    --output tsv
)"

echo
echo "Backend deployment completed."
echo "Container App: ${CONTAINERAPP_NAME}"
echo "Image: ${IMAGE_NAME}"
echo "URL: https://${APP_FQDN}"
echo
echo "Next:"
echo "1. Set VITE_API_BASE_URL=https://${APP_FQDN} in the frontend deployment."
echo "2. Deploy the frontend to Azure Static Web Apps."
