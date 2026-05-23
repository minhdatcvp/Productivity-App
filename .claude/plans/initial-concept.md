# Plan: Personal Productivity & Language Learning Web App

## Context
Xây dựng web app cá nhân phục vụ 2 mục đích chính:
1. Quản lý công việc/mục tiêu cá nhân theo ngày/tuần/tháng với AI support
2. Học ngôn ngữ mới (từ vựng, ngữ pháp, quiz định kỳ)

App cần responsive (desktop + mobile), dễ scale, UI đơn giản.

> **Note**: Đây là concept ban đầu — stack đã thay đổi (Next.js 15 + FastAPI + Claude API).  
> Xem `main-plan.md` để biết plan hiện tại.

---

## Tech Stack

| Layer | Công nghệ | Lý do |
|-------|-----------|-------|
| Framework | **Next.js 14** (App Router, TypeScript) | Full-stack, SSR, deploy dễ |
| UI | **TailwindCSS + shadcn/ui** | Components sẵn, responsive |
| Database | **Supabase** (PostgreSQL) | Free tier, có Auth + Realtime |
| ORM | **Prisma** | Type-safe, dễ migrate |
| AI | **Google Gemini API** (gemini-1.5-flash) | Free tier 1500 req/day |
| Auth | **Supabase Auth** | Built-in, free |
| Deploy | **Vercel** | Free, tích hợp Next.js |

---

## Kiến trúc tổng quan

```
src/
├── app/
│   ├── (auth)/          # login, register
│   ├── dashboard/       # trang chủ, overview hôm nay
│   ├── tasks/           # quản lý tasks daily/weekly/monthly
│   ├── goals/           # mục tiêu lớn + AI plan
│   ├── languages/       # học ngôn ngữ
│   │   └── [lang]/      # tiếng anh, tiếng hàn,...
│   └── profile/         # user profile + AI memory
├── components/
├── lib/
│   ├── ai/              # Gemini API helpers
│   ├── db/              # Prisma client
│   └── supabase/        # Supabase client
└── prisma/
    └── schema.prisma
```

---

## Database Schema (Prisma)

### Core
- **users** — id, email, name, created_at
- **user_profiles** — user_id, work_style, personality_notes, ai_summary (AI memory)

### Task Management
- **goals** — id, user_id, title, type (daily/weekly/monthly/yearly), target_date, status
- **tasks** — id, goal_id, user_id, title, date, completion_rate (0-100), completed_at
- **streaks** — user_id, type, current_count, longest_count, last_completed_date
- **ai_evaluations** — id, user_id, period_type, period_date, content, score

### Language Learning
- **language_configs** — user_id, language, daily_word_goal, quiz_interval_days, active
- **vocabulary** — id, user_id, language, word, meaning, example, learned_at
- **quiz_sessions** — id, user_id, language, score, total, created_at
- **quiz_items** — id, session_id, word_id, user_answer, correct

---

## Modules chi tiết

### 1. Dashboard
- Tổng quan hôm nay: tasks pending, streak count, ngôn ngữ cần học
- Quick-add task
- AI daily briefing (tóm tắt + motivate)

### 2. Task Manager
- **Daily view**: list tasks, checkbox hoặc slider % hoàn thành
- **Weekly/Monthly view**: progress bar theo goal
- **Streak tracker**: chuỗi ngày hoàn thành mục tiêu
- **End-of-day AI eval**: Gemini tổng hợp kết quả, đánh giá, gợi ý ngày mai
- **Big goal → AI breakdown**: user nhập mục tiêu lớn → Gemini research + user profile → sinh plan cụ thể có thể chỉnh sửa

### 3. Language Learning
- **Language selector**: thêm ngôn ngữ mới (scalable)
- **Vocabulary module**: thêm từ mới, review, mark learned
- **Daily word goal**: hệ thống gợi ý 10 từ/ngày via Gemini
- **Grammar notes**: editor tự do
- **Quiz engine**: Gemini sinh câu hỏi từ vocabulary đã học, chấm điểm
- **Quiz scheduler**: cấu hình tần suất (mỗi tuần 1 bài)
- **AI feedback**: sau quiz, Gemini phân tích điểm yếu, gợi ý ôn tập

### 4. AI Memory (User Profile)
- Sau mỗi evaluation, Gemini cập nhật profile: cách làm việc, điểm mạnh/yếu
- Profile này được đưa vào context mỗi khi AI tạo plan mới

---

## Thứ tự build (MVP → Scale)

### Phase 1 — MVP (2-3 tuần)
1. Setup Next.js + Supabase + Prisma
2. Auth (login/register)
3. Daily task CRUD + completion tracking
4. Streak counter
5. Gemini integration — end-of-day evaluation

### Phase 2 — Core Features (2-3 tuần)
6. Weekly/monthly goals
7. Big goal → AI breakdown + editable plan
8. Language learning module (vocabulary + daily words)
9. Quiz engine

### Phase 3 — Polish & Scale
10. AI user profile memory
11. Multi-language support
12. Mobile optimization
13. Notifications (email hoặc push)
