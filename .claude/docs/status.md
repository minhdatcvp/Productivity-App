# Trạng thái hiện tại

## Đã hoàn thành — Phase 1
- [x] Cấu trúc thư mục đầy đủ
- [x] SQLAlchemy models: User, UserProfile, Goal, Task, Streak, AISummary, UserLanguage, Vocabulary, GrammarNote, LanguageTest
- [x] Alembic migration `001_initial_schema.py` (đã apply)
- [x] Auth API: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- [x] JWT auth middleware (`app/core/deps.py` → `get_current_user`)
- [x] Next.js 15 App Router setup với route groups `(auth)` và `(app)`
- [x] Login/Register pages với validation và error toast
- [x] Sidebar layout + mobile bottom nav
- [x] TanStack Query + Zustand auth store
- [x] Axios client với auto-attach Bearer token

## Đã hoàn thành — Phase 2
- [x] Goal CRUD API (`api/app/routers/goals.py`)
- [x] Task CRUD API (`api/app/routers/tasks.py`)
- [x] Streak service + API (`api/app/services/streak_service.py`, `routers/streaks.py`)
- [x] FE Tasks dashboard (`web/src/app/(app)/tasks/page.tsx`)
- [x] FE Goal detail page (`web/src/app/(app)/tasks/goals/[id]/page.tsx`)
- [x] FE Streak calendar page (`web/src/app/(app)/tasks/streak/page.tsx`)
- [x] FE components: GoalCard, CreateGoalDialog, CreateTaskDialog, TaskItem, ProgressRing, DailyTaskList, FlameIcon, StreakCalendar
- [x] FE hooks: `useTasks.ts`, `useNotifications.ts`
- [x] Period utility: `web/src/lib/period.ts`

## Đã hoàn thành — Phase 3 (AI + Notifications + Rollover)
- [x] AI service (`api/app/services/ai_service.py`) — breakdown_goal, breakdown_daily, summarize_goal
- [x] AI router (`api/app/routers/ai.py`) — POST /ai/goals/{id}/breakdown, /confirm, /daily/breakdown, /daily/confirm, /goals/{id}/summarize, GET /ai/goals/{id}/summary, /ai/jobs/{id}
- [x] Celery summary worker (`api/app/workers/summary_worker.py`)
- [x] Rollover service (`api/app/services/rollover_service.py`) — daily auto-rollover + goal period rollover
- [x] Notifications router (`api/app/routers/notifications.py`) — GET /notifications (overdue, due today, due soon, active goals)
- [x] AI Pydantic schemas (`api/app/schemas/ai.py`)
- [x] FE AI components: AISummaryCard, AIGoalBreakdownDialog, AIDailyBreakdownDialog, NotificationBell, RolloverBanner

## Chưa làm — Phase 4+
- [ ] **Phase 4**: Học tập module — Catalog (AI-powered) + Templates + Subjects + SRS + Quiz
  - Xem plan chi tiết: `.claude/plans/phase4-hoc-tap.md`
  - Kiến trúc: Catalog blocks → Templates → Subjects (data-driven, không hardcode)
  - Menu mới: `/templates` (quản lý templates)
  - Settings: Tab Catalog — AI suggest blocks từ user intent, check trùng
- [ ] **Phase 5**: Deploy Vercel + Railway + responsive polish
