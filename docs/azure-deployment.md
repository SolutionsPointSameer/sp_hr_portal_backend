# Azure Deployment Guide

This repository contains:

- `sp_hr_portal_frontend`: Vite/React SPA
- `sp_hr_portal_backend`: Node.js/Express API with Prisma
- PostgreSQL required by Prisma
- Azure Blob Storage already supported for employee documents

## Recommended Azure Shape

For this codebase, the most cost-efficient Azure setup that is still production-usable is:

- Frontend: Azure Static Web Apps
- Backend: Azure Container Apps
- Database: Azure Database for PostgreSQL Flexible Server on a burstable SKU
- Files: Azure Storage Account with Blob container

Why this shape:

- Static Web Apps is the cheapest clean fit for the Vite frontend.
- Container Apps can scale down aggressively and is usually cheaper than keeping an App Service instance running full time.
- This backend is stateless and already uses Blob Storage for documents, so it does not need persistent local disk.
- Prisma works fine against PostgreSQL Flexible Server.

## When To Use App Service Instead

Use Azure App Service instead of Container Apps if:

- you want the simplest Azure portal deployment flow
- you expect steady traffic all day
- you want fewer moving parts and do not mind a higher fixed monthly cost

For a small internal HR portal with intermittent usage, Container Apps is the better cost default.

## Estimated Cost Direction

Typical low-cost footprint:

- Static Web Apps: free or low-cost tier
- Container Apps: low idle cost, pay more only when used
- PostgreSQL Flexible Server: this will usually be the largest fixed cost
- Blob Storage: typically low unless documents grow heavily

Important:

- The database will dominate cost more than the frontend or API host.
- Skip Key Vault for the first deployment if budget matters. Store secrets in Azure-managed app settings first.
- Use a single region for all resources to avoid cross-region egress and latency.

## Recommended Production Baseline

### Frontend

Deploy `sp_hr_portal_frontend` to Azure Static Web Apps.

Build settings:

- App location: `sp_hr_portal_frontend`
- Output location: `dist`
- Build command: `npm run build`

Build-time environment variable:

- `VITE_API_BASE_URL=https://<your-api-domain>`

Notes:

- `sp_hr_portal_frontend/public/staticwebapp.config.json` already handles SPA route fallback.
- The frontend currently expects a full API base URL in production.

### Backend

Deploy `sp_hr_portal_backend` to Azure Container Apps.

Runtime:

- Node.js 20

Start command:

- `npm start`

Why this works with the repo:

- `start` already runs `prisma migrate deploy && node src/index.js`
- the app binds to `process.env.PORT`
- document uploads already support Azure Blob Storage

### Database

Use Azure Database for PostgreSQL Flexible Server.

Recommended starting point for cost efficiency:

- Burstable SKU
- smallest usable vCore/memory option available in your region
- zone-redundant HA disabled initially
- automatic backups left at minimum acceptable retention for your needs

Do not choose serverless if it is materially more expensive in your region for this usage pattern. Check pricing in the Azure portal before provisioning.

### Storage

Provision one Storage Account and one private Blob container:

- container name: `hr-portal-documents`

If documents are mostly archival:

- enable lifecycle rules later to move older blobs to cool tier

## Required Backend Environment Variables

Set these on the backend container app:

- `NODE_ENV=production`
- `FRONTEND_URL=https://<your-static-web-app-domain>`
- `DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require`
- `JWT_SECRET=<long-random-secret>`
- `JWT_REFRESH_SECRET=<long-random-secret>`
- `AZURE_STORAGE_CONNECTION_STRING=<storage-connection-string>`
- `AZURE_STORAGE_CONTAINER=hr-portal-documents`

Optional:

- `SMTP_HOST=<smtp-host>`
- `SMTP_PORT=<smtp-port>`
- `SMTP_USER=<smtp-user>`
- `SMTP_PASS=<smtp-password>`
- `AZURE_KEY_VAULT_URL=https://<your-key-vault-name>.vault.azure.net/`

Cost note:

- Do not add Key Vault on day one unless you already need centralized secret rotation or cross-service secret sharing.

## Deployment Order

1. Provision PostgreSQL Flexible Server.
2. Create the application database.
3. Provision the Storage Account and Blob container.
4. Deploy the backend to Container Apps and set environment variables.
5. Verify `https://<backend-domain>/health`.
6. Deploy the frontend to Static Web Apps with `VITE_API_BASE_URL` pointing at the backend.
7. Update backend `FRONTEND_URL` to the final frontend hostname if needed.

## Azure Container Apps Deployment Notes

Use these backend settings as a starting point:

- min replicas: `0` or `1`
- max replicas: `1` initially
- cpu: `0.5`
- memory: `1Gi`

Tradeoff:

- `min replicas = 0` is cheapest but introduces cold starts
- `min replicas = 1` costs more but gives faster login/API response

For an internal HR portal with light traffic:

- start with `min replicas = 0`
- if cold starts become a user issue, move to `1`

## Prisma Notes

The backend startup already runs migrations:

```bash
npm start
```

Before first production use, seed manually if needed:

```bash
cd sp_hr_portal_backend
DATABASE_URL="<your-connection-string>" node prisma/seed.js
```

If you prefer to run migrations manually before backend startup:

```bash
cd sp_hr_portal_backend
DATABASE_URL="<your-connection-string>" npx prisma migrate deploy
```

## Frontend Deployment Notes

The frontend uses:

- dev: `/api` through the Vite proxy
- prod: `VITE_API_BASE_URL`

That is defined in [client.ts](/Users/sameerranjan/Desktop/HR-Management/sp_hr_portal_frontend/src/api/client.ts).

Set:

- `VITE_API_BASE_URL=https://<backend-domain>`

Do not include a trailing slash.

## App Service Fallback

If you want the simpler but less cost-efficient option, use:

- Frontend: Static Web Apps
- Backend: Linux App Service, Node 20, Basic B1
- Database: PostgreSQL Flexible Server

Use App Service if:

- you want predictable always-on behavior
- you do not want Container Apps cold starts
- you value simpler operations over the lowest monthly cost

## Validation Checklist

- Backend health endpoint returns `200` at `/health`
- Prisma migrations apply successfully
- Frontend loads deep links such as `/employees`
- Login succeeds in production
- Employee document upload works
- Blob URLs are accessible through generated SAS links

## Files In This Repo Relevant To Azure

- [azure-deployment.md](/Users/sameerranjan/Desktop/HR-Management/docs/azure-deployment.md)
- [package.json](/Users/sameerranjan/Desktop/HR-Management/sp_hr_portal_backend/package.json)
- [index.js](/Users/sameerranjan/Desktop/HR-Management/sp_hr_portal_backend/src/index.js)
- [azureBlob.js](/Users/sameerranjan/Desktop/HR-Management/sp_hr_portal_backend/src/lib/azureBlob.js)
- [client.ts](/Users/sameerranjan/Desktop/HR-Management/sp_hr_portal_frontend/src/api/client.ts)
- [staticwebapp.config.json](/Users/sameerranjan/Desktop/HR-Management/sp_hr_portal_frontend/public/staticwebapp.config.json)

## Fastest Low-Cost Recommendation

If you want the shortest path with reasonable cost:

1. Put the frontend on Static Web Apps.
2. Put the backend on Container Apps with `0.5 CPU`, `1Gi`, `min replicas 0`.
3. Use the smallest burstable PostgreSQL Flexible Server your region offers.
4. Use one Blob container for documents.
5. Skip Key Vault initially.

That is the best cost-to-operational-complexity balance for this repository.
