# Production Deployment Guide

This repo is a multi-app marketplace:

- Backend (Medusa/Mercur) — Node.js API (`/backend`)
- Storefront — Next.js (`/storefront`)
- Admin Panel — Vite SPA (`/admin-panel`)
- Vendor Panel — Vite SPA (`/vendor-panel`)
- Chat Service — Node.js + WebSocket (`/chat`)
- Infra — Postgres + Redis + Meilisearch

The main production goal is to **separate concerns**:

- One managed Postgres for all persistent data (backend + chat)
- One managed Redis for background jobs/session/cache
- One Meilisearch instance for search
- Backend API hosted on a platform that supports long-running Node processes + background workers
- Frontends hosted on CDN/static hosting (storefront on Next platform)
- Chat hosted on a platform that supports WebSockets

## Recommended “good defaults”

### Data layer

- **Postgres**: Neon, Supabase, AWS RDS, Railway Postgres
  - If you want cost/perf: Neon (serverless) is a great starting point.
  - Make sure to enable connection pooling (platform feature or PgBouncer) if you see too many connections.

- **Redis**: Upstash Redis (managed) or Redis Cloud
  - Backend uses Redis for queues/caching.

- **Object storage** (images/files): S3-compatible
  - AWS S3, Cloudflare R2, Tigris, or MinIO (self-hosted)

### Search

- **Meilisearch**:
  - Self-host on Fly.io / Render / a small VM (Hetzner, DigitalOcean)
  - Or use Meilisearch Cloud (managed)

Notes:

- Put Meilisearch behind a private network if possible.
- If you expose it publicly, use auth keys and restrict CORS.

### Backend hosting

Good options:

- **Fly.io** (solid for long-running Node + networking)
- **Railway** (fast setup; can be more expensive at scale)
- **Render** (simple web services)
- **AWS ECS/Fargate** (most control; more ops)

Backend needs:

- `DATABASE_URL` (managed Postgres)
- `REDIS_URL` (managed Redis)
- `JWT_SECRET` + `COOKIE_SECRET`
- CORS configured for your deployed domains
- `MEILI_HOST` pointing to your Meilisearch

### Frontends

- **Storefront (Next.js)**: Vercel is the easiest default.
  - Alternative: Cloudflare Pages (Next support depends on runtime), Netlify, or a Node host.

- **Admin/Vendor (Vite)**: static hosting works great
  - Vercel, Cloudflare Pages, Netlify

Important: Vite env vars are **baked at build-time**.

### Chat service

The chat service uses HTTP + WebSockets.

- Host it on: Fly.io / Render / Railway / any VM
- Don’t host it on Vercel (WebSockets are not supported as a long-lived server)

Environment variables:

- `PORT`
- `CHAT_DATABASE_URL` (can be the same Postgres as backend)
- `CORS_ORIGIN` (comma-separated list of allowed frontend origins)

## Suggested production topology

A practical, cost-effective layout:

- Postgres on Neon (or Supabase)
- Redis on Upstash
- Meilisearch on Fly.io (private if possible)
- Backend on Fly.io or Railway
- Chat on Fly.io or Railway (WebSockets)
- Storefront on Vercel
- Admin/Vendor on Vercel or Cloudflare Pages

## Environment variable map

### Storefront (Vercel)

- `MEDUSA_BACKEND_URL=https://api.yourdomain.com`
- `NEXT_PUBLIC_BASE_URL=https://shop.yourdomain.com`
- `NEXT_PUBLIC_CHAT_URL=https://chat.yourdomain.com`
- `NEXT_PUBLIC_MEILI_URL=https://search.yourdomain.com` (or omit if not using client-side Meili)

### Admin panel (static hosting)

- `VITE_MEDUSA_BACKEND_URL=https://api.yourdomain.com`
- `VITE_MEDUSA_STOREFRONT_URL=https://shop.yourdomain.com`
- `VITE_CHAT_URL=https://chat.yourdomain.com`

### Vendor panel (static hosting)

- `VITE_MEDUSA_BACKEND_URL=https://api.yourdomain.com`
- `VITE_MEDUSA_STOREFRONT_URL=https://shop.yourdomain.com`
- `VITE_CHAT_URL=https://chat.yourdomain.com`

### Backend

- `DATABASE_URL=...`
- `REDIS_URL=...`
- `MEILI_HOST=...`
- `MEILI_INDEX_PRODUCTS=products`
- `STORE_CORS=https://shop.yourdomain.com`
- `ADMIN_CORS=https://admin.yourdomain.com`
- `VENDOR_CORS=https://vendor.yourdomain.com`
- `AUTH_CORS=...` (all of the above)

## Operational notes

- Add a reverse-proxy (Cloudflare / Nginx / Traefik) to route:
  - `api.yourdomain.com` → backend
  - `chat.yourdomain.com` → chat service
  - `shop.yourdomain.com` → storefront
  - `admin.yourdomain.com` → admin panel
  - `vendor.yourdomain.com` → vendor panel

- Ensure WebSocket upgrade works on `chat.yourdomain.com`.

- If you run Meilisearch publicly, configure:
  - auth keys
  - CORS
  - rate limiting

- For DB migrations/seed/admin user:
  - run these as one-off jobs in your backend host platform.
