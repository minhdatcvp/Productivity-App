# Deployment Guide

## Stack

| Layer | Platform | Free tier |
|-------|----------|-----------|
| Frontend (Next.js) | [Vercel](https://vercel.com) | Free forever |
| Backend (FastAPI) | [Render](https://render.com) | Free (sleeps after 15 min idle, ~30s cold start) |
| PostgreSQL | [Neon](https://neon.tech) | Free (0.5 GB, no expiry) |
| Redis | [Upstash](https://upstash.com) | Free (10k commands/day) |
| Celery worker | — | Not deployed (no free tier) |

> Celery workers are not running in production. AI tasks (goal breakdown, summary) run synchronously on the API.

---

## Services to Create

### 1. Neon (PostgreSQL)
1. Create project at neon.tech → pick PostgreSQL 16+
2. Copy the connection string (asyncpg format):
   `postgresql+asyncpg://<user>:<pass>@<host>/neondb?sslmode=require`
3. Run migrations locally against Neon:
   ```bash
   cd api
   DATABASE_URL="<neon-url>" venv/bin/alembic upgrade head
   ```

### 2. Upstash (Redis)
1. Create database at upstash.com → pick region closest to Neon
2. Copy the Redis URL (starts with `rediss://`)

### 3. Groq API Key
1. Create account at console.groq.com → API Keys → Create
2. Model used: `llama-3.3-70b-versatile`

### 4. Render (FastAPI backend)
1. New → **Blueprint** → connect repo `minhdatcvp/Productivity-App`
2. Render auto-detects `render.yaml` at repo root → service name `productivity-api`
3. Fill in the 5 env vars (see below)
4. Wait for build (~3–5 min first time, Docker build)
5. **Live URL: `https://productivity-api-83jt.onrender.com`**

### 5. Vercel (Next.js frontend)
1. Import repo at vercel.com → set **Root Directory** to `web`
2. Add env var: `NEXT_PUBLIC_API_URL=https://productivity-api-83jt.onrender.com`
3. After deploy, note the Vercel URL
4. Go back to Render → update `CORS_ORIGINS` to the Vercel URL
5. **Live URL: `https://web-chi-sooty-75.vercel.app`**

---

## Render Environment Variables

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | Neon asyncpg connection string (includes `?sslmode=require`) |
| `REDIS_URL` | Upstash Redis URL (starts with `rediss://`) |
| `SECRET_KEY` | Random 64-char hex — generate with `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `GROQ_API_KEY` | From console.groq.com |
| `CORS_ORIGINS` | Vercel frontend URL, e.g. `https://your-app.vercel.app` |

> **Never commit actual credential values to git.** Share them via a password manager or secure channel.

---

## Vercel Environment Variables

| Key | Description |
|-----|-------------|
| `NEXT_PUBLIC_API_URL` | Render backend URL, e.g. `https://productivity-api.onrender.com` |

---

## Re-deploying

- **Backend**: Push to `main` → Render auto-deploys. Migrations run automatically on container start.
- **Frontend**: Push to `main` → Vercel auto-deploys.
- **Schema changes**: Add a new Alembic migration → it runs on next Render deploy.

---

## Code Changes Made for Production

| File | Change |
|------|--------|
| `api/Dockerfile` | CMD runs `alembic upgrade head` before uvicorn |
| `api/app/core/config.py` | `db_url_clean` strips `sslmode=require` (asyncpg incompatible); `db_ssl` auto-detects SSL from URL |
| `api/app/core/database.py` | Uses `settings.db_url_clean` and `settings.db_ssl` |
| `api/alembic/env.py` | Removed `python-dotenv` import; strips sslmode; passes `connect_args={"ssl": db_ssl}` |
| `render.yaml` | Render Blueprint spec at repo root |
