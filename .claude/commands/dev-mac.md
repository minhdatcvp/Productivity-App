Start all development services on macOS (PostgreSQL, Redis, FastAPI, Next.js).

Run these bash commands in sequence:

```bash
# 1. PostgreSQL — managed by Homebrew
if pg_isready -q; then
  echo "[1/4] PostgreSQL: already running (port 5432)"
else
  brew services start postgresql@18
  sleep 2
  echo "[1/4] PostgreSQL: started (port 5432)"
fi

# 2. Redis — managed by Homebrew
if redis-cli ping 2>/dev/null | grep -q PONG; then
  echo "[2/4] Redis: already running (port 6379)"
else
  brew services start redis
  sleep 1
  echo "[2/4] Redis: started (port 6379)"
fi

# 3. FastAPI — start in background, log to /tmp/fastapi.log
PROJECT_ROOT="/Users/dean/Code/Productivity/Productivity-App"
if lsof -ti:8000 > /dev/null 2>&1; then
  echo "[3/4] FastAPI: already running (port 8000)"
else
  cd "$PROJECT_ROOT/api" && nohup ./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/fastapi.log 2>&1 &
  sleep 2
  if lsof -ti:8000 > /dev/null 2>&1; then
    echo "[3/4] FastAPI: started (port 8000) — logs: /tmp/fastapi.log"
  else
    echo "[3/4] FastAPI: FAILED to start — check /tmp/fastapi.log"
  fi
fi

# 4. Next.js — start in background, log to /tmp/nextjs.log
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "[4/4] Next.js: already running (port 3000)"
else
  cd "$PROJECT_ROOT/web" && nohup npm run dev > /tmp/nextjs.log 2>&1 &
  sleep 4
  if lsof -ti:3000 > /dev/null 2>&1; then
    echo "[4/4] Next.js: started (port 3000) — logs: /tmp/nextjs.log"
  else
    echo "[4/4] Next.js: still starting — logs: /tmp/nextjs.log"
  fi
fi

echo ""
echo "All services:"
echo "  PostgreSQL  -> localhost:5432"
echo "  Redis       -> localhost:6379"
echo "  FastAPI     -> http://localhost:8000"
echo "  Next.js     -> http://localhost:3000"
echo ""
echo "Tail logs:  tail -f /tmp/fastapi.log   |   tail -f /tmp/nextjs.log"
```

Report the status summary printed by the commands above.
