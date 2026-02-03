# Local Dev Setup & Commands (Windows)

This repo contains 4 apps + Docker infra:

- **backend/** (Medusa/Mercur API) — http://localhost:9000
- **storefront/** (Next.js) — http://localhost:3000
- **admin-panel/** (Vite) — http://localhost:5173
- **vendor-panel/** (Vite) — http://localhost:5174 (recommended so it doesn’t collide with admin-panel)

Docker services (via `docker-compose.yml`): Postgres (5433), Redis (6379), Meilisearch (7700), Chat (4010), and optionally the backend (9000).

---

## Prerequisites

Install:

- Node.js **20+**
- pnpm (`npm i -g pnpm`)
- Docker Desktop

Recommended:

- VS Code
- Git

---

## One-time setup (dependencies + env files)

### 1) Install dependencies

Run once per app:

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"

Push-Location "$root\backend"; pnpm install; Pop-Location
Push-Location "$root\storefront"; pnpm install; Pop-Location
Push-Location "$root\admin-panel"; pnpm install; Pop-Location
Push-Location "$root\vendor-panel"; pnpm install; Pop-Location
```

### 2) Create env files from templates

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"

Copy-Item "$root\backend\.env.template" "$root\backend\.env" -Force
Copy-Item "$root\storefront\.env.template" "$root\storefront\.env.local" -Force
Copy-Item "$root\admin-panel\.env.template" "$root\admin-panel\.env.local" -Force
Copy-Item "$root\vendor-panel\.env.template" "$root\vendor-panel\.env.local" -Force
```

Then edit the files if needed:

- `backend/.env`
  - If running Postgres via Docker locally: `DATABASE_URL=postgres://postgres:postgres@localhost:5433/mercurjs`
  - If you want Meilisearch locally: `MEILI_HOST=http://localhost:7700` and `MEILI_INDEX_PRODUCTS=products`
- `storefront/.env.local`
  - Must set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (see “Publishable key” section)
  - Keep `MEDUSA_BACKEND_URL=http://localhost:9000`
- `admin-panel/.env.local` and `vendor-panel/.env.local`
  - Keep `VITE_MEDUSA_BACKEND_URL=http://localhost:9000`

---

## Start / Stop everything

### Stop everything (clean slate)

1. Stop Docker services:

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location $root
docker compose down
Pop-Location
```

2. Stop local dev servers

- If you started them in terminals: press `Ctrl+C` in each.
- If you need to kill by port:

```powershell
$ports = @(9000,3000,5173,5174,4010,7700)
foreach ($p in $ports) {
  Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq 'Listen' } |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
```

### Start infra (Postgres + Redis + Meili + Chat)

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location $root
docker compose up -d --build postgres redis meilisearch chat
Pop-Location
```

Optional: run the backend in Docker too (closer to prod, but typically slower iteration on Windows file-watching):

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location $root
docker compose --profile backend up -d --build backend
Pop-Location
```

Health checks:

- Meili: http://localhost:7700/health
- Chat: http://localhost:4010/health

---

## Backend (Medusa/Mercur)

### Start backend

Recommended (run locally, uses Docker infra):

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\backend"
# Ensure backend/.env exists
pnpm dev
Pop-Location
```

Backend URL: http://localhost:9000

### Run migrations + seed

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\backend"
# Migrate
pnpm exec medusa db:migrate
# Seed (creates regions/products/etc + the publishable API key titled “Webshop”)
pnpm seed
Pop-Location
```

### Create an admin user

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\backend"
pnpm exec medusa user -e admin@test.com -p supersecret
Pop-Location
```

---

## Activate the Medusa Admin Dashboard

This repo’s Medusa admin UI is controlled by `backend/medusa-config.ts`.

- It is **enabled** when `admin.disable` is `false`.

Once the backend is running, try:

- http://localhost:9000/app

If that route doesn’t serve the UI in your environment, you can still use the separate Vite dashboards:

- Admin panel: http://localhost:5173
- Vendor panel: http://localhost:5174

---

## Publishable API key (for Storefront)

The storefront requires `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

This repo exposes the publishable key via:

- http://localhost:9000/key-exchange

After seeding, fetch it:

```powershell
(iwr -UseBasicParsing http://localhost:9000/key-exchange | Select-Object -ExpandProperty Content)
```

Copy the returned `publishableApiKey` into `storefront/.env.local` as:

```dotenv
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
```

---

## Storefront (Next.js)

### Start

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\storefront"
# Requires backend running and NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY set
pnpm dev
Pop-Location
```

URL: http://localhost:3000

---

## Admin panel (Vite)

### Start

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\admin-panel"
$env:PORT = "5173"
pnpm dev
Pop-Location
```

URL: http://localhost:5173

---

## Vendor panel (Vite)

### Start (on 5174)

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\vendor-panel"
$env:PORT = "5174"
pnpm dev
Pop-Location
```

URL: http://localhost:5174

---

## How they link together (the important bits)

- **Frontend → Backend**
  - `storefront/.env.local`: `MEDUSA_BACKEND_URL=http://localhost:9000`
  - `admin-panel/.env.local`: `VITE_MEDUSA_BACKEND_URL=http://localhost:9000`
  - `vendor-panel/.env.local`: `VITE_MEDUSA_BACKEND_URL=http://localhost:9000`

- **Storefront auth**
  - `storefront/.env.local`: `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...`
  - Key comes from `GET /key-exchange` (seed creates the key titled `Webshop`).

- **CORS (Backend)**
  - If backend runs in Docker, `docker-compose.yml` already sets `STORE_CORS`, `ADMIN_CORS`, `VENDOR_CORS`, and `AUTH_CORS`.
  - If backend runs locally, ensure `backend/.env` includes the correct CORS URLs for all UI apps:

```dotenv
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:5173
VENDOR_CORS=http://localhost:5174
AUTH_CORS=http://localhost:3000,http://localhost:5173,http://localhost:5174
```

---

## Tests / checks (all 4 projects)

### Backend

Requires Docker infra running (Postgres/Redis at least):

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\backend"
pnpm test:unit
pnpm test:integration:http
pnpm test:integration:modules
Pop-Location
```

### Admin panel

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\admin-panel"
pnpm lint
pnpm test
pnpm build
Pop-Location
```

### Vendor panel

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\vendor-panel"
pnpm lint
pnpm typecheck
pnpm test
pnpm build
Pop-Location
```

### Storefront

```powershell
$root = "c:\Users\Ilan\Documents\GitHub\mercurjs-for-railway-boilerplate"
Push-Location "$root\storefront"
pnpm lint
pnpm build
Pop-Location
```

Note: `storefront` build expects backend to be reachable and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` to be set.
