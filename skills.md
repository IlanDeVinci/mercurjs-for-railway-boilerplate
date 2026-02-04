# MercurJS for Railway — Helper Skills Guide

## Project overview

- Multi-app marketplace stack built on Medusa v2 + MercurJS plugins.
- Services:
  - Backend API (Medusa/Mercur) — Node.js/TypeScript
  - Admin panel (Vite/React)
  - Vendor panel (Vite/React)
  - Storefront (Next.js/React)
  - Chat service (Express + WebSocket)
  - Infra: Postgres, Redis, Meilisearch, optional MinIO/S3-compatible storage

## Architecture (high-level flow)

- Frontends (Storefront/Admin/Vendor) call the Backend API.
- Backend uses Postgres for data, Redis for queues/workflows/events, Meilisearch for search.
- Chat service uses Postgres and JWT, and is consumed by frontends.
- File uploads use MinIO (if configured) or local disk storage in backend/static.

## Key directories

- backend/ — Medusa/Mercur API, workflows, modules, custom routes, subscribers, scripts
- admin-panel/ — Admin dashboard (Vite + React)
- vendor-panel/ — Vendor dashboard (Vite + React)
- storefront/ — Customer storefront (Next.js)
- chat/ — Express + WebSocket chat service
- docs/ — local dev + production guidance
- scripts/ — dev orchestration PowerShell scripts

## Core dependencies and stack

### Backend

- Medusa v2 framework
- MercurJS plugins: b2c-core, commission, reviews, requests, resend
- Mikro-ORM + PostgreSQL
- Redis event bus + workflow engine
- Meilisearch (search indexing)
- MinIO/S3-compatible file storage (optional)
- Stripe Connect payments (optional)
- PostHog for analytics (node SDK)

### Admin/Vendor dashboards

- React 18 + Vite + TypeScript
- Medusa UI, Medusa admin shared SDK, TanStack Query
- i18next + translations
- Radix UI, dnd-kit, react-hook-form, zod

### Storefront

- Next.js (app router), React 19
- Medusa JS SDK
- Tailwind CSS + Headless UI
- i18next/next-intl
- Stripe client

### Chat service

- Express + ws (WebSocket)
- PostgreSQL
- JWT auth

## Backend configuration highlights

- medusa-config.ts defines project config, CORS, and plugins.
- Optional MinIO provider swaps in for file storage when MINIO env vars exist.
- Optional Stripe Connect provider enabled by STRIPE_SECRET_API_KEY + STRIPE_WEBHOOK_SECRET.
- Optional Resend email provider enabled by RESEND_API_KEY + RESEND_FROM_EMAIL.

## Environment variables (conceptual)

- Backend: DATABASE*URL, REDIS_URL, JWT_SECRET, COOKIE_SECRET, CORS vars, MEILI*\*.
- Storefront: MEDUSA*BACKEND_URL, NEXT_PUBLIC*\* keys (publishable key, chat, meili, base URL).
- Admin/Vendor: VITE_MEDUSA_BACKEND_URL, VITE_CHAT_URL, VITE_MEDUSA_STOREFRONT_URL.
- Chat: CHAT_DATABASE_URL, CORS_ORIGIN, CHAT_JWT_SECRET.

## Security & safety notes

- Change JWT/COOKIE secrets and any API keys in production.
- Configure strict CORS in backend for store/admin/vendor origins.
- If Meilisearch is public, enable auth keys and restrict CORS.
- Chat service relies on JWT and CORS; keep CHAT_JWT_SECRET private.
- Use HTTPS in production and secure cookies if exposed publicly.

## Verification & quality checks

- Backend: lint, unit tests, integration tests, migrations/seed.
- Admin/Vendor: lint, typecheck (vendor), tests, build.
- Storefront: lint, build (requires backend reachable + publishable key).
- Health checks for Meili and Chat in local dev.

## Good practices for AI assistance

- Prefer editing within each app’s src/ directory.
- Keep API contracts aligned with Medusa conventions and Mercur plugins.
- Use env templates as source of truth when adding env vars.
- Maintain CORS and publishable key flow when changing auth.
- Avoid modifying generated .medusa/ files; edit backend/src instead.

## Where to look for common tasks

- Backend routes: backend/src/api/\*\*/route.ts
- Workflows: backend/src/workflows
- Modules: backend/src/modules
- Subscribers: backend/src/subscribers
- Frontend routes/pages:
  - Storefront: storefront/src/app
  - Admin/Vendor: admin-panel/src/routes, vendor-panel/src/routes
- i18n: admin-panel/src/i18n, vendor-panel/src/i18n

## Special behaviors

- Medusa admin UI can be served from the backend at /app if enabled.
- Storefront publishable key is retrieved from GET /key-exchange after seeding.
- Redis URL is normalized to IPv4 localhost for Windows compatibility.

## Tooling and build

- Monorepo with pnpm for each app.
- Vite for admin/vendor, Next.js for storefront, Medusa CLI for backend.
- ESLint + Prettier across apps.

## Data & services map (local defaults)

- Backend: http://localhost:9000
- Storefront: http://localhost:3000
- Admin: http://localhost:5173
- Vendor: http://localhost:5174
- Chat: http://localhost:4010
- Postgres: 5433 (docker)
- Redis: 6379 (docker)
- Meilisearch: 7700 (docker)
