# Môi trường dev (Windows 11)

## Python backend
- **Python 3.14** — dùng venv tại `api/venv/`
- Cài packages: `.\venv\Scripts\pip install ... --prefer-binary` (bắt buộc vì Python 3.14 thiếu wheels)
- Chạy: `.\venv\Scripts\uvicorn app.main:app --reload --port 8000`
- **VS Code interpreter**: set thành `api/venv/Scripts/python.exe`

## Node.js frontend
- Node.js (latest) — `npm` làm package manager
- Chạy: `npm run dev` trong `web/`
- Build: `npm run build`

## PostgreSQL (đã setup)
- **PostgreSQL 18.4** — cài tại `C:\Program Files\PostgreSQL\18\`
- Password: `123456`, port: `5432`, user: `postgres`
- Database: `productivity_db` (đã tạo, migration 001 đã apply)
- **Start**: `Start-Process "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -ArgumentList 'start -D "C:\Program Files\PostgreSQL\18\data"' -Verb RunAs -Wait`
- Chưa register Windows service — phải start thủ công mỗi lần reboot
- `database.py` dùng `connect_args={"ssl": False}` để tránh lỗi SSL với asyncpg

## Redis (đã setup)
- **Redis 8.6.3** — cài via Chocolatey tại `C:\ProgramData\chocolatey\bin\redis-server.exe`
- **Start**: `Start-Process "C:\ProgramData\chocolatey\bin\redis-server.exe" -WindowStyle Hidden`
- Verify: `redis-cli ping` → `PONG`

## bcrypt note
- `passlib` không tương thích với `bcrypt` 5.x — phải dùng `bcrypt==4.2.1`
- Warning `(trapped) error reading bcrypt version` là vô hại, không ảnh hưởng đến hash/verify

## Env variables

### api/.env
```
DATABASE_URL=postgresql+asyncpg://postgres:123456@localhost:5432/productivity_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=dev-secret-key-change-in-production
ANTHROPIC_API_KEY=<your-key>
CORS_ORIGINS=http://localhost:3000
```

### web/.env.local
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
