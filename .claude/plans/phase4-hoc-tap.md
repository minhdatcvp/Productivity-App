# Phase 4 — Học tập Module (Redesign)

> Thay thế "Language Learning" cũ (hardcoded ngôn ngữ) bằng hệ thống học tập linh hoạt  
> dựa trên Catalog → Template → Subject.

---

## Kiến trúc tổng quan

```
Catalog (Settings)         Templates (/templates)      Subjects (/learn)
──────────────────         ──────────────────────      ─────────────────
Block types (AI gen) ──→   Template = [blocks]    ──→  Subject = template + data
  • Flashcard SRS           e.g. Language              e.g. "English", "Python"
  • Vocabulary                   = [Vocab, Flash,
  • Notes                          Notes, Quiz]
  • Code Snippet
  • Quiz (AI)
  • Exercise
  • (user-defined...)
```

---

## Menu navigation (thêm mới)

```typescript
const nav = [
  { href: "/tasks",     label: "Công việc",  icon: CheckSquare },
  { href: "/learn",     label: "Học tập",    icon: BookOpen    },
  { href: "/templates", label: "Templates",  icon: LayoutTemplate }, // NEW
  { href: "/settings",  label: "Cài đặt",    icon: Settings    },
]
```

---

## DB Schema (thêm mới — migration 002)

```python
CatalogBlock:
  id          UUID PK
  user_id     FK → users (nullable = system block)
  name        str          # "Flashcard SRS", "Code Snippet"
  description str
  icon        str          # lucide icon name
  block_type  enum         # FLASHCARD | VOCABULARY | NOTES | CODE_SNIPPET | QUIZ | EXERCISE
  is_system   bool default False
  created_at  datetime
  UNIQUE(user_id, name)    # tránh trùng per user + system

LearningTemplate:
  id          UUID PK
  user_id     FK → users
  name        str          # "Ngôn ngữ", "Lập trình"
  description str
  created_at  datetime

TemplateBlock:
  id           UUID PK
  template_id  FK → learning_templates
  block_id     FK → catalog_blocks
  order        int
  UNIQUE(template_id, block_id)

Subject:
  id           UUID PK
  user_id      FK → users
  template_id  FK → learning_templates (nullable — custom)
  name         str     # "English", "Python", "Korean"
  icon         str     # emoji hoặc lucide
  color        str     # hex
  created_at   datetime

SubjectModule:
  id          UUID PK
  subject_id  FK → subjects
  block_id    FK → catalog_blocks
  order       int
  config      JSONB    # module-level settings (e.g. daily_goal, srs_settings)
  created_at  datetime
  UNIQUE(subject_id, block_id)

# SRS data (link tới SubjectModule)
FlashCard:
  id              UUID PK
  subject_mod_id  FK → subject_modules
  front           str
  back            str
  ease_factor     float default 2.5
  interval        int default 1   # days
  repetitions     int default 0
  next_review     datetime
  last_review     datetime nullable

VocabItem:
  id              UUID PK
  subject_mod_id  FK → subject_modules
  word            str
  meaning         str
  pronunciation   str nullable
  example         str nullable
  tags            ARRAY[str]
  ease_factor, interval, repetitions, next_review, last_review  # SM-2

Note:
  id              UUID PK
  subject_mod_id  FK → subject_modules
  title           str
  content         text   # markdown
  tags            ARRAY[str]
  updated_at      datetime

CodeSnippet:
  id              UUID PK
  subject_mod_id  FK → subject_modules
  title           str
  language        str    # "python", "javascript"
  code            text
  explanation     text nullable
  tags            ARRAY[str]

SubjectQuiz:
  id              UUID PK
  subject_mod_id  FK → subject_modules
  questions       JSONB
  answers         JSONB nullable
  score           int nullable
  ai_feedback     JSONB nullable
  status          enum  PENDING | IN_PROGRESS | COMPLETED
  created_at      datetime
```

---

## API Endpoints

