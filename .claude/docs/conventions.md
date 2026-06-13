# Quy ước code

## Backend (Python)
- Router files: `app/routers/<resource>.py` — chỉ HTTP layer
- Business logic: `app/services/<resource>_service.py`
- Background AI jobs: `app/workers/<name>_worker.py` (Celery tasks)
- Mỗi router được include trong `app/main.py`
- Auth required: dùng `Depends(get_current_user)` từ `app/core/deps.py`

## Frontend (TypeScript)
- API calls: luôn qua TanStack Query hooks trong `src/hooks/`
- State UI: Zustand stores trong `src/stores/`
- Axios client: `src/lib/api.ts` — tự động attach token từ localStorage
- Redirect nếu 401: `api.ts` interceptor xử lý tự động

## AI service pattern
AI dùng **Groq** qua **OpenAI-compatible SDK**. Client dùng chung ở `app/core/llm.py`
(`get_async_client` / `get_sync_client`); base URL + model lấy từ `settings.groq_base_url` / `settings.groq_model`.

```python
# services/*.py
from app.core.config import settings
from app.core.llm import get_async_client

response = await get_async_client().chat.completions.create(
    model=settings.groq_model,
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ],
    response_format={"type": "json_object"},
)
```
