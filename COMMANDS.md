# Service Commands (Local Dev)

This repo contains multiple apps:

- Backend (Medusa/Mercur): `backend/` (port `9000`)
- Storefront (Next.js): `storefront/` (port `3000`)
- Admin panel (Vite): `admin-panel/` (default port `5173`, configurable)
- Vendor panel (Vite): `vendor-panel/` (default port `5173`, configurable)
- Chat service (Express + WebSocket): `chat/` (port `4010`)
- Infra (Postgres/Redis/Meilisearch): `docker-compose.yml`

## Option A: Start core infra + backend via Docker

From repo root:

- Start infra (Postgres/Redis/Meilisearch/Chat):
  - `docker compose up -d --build`
- Start backend in Docker too (Compose profile):
  - `docker compose --profile backend up -d --build`
- Tail logs:
  - `docker compose logs -f chat meilisearch postgres redis`
  - (if backend is running in Docker) `docker compose logs -f backend`
- Stop:
  - `docker compose down`

Ports exposed by compose:

- Postgres: `5433`
- Redis: `6379`
- Meilisearch: `7700`
- Chat: `4010`
- Backend: `9000`

Notes:

- The Admin and Vendor panels are not started by `docker-compose.yml`.
- The Vite apps can share a port only if you run one at a time. To run both concurrently, set `PORT` for one of them (example below).

## Option B: Run each app locally (recommended for frontend dev)

Prereqs:

- Node.js (LTS)
- pnpm (recommended): `npm i -g pnpm`

### 1) Infra (Postgres/Redis/Meili/Chat)

From repo root:

- `docker compose up -d --build postgres redis meilisearch chat`

Health checks:

- Meilisearch: `http://localhost:7700/health`
- Chat: `http://localhost:4010/health`

### 2) Backend

- `cd backend`
- `pnpm install`
- `pnpm dev`

Optional one-time setup:

- Seed database: `pnpm seed`
- Create admin user: `npx medusa user -e admin@test.com -p supersecret`

Backend uses (from compose) `MEILI_HOST=http://meilisearch:7700` when dockerized. When running backend locally (outside docker), set `MEILI_HOST=http://localhost:7700`.

### 3) Storefront

- `cd storefront`
- `pnpm install`
- Create `storefront/.env.local`:
  - `MEDUSA_BACKEND_URL=http://localhost:9000`
  - `NEXT_PUBLIC_CHAT_URL=http://localhost:4010`
  - `NEXT_PUBLIC_MEILI_URL=http://localhost:7700`
  - (plus existing vars from `storefront/README.md`)
- `pnpm dev`

### 4) Admin panel

- `cd admin-panel`
- `pnpm install`
- Create `admin-panel/.env.local`:
  - `VITE_MEDUSA_BACKEND_URL=http://localhost:9000`
  - `VITE_CHAT_URL=http://localhost:4010`
- `pnpm dev`

To run Admin on a specific port:

- `PORT=5173 pnpm dev`

### 5) Vendor panel

- `cd vendor-panel`
- `pnpm install`
- Create `vendor-panel/.env.local`:
  - `VITE_MEDUSA_BACKEND_URL=http://localhost:9000`
  - `VITE_CHAT_URL=http://localhost:4010`
- `pnpm dev`

To run Vendor on a specific port (example 5174):

- `PORT=5174 pnpm dev`

## Quick “all dev” checklist

1. `docker compose up -d --build postgres redis meilisearch chat`
2. Run `backend` locally: `pnpm dev`
3. Run `storefront` locally: `pnpm dev`
4. Run `admin-panel` locally: `pnpm dev`
5. Run `vendor-panel` locally: `pnpm dev`

## Easiest way (Windows): one command

From repo root:

- Start Docker infra + run backend locally + run all frontends:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1`
- Run backend in Docker instead:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 -Backend docker`
- Stop everything:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\dev-stop.ps1 -KillPorts -Down`