### Catalog — `/settings/catalog`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings/catalog` | Danh sách blocks (system + của user) |
| POST | `/settings/catalog/suggest` | AI suggest blocks từ user intent |
| POST | `/settings/catalog` | Tạo block mới (sau khi user confirm AI suggest) |
| DELETE | `/settings/catalog/{id}` | Xóa block (chỉ block user tạo, không xóa system) |

### Templates — `/templates`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates` | Danh sách templates của user |
| POST | `/templates` | Tạo template (name + block_ids[]) |
| PUT | `/templates/{id}` | Cập nhật template |
| DELETE | `/templates/{id}` | Xóa template |

### Subjects — `/learn`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/learn/subjects` | Danh sách subjects của user |
| POST | `/learn/subjects` | Tạo subject (gán template_id) |
| GET | `/learn/subjects/{id}` | Subject detail + modules |
| DELETE | `/learn/subjects/{id}` | Xóa subject |

### Subject Modules — `/learn/subjects/{id}/modules/{module_id}`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/learn/subjects/{id}/modules/{module_id}/items` | List items |
| POST | `/learn/subjects/{id}/modules/{module_id}/items` | Tạo item |
| PATCH | `/learn/subjects/{id}/modules/{module_id}/items/{item_id}` | Cập nhật |
| DELETE | `/learn/subjects/{id}/modules/{module_id}/items/{item_id}` | Xóa |
| GET | `/learn/subjects/{id}/modules/{module_id}/due` | SRS due items hôm nay |
| POST | `/learn/subjects/{id}/modules/{module_id}/review` | Submit SRS rating → SM-2 |

### AI Quiz — `/learn/subjects/{id}/quiz`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/learn/subjects/{id}/quiz/generate` | AI gen quiz từ content của subject |
| POST | `/learn/subjects/{id}/quiz/{quiz_id}/submit` | Submit → AI feedback |

---

## AI Flow: Catalog Suggest

```
User input: "tôi muốn học python"
     ↓
POST /settings/catalog/suggest { query: "tôi muốn học python" }
     ↓
ai_service.suggest_catalog_blocks(query, existing_blocks[])
     ↓  Claude trả về JSON array:
     [
       { name: "Code Snippet", block_type: "CODE_SNIPPET", description: "...", icon: "code" },
       { name: "Khái niệm",    block_type: "NOTES",        description: "...", icon: "file-text" },
       { name: "Quiz lập trình", block_type: "QUIZ",       description: "...", icon: "help-circle" },
     ]
     ↓  Server check trùng (exact name match + block_type match)
     ↓  Trả về: { suggestions: [...], duplicates: [...] }
     ↓
FE hiển thị: ✓ thêm mới | ⚠ đã tồn tại (skip)
User confirm → POST /settings/catalog (batch create)
```

**Prompt pattern (với caching):**
```python
CATALOG_SYSTEM = """
Bạn là assistant giúp user xây dựng catalog học tập.
Khi nhận được mô tả học tập, hãy đề xuất các loại block phù hợp.
Trả về JSON array với fields: name, block_type, description, icon (lucide icon name).
block_type chỉ được là: FLASHCARD | VOCABULARY | NOTES | CODE_SNIPPET | QUIZ | EXERCISE
"""

suggest_catalog_blocks(query, existing: list[str]):
  # existing = tên các block đã có → đưa vào prompt để AI tự avoid duplicate
  user_msg = f"Query: {query}\nBlocks đã có: {existing}\nChỉ suggest blocks CHƯA có."
```

---

## UI Pages

### `/settings` → Tab "Catalog"
```
Catalog blocks của bạn

[ 🤖 AI Suggest... ]   (input: "tôi muốn học python" → preview suggestions)

System blocks:           User blocks:
• Flashcard SRS          • Code Snippet  [xóa]
• Vocabulary             • Khái niệm     [xóa]
• Notes
• Quiz
```

