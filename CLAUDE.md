# Productivity App — Claude Code Context

## Tổng quan

Web app cá nhân gồm 2 module:
1. **Task Management** — Quản lý mục tiêu ngày/tuần/tháng, streak, AI breakdown & summary
2. **Học tập** — Tạo nhiều chủ đề học tập (tiếng Anh, tiếng Hàn, Python, v.v.), SRS flashcard, AI test generation & feedback

**Plan tổng**: `.claude/plans/main-plan.md`  
**Plan Phase 4 — Học tập**: `.claude/plans/phase4-hoc-tap.md`  
**Deployment guide**: `.claude/docs/deployment.md`

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · TanStack Query · Zustand · Axios |
| Backend | Python FastAPI · SQLAlchemy 2 async · Alembic · Celery |
| Database | PostgreSQL 18 · Redis |
| AI | Groq (`llama-3.3-70b-versatile`) · OpenAI-compatible SDK (client dùng chung: `app/core/llm.py`) |
| Deploy | Vercel (FE) · Render (BE, Docker) · Neon (Postgres) · Upstash (Redis) |
| Auth | passlib/bcrypt + PyJWT + Redis sessions (self-hosted) |

---

## Cấu trúc thư mục

```
News/
├── web/                        # Next.js 15 → Vercel
│   └── src/
│       ├── app/
│       │   ├── (auth)/         # /login, /register — không cần auth
│       │   └── (app)/          # /tasks, /learn, /settings — cần auth
│       ├── components/ui/      # shadcn/ui base components
│       ├── hooks/              # TanStack Query hooks (useAuth.ts, ...)
│       ├── stores/             # Zustand (auth.ts, ...)
│       └── lib/api.ts          # Axios client → NEXT_PUBLIC_API_URL
│
├── api/                        # FastAPI → Railway
│   ├── app/
│   │   ├── core/               # config.py, database.py, redis.py, deps.py
│   │   ├── models/             # SQLAlchemy: user.py, task.py, learn_v2.py
│   │   ├── routers/            # auth.py, tasks.py, goals.py, streaks.py, ai.py, notifications.py
│   │   ├── schemas/            # Pydantic schemas: auth.py, tasks.py, ai.py
│   │   ├── services/           # auth_service.py, ai_service.py, streak_service.py, rollover_service.py
│   │   ├── workers/            # Celery: summary_worker.py, profile_worker.py
│   │   └── main.py             # FastAPI app, CORS, include routers
│   ├── alembic/versions/       # 001_initial_schema.py (đã apply)
│   ├── celery_app.py
│   ├── requirements.txt
│   ├── .env                    # local env (không commit)
│   └── .env.example
│
├── .claude/docs/               # Sub-files context cho Claude
├── start-api.ps1               # chạy FastAPI dev server
├── start-web.ps1               # chạy Next.js dev server
└── migrate.ps1                 # chạy Alembic migrations
```

---

## Key commands

```powershell
# Backend (tự động start PostgreSQL + Redis nếu chưa chạy)
.\start-api.ps1

# Frontend
cd web
npm run dev

# Migrations
.\migrate.ps1              # upgrade head
.\migrate.ps1 downgrade -1 # rollback 1

# Cài package Python mới
cd api
.\venv\Scripts\pip install <package> --prefer-binary

# Cài UI component mới
cd web
npx shadcn@latest add <component>
```

---

@.claude/docs/status.md
@.claude/docs/dev-env.md
@.claude/docs/conventions.md
@.claude/docs/feature-map.md
