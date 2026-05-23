# Start FastAPI backend (auto-starts PostgreSQL and Redis if not running)

# --- PostgreSQL ---
$pgStatus = & "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" status -D "C:\Program Files\PostgreSQL\18\data" 2>&1
if ($pgStatus -notmatch "server is running") {
    Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" `
        -ArgumentList 'start -D "C:\Program Files\PostgreSQL\18\data"' `
        -Verb RunAs -Wait
    Start-Sleep -Seconds 3
}
Write-Host "PostgreSQL: OK" -ForegroundColor Green

# --- Redis ---
$redisPong = redis-cli ping 2>&1
if ($redisPong -ne "PONG") {
    Write-Host "Starting Redis..." -ForegroundColor Yellow
    Start-Process "C:\ProgramData\chocolatey\bin\redis-server.exe" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
Write-Host "Redis: OK" -ForegroundColor Green

# --- FastAPI ---
Write-Host "Starting FastAPI on http://localhost:8000" -ForegroundColor Cyan
Set-Location "$PSScriptRoot\api"
.\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