### `/templates`
```
Templates của bạn               [ + Tạo template ]

┌──────────────┐  ┌──────────────┐
│  Ngôn ngữ    │  │  Lập trình   │
│  4 blocks    │  │  3 blocks    │
│  [Sửa][Xóa] │  │  [Sửa][Xóa] │
└──────────────┘  └──────────────┘

── Create/Edit Template ──────────────────────
  Tên: [____________]
  Chọn blocks:
  ☑ Vocabulary      ☑ Flashcard SRS
  ☑ Notes           ☐ Code Snippet
  ☑ Quiz            ☐ Exercise
  [Lưu template]
```

### `/learn` — Subject Grid
```
Học tập                          [ + Tạo môn học ]

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 🇬🇧 English  │  │ 🐍 Python   │  │ 🇰🇷 Korean   │
│ Ngôn ngữ    │  │ Lập trình   │  │ Ngôn ngữ    │
│ 124 thẻ SRS │  │ 38 snippets │  │ 0 items     │
│ 5 due today │  │ 0 due       │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

### `/learn/[id]` — Subject Detail
```
🇬🇧 English  · Ngôn ngữ               [ Luyện SRS → ]

[ Từ vựng ] [ Flashcard ] [ Ngữ pháp ] [ Quiz ]

── Tab đang active ──────────────────────────────
  (nội dung module tương ứng)
```

---

## File map (files cần tạo mới)

### Backend
| File | Nội dung |
|------|----------|
| `api/app/models/learn_v2.py` | CatalogBlock, LearningTemplate, TemplateBlock, Subject, SubjectModule, FlashCard, VocabItem, Note, CodeSnippet, SubjectQuiz |
| `api/app/routers/catalog.py` | Catalog CRUD + AI suggest |
| `api/app/routers/templates.py` | Template CRUD |
| `api/app/routers/learn_v2.py` | Subject + Module + SRS + Quiz |
| `api/app/services/catalog_service.py` | AI suggest logic |
| `api/app/services/srs_service.py` | SM-2 algorithm |
| `api/app/schemas/learn_v2.py` | Pydantic schemas |
| `alembic/versions/002_learn_v2.py` | Migration |

### Frontend
| File | Nội dung |
|------|----------|
| `web/src/app/(app)/learn/page.tsx` | Subject grid |
| `web/src/app/(app)/learn/[id]/page.tsx` | Subject detail + tabs |
| `web/src/app/(app)/templates/page.tsx` | Template list + create/edit |
| `web/src/app/(app)/settings/page.tsx` | Thêm tab Catalog |
| `web/src/components/learn/SubjectCard.tsx` | Card trong grid |
| `web/src/components/learn/CreateSubjectDialog.tsx` | Tạo subject |
| `web/src/components/learn/TemplateEditor.tsx` | Tạo/sửa template |
| `web/src/components/learn/CatalogManager.tsx` | Settings catalog UI |
| `web/src/components/learn/modules/VocabModule.tsx` | Vocab tab |
| `web/src/components/learn/modules/FlashcardModule.tsx` | Flashcard tab |
| `web/src/components/learn/modules/NotesModule.tsx` | Notes tab |
| `web/src/components/learn/modules/CodeModule.tsx` | Code snippet tab |
| `web/src/components/learn/modules/QuizModule.tsx` | Quiz tab |
| `web/src/components/learn/SRSSession.tsx` | Full-screen SRS luyện tập |
| `web/src/hooks/useLearn.ts` | TanStack Query hooks |

---

## Thứ tự implement

1. **Migration 002** — thêm bảng mới (giữ bảng cũ để không break)
2. **Catalog API** — CRUD + AI suggest endpoint
3. **Templates API** — CRUD
4. **Subjects + Modules API** — CRUD + SRS
5. **Settings UI** — Tab Catalog + AI suggest flow
6. **Templates page** — list + create/edit
7. **Learn page** — subject grid + create dialog
8. **Subject detail** — tabs + từng module component
9. **SRS session** — full-screen luyện tập
10. **AI Quiz** — generate + submit + feedback
