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

## Đã hoàn thành — Phase 4 (Học tập, data-driven)
- [x] Catalog blocks (AI suggest) + Templates + Subjects + Modules
- [x] Migration `004_learn_v2.py` (+ `006` drop learn v1)
- [x] Routers `learn_v2.py` (subjects/modules/items/SRS) + `learn_ai.py` (AI gen/quiz)
- [x] Services: `catalog_service.py`, `learning_ai_service.py`, `srs_service.py`, `learn_service.py`
- [x] FE: `/learn` grid, `/learn/[id]` tabs, các module component, `SRSSession`, `useLearn.ts`/`useLearnAI.ts`

## Đã hoàn thành — Phase 5 (Deploy)
- [x] Deploy production: Render (API, Docker) + Neon (Postgres) + Upstash (Redis) + Vercel (FE)
- [x] `render.yaml` web service + healthcheck; CORS từ Vercel URL
- (LLM hiện dùng Groq qua `app/core/llm.py`, cấu hình `groq_model`)

## Đã hoàn thành — Học tập v2 refinement (2026-06)
- [x] Từ vựng thành "hộp phân loại": Cần học thêm / Đã nhớ → tạo Flashcard có `category` (REVIEW/MEMORIZED), xoá khỏi tab vocab; dedup theo `front`. Endpoint `.../vocab/{id}/categorize`. Migration `007_flashcard_category.py`.
- [x] Flashcard: 2 danh mục; chỉ REVIEW + due được ôn (1 nút "Ôn Flashcard"). Bỏ add-card thủ công + AI panel ở tab Flashcard/Notes.
- [x] Bài tập (EXERCISE) = bài test đánh giá năng lực: AI gen đề trải đều độ khó → chấm + gán `level` lưu vào config module; AI gen nội dung calibrate theo level.
- [x] Schedule/reminders (pull): `GET /learn/reminders` (assessment-due theo cadence tuần/tháng + SRS due) → NotificationBell + badge SubjectCard; cadence chọn trong tab Bài tập.

## Đã hoàn thành — Phase 5 (Tài khoản người dùng)
- [x] BE: `PATCH /auth/me` (đổi tên), `POST /auth/change-password`; `UserResponse` thêm `created_at`
- [x] FE: tab Cài đặt → Tài khoản (`components/settings/AccountSettings.tsx`): info + đổi tên + đổi mật khẩu + đăng xuất
- [x] Store thêm `setUser`; hooks `useUpdateProfile`, `useChangePassword`

## Chưa làm / Backlog
- [ ] Xoá tài khoản (cần cascade delete dữ liệu liên quan — destructive, chưa làm)
- [ ] Cron/worker nền trên Render (Celery beat) cho nhắc qua email/push (hiện chỉ pull in-app)
- [ ] Responsive/UX polish sâu hơn cho toàn bộ trang
