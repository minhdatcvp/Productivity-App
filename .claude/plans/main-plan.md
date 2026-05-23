# Personal Productivity App — Implementation Plan

## Context

Xây dựng từ đầu một web app cá nhân gồm 2 module chính:
1. **Task Management**: quản lý mục tiêu theo ngày/tuần/tháng, streak, AI breakdown + AI summary
2. **Language Learning**: học từ vựng SRS, ngữ pháp, AI test generation + feedback

**Stack đã chọn**: Next.js 15 (FE) + Python FastAPI (BE) + PostgreSQL + Redis + Claude API  
**Deploy**: Vercel (FE) + Railway (BE + PostgreSQL + Redis)  
**Auth**: Self-hosted — passlib (bcrypt) + PyJWT + Redis sessions

---

## Folder Structure

```
/News
├── web/                          # Next.js 15 App Router (→ Vercel)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/           # /login, /register
│   │   │   └── (app)/            # authenticated layout
│   │   │       ├── tasks/        # Task Management
│   │   │       ├── learn/        # Học tập
│   │   │       ├── templates/    # Learning Templates
│   │   │       └── settings/
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui base
│   │   │   ├── tasks/
│   │   │   └── learn/
│   │   ├── hooks/                # TanStack Query hooks
│   │   ├── stores/               # Zustand stores
│   │   └── lib/
│   │       └── api.ts            # Axios client → Railway API URL
│   ├── public/
│   ├── package.json
│   └── next.config.ts
│
├── api/                          # FastAPI backend (→ Railway)
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── tasks.py
│   │   │   ├── goals.py
│   │   │   ├── streaks.py
│   │   │   ├── ai.py
│   │   │   ├── notifications.py
│   │   │   ├── catalog.py        # Phase 4
│   │   │   ├── templates.py      # Phase 4
│   │   │   └── learn_v2.py       # Phase 4
│   │   ├── models/               # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── task.py
│   │   │   └── learn_v2.py       # Phase 4
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai_service.py
│   │   │   ├── catalog_service.py # Phase 4
│   │   │   ├── srs_service.py
│   │   │   ├── streak_service.py
│   │   │   ├── rollover_service.py
│   │   │   └── auth_service.py
│   │   ├── workers/              # Celery tasks (background AI jobs)
│   │   │   ├── summary_worker.py
│   │   │   ├── test_gen_worker.py
│   │   │   └── profile_worker.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── redis.py
│   │   └── main.py
│   ├── alembic/                  # DB migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── celery_app.py
│
└── infra/
    └── docker-compose.yml
```

---

## Database Schema (SQLAlchemy / PostgreSQL)

### Auth & User
```python
# users, sessions, user_profiles
User: id, email, password_hash, name, created_at
Session: id, user_id, expires_at  # stored in Redis, not DB
UserProfile: user_id, work_style (JSON), personality_tags (ARRAY), interactions, last_updated
```

### Task Management
```python
Goal: id, user_id, title, description, timeline (DAILY|WEEKLY|MONTHLY),
      period (str: "2026-05-18"|"2026-W20"|"2026-05"),
      target_value (int, default 100%), status, created_at

Task: id, user_id, goal_id (FK nullable), parent_id (self-ref nullable),
      title, completion_type (CHECKBOX|PERCENTAGE),
      completed_value (int nullable), due_date, order, created_at

Streak: user_id, type (DAILY|WEEKLY|MONTHLY), current, longest, last_success
        UNIQUE(user_id, type)

AISummary: goal_id (FK unique), content (JSON), created_at
           content: { summary, score, strengths[], improvements[], next_suggestions[] }
```

### Học tập — Phase 4 (xem phase4-hoc-tap.md)
```python
CatalogBlock, LearningTemplate, TemplateBlock,
Subject, SubjectModule, FlashCard, VocabItem, Note, CodeSnippet, SubjectQuiz
```

---

## API Endpoints (FastAPI)

### Auth — `/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Tạo tài khoản, hash password với bcrypt |
| POST | `/auth/login` | Tạo session, lưu Redis, trả cookie |
| POST | `/auth/logout` | Xoá session khỏi Redis |
| GET | `/auth/me` | User info từ session cookie |

### Goals & Tasks — `/goals`, `/tasks`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/goals?timeline=WEEKLY&period=2026-W20` | List goals theo period |
| POST | `/goals` | Tạo goal |
| PUT | `/goals/{id}` | Cập nhật |
| GET | `/goals/{id}/tasks` | Tasks của goal |
| POST | `/tasks` | Tạo task thủ công |
| PATCH | `/tasks/{id}/complete` | Cập nhật completion (checkbox/%) |
| GET | `/streaks` | Streak data của user |

