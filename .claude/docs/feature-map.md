# Feature Map

> Tra cứu nhanh: feature nằm ở đâu → đọc đúng file, không scan cả project.

## Auth
| Layer | File |
|-------|------|
| API router | `api/app/routers/auth.py` |
| Business logic | `api/app/services/auth_service.py` |
| DB model | `api/app/models/user.py` → `User`, `UserProfile` |
| Pydantic schema | `api/app/schemas/auth.py` |
| Auth middleware | `api/app/core/deps.py` → `get_current_user` |
| FE pages | `web/src/app/(auth)/login/page.tsx`, `register/page.tsx` |
| FE hook | `web/src/hooks/useAuth.ts` |
| FE store | `web/src/stores/auth.ts` |

## Goals & Tasks (Task Management)
| Layer | File |
|-------|------|
| API router — goals | `api/app/routers/goals.py` |
| API router — tasks | `api/app/routers/tasks.py` |
| DB model | `api/app/models/task.py` → `Goal`, `Task`, `AISummary` |
| Pydantic schema | `api/app/schemas/tasks.py` |
| FE pages | `web/src/app/(app)/tasks/page.tsx`, `tasks/goals/[id]/page.tsx` |
| FE hook | `web/src/hooks/useTasks.ts` |
| FE components | `web/src/components/tasks/` → `GoalCard`, `CreateGoalDialog`, `CreateTaskDialog`, `TaskItem`, `ProgressRing`, `DailyTaskList`, `FlameIcon`, `StreakCalendar` |

## Streak
| Layer | File |
|-------|------|
| API router | `api/app/routers/streaks.py` |
| Business logic | `api/app/services/streak_service.py` |
| DB model | `api/app/models/task.py` → `Streak` |
| FE page | `web/src/app/(app)/tasks/streak/page.tsx` |
| FE component | `web/src/components/tasks/StreakCalendar.tsx` |

## AI Features
| Layer | File |
|-------|------|
| API router | `api/app/routers/ai.py` |
| Business logic | `api/app/services/ai_service.py` |
| Pydantic schema | `api/app/schemas/ai.py` |
| DB model | `api/app/models/task.py` → `AISummary` |
| Celery worker — summary | `api/app/workers/summary_worker.py` |
| Celery worker — profile | `api/app/workers/profile_worker.py` |
| FE components | `web/src/components/tasks/` → `AISummaryCard`, `AIGoalBreakdownDialog`, `AIDailyBreakdownDialog` |

## Notifications & Rollover
| Layer | File |
|-------|------|
| API router | `api/app/routers/notifications.py` → `GET /notifications` |
| Rollover service | `api/app/services/rollover_service.py` — daily auto-rollover + goal period rollover |
| FE components | `web/src/components/tasks/` → `NotificationBell`, `RolloverBanner` |
| FE hook | `web/src/hooks/useNotifications.ts` |

## Language Learning (Phase 4 — chưa implement)
| Layer | File |
|-------|------|
| API router | `api/app/routers/` → `learn.py` *(chưa tạo)* |
| SRS service | `api/app/services/srs_service.py` *(chưa tạo)* |
| DB model | `api/app/models/learn.py` → `UserLanguage`, `Vocabulary`, `GrammarNote`, `LanguageTest` |
| Celery worker — test gen | `api/app/workers/test_gen_worker.py` |
| FE page | `web/src/app/(app)/learn/page.tsx` |

## Infrastructure / Shared
| Layer | File |
|-------|------|
| DB connection | `api/app/core/database.py` |
| Redis client | `api/app/core/redis.py` |
| App config / env | `api/app/core/config.py` |
| Celery app | `api/celery_app.py` |
| Axios client | `web/src/lib/api.ts` |
| TanStack + Zustand providers | `web/src/components/providers.tsx` |
| App entry | `api/app/main.py` |
