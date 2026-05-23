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
```python
# ai_service.py — luôn dùng prompt caching cho system prompt
response = client.messages.create(
    model="claude-sonnet-4-6",
    system=[
        {"type": "text", "text": STATIC_INSTRUCTIONS, "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": json.dumps(user_profile), "cache_control": {"type": "ephemeral"}},
    ],
    messages=[{"role": "user", "content": user_message}]
)
```
