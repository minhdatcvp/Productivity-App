Start all development services on macOS (FastAPI, Next.js). PostgreSQL is on Neon and Redis is on Upstash — no local start needed.

Run these bash commands in sequence:

```bash
# 1. FastAPI — start in background, log to /tmp/fastapi.log
PROJECT_ROOT="/Users/dean/Code/Productivity/Productivity-App"
if lsof -ti:8000 > /dev/null 2>&1; then
  echo "[1/2] FastAPI: already running (port 8000)"
else
  cd "$PROJECT_ROOT/api" && nohup ./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/fastapi.log 2>&1 &
  sleep 2
  if lsof -ti:8000 > /dev/null 2>&1; then
    echo "[1/2] FastAPI: started (port 8000) — logs: /tmp/fastapi.log"
  else
    echo "[1/2] FastAPI: FAILED to start — check /tmp/fastapi.log"
  fi
fi

# 2. Next.js — start in background, log to /tmp/nextjs.log
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "[2/2] Next.js: already running (port 3000)"
else
  cd "$PROJECT_ROOT/web" && nohup npm run dev > /tmp/nextjs.log 2>&1 &
  sleep 4
  if lsof -ti:3000 > /dev/null 2>&1; then
    echo "[2/2] Next.js: started (port 3000) — logs: /tmp/nextjs.log"
  else
    echo "[2/2] Next.js: still starting — logs: /tmp/nextjs.log"
  fi
fi

echo ""
echo "All services:"
echo "  PostgreSQL  -> Neon (cloud)"
echo "  Redis       -> Upstash (cloud)"
echo "  FastAPI     -> http://localhost:8000"
echo "  Next.js     -> http://localhost:3000"
echo ""
echo "Tail logs:  tail -f /tmp/fastapi.log   |   tail -f /tmp/nextjs.log"
```

Report the status summary printed by the commands above.