### AI — `/ai`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/goals/{id}/breakdown` | Claude breakdown goal → subtasks |
| POST | `/ai/daily/breakdown` | Claude breakdown daily task |
| POST | `/ai/goals/{id}/summarize` | Enqueue Celery job → trả job_id |
| GET | `/ai/goals/{id}/summary` | Lấy AI summary đã gen |
| GET | `/ai/jobs/{job_id}` | Poll job status + result |

### Notifications — `/notifications`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | Overdue, due today, due soon, active goals |

### Học tập — Phase 4 (xem phase4-hoc-tap.md)
`/settings/catalog`, `/templates`, `/learn/subjects`, `/learn/subjects/{id}/modules/{module_id}`

---

## AI Integration (Claude API — `anthropic` Python SDK)

### Pattern chung: Prompt Caching
```python
# ai_service.py
response = client.messages.create(
    model="claude-sonnet-4-6",
    system=[
        {"type": "text", "text": STATIC_INSTRUCTIONS,
         "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": json.dumps(user_profile),
         "cache_control": {"type": "ephemeral"}},
    ],
    messages=[{"role": "user", "content": user_message}]
)
```

### AI Use Cases

| Use Case | Trigger | Sync/Async | Output |
|----------|---------|------------|--------|
| Goal Breakdown | User click "AI Breakdown" | Sync (~2-3s) | JSON array subtasks → insert to DB |
| Daily Breakdown | User click "AI Breakdown" daily | Sync | JSON array tasks |
| Period Summary | Manual hoặc cuối period | Async (Celery) | `AISummary.content` JSON |
| User Profile Update | Sau mỗi goal completion | Async (Celery) | Update `UserProfile` JSON |
| Catalog Suggest | User nhập learning intent | Sync | JSON array block suggestions |
| Subject Quiz Gen | Manual | Async (Celery) | `SubjectQuiz.questions` JSON |
| Quiz Feedback | User submit quiz | Sync (~3-5s) | `SubjectQuiz.ai_feedback` JSON |

---

## Key UI Screens

| Screen | Path | Mô tả |
|--------|------|-------|
| Dashboard | `/tasks` | Timeline switcher, goal cards, streak counter |
| Goal Detail | `/tasks/goals/[id]` | Task list, AI Breakdown, completion sliders |
| Streak | `/tasks/streak` | Streak calendar |
| Học tập Grid | `/learn` | Subject cards, due count |
| Subject Detail | `/learn/[id]` | Tabs theo modules |
| Templates | `/templates` | Template list + create/edit |
| Settings | `/settings` | Catalog tab + cài đặt |

---

## Implementation Phases

### Phase 1 — Foundation ✅ DONE
- Next.js 15 + FastAPI setup
- Auth: register/login/me + JWT + Redis sessions
- FE: login/register, sidebar layout, Zustand + TanStack Query

### Phase 2 — Task Management ✅ DONE
- Goal/Task CRUD API
- Streak service
- FE: Dashboard, Goal Detail, Streak calendar
- Rollover service + Notifications

### Phase 3 — AI ✅ DONE
- ai_service.py (breakdown_goal, breakdown_daily, summarize_goal)
- AI router + Celery summary worker
- FE: AIGoalBreakdownDialog, AIDailyBreakdownDialog, AISummaryCard, NotificationBell, RolloverBanner

### Phase 4 — Học tập ⬜ TODO
- Catalog (AI-powered) + Templates + Subjects + SRS + Quiz
- Xem chi tiết: `.claude/plans/phase4-hoc-tap.md`

### Phase 5 — Deploy ⬜ TODO
- Vercel (FE) + Railway (BE + DB)
- Responsive polish
- Cron jobs cho auto-summary + quiz gen

---

## Critical Files

| File | Vai trò |
|------|---------|
| `api/app/core/database.py` | SQLAlchemy async engine + session factory |
| `api/app/services/ai_service.py` | Claude API wrapper, prompt caching |
| `api/app/services/streak_service.py` | Logic tính streak theo period |
| `api/app/services/rollover_service.py` | Daily auto-rollover + goal period rollover |
| `api/alembic/` | DB migrations — source of truth cho schema |
| `web/src/lib/api.ts` | Axios client với base URL từ env var |
| `web/src/hooks/` | TanStack Query hooks (data fetching layer) |
