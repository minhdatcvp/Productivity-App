# Start all development services: PostgreSQL, Redis, FastAPI, Next.js

$root = "c:\Users\Crossian LLC\Desktop\dat\News"

# --- PostgreSQL ---
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$pgData = "C:\Program Files\PostgreSQL\18\data"
$pgStatus = & $pgCtl status -D $pgData 2>&1
if ($pgStatus -notmatch "server is running") {
    Write-Host "[1/4] Starting PostgreSQL... (UAC prompt will appear)" -ForegroundColor Yellow
    Start-Process $pgCtl -ArgumentList "start -D `"$pgData`"" -Verb RunAs -Wait
    Start-Sleep -Seconds 3
}
Write-Host "[1/4] PostgreSQL: OK (port 5432)" -ForegroundColor Green

# --- Redis ---
$redisPong = redis-cli ping 2>&1
if ($redisPong -ne "PONG") {
    Write-Host "[2/4] Starting Redis..." -ForegroundColor Yellow
    Start-Process "C:\ProgramData\chocolatey\bin\redis-server.exe" -WindowStyle Hidden
    Start-Sleep -Seconds 2
    $redisPong = redis-cli ping 2>&1
}
Write-Host "[2/4] Redis: OK (port 6379)" -ForegroundColor Green

# --- FastAPI ---
Write-Host "[3/4] Opening FastAPI tab..." -ForegroundColor Cyan
$beCmd = "Set-Location '$root\api'; .\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
$beEncoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($beCmd))
Start-Process wt -ArgumentList "new-tab --title `"FastAPI`" powershell -NoExit -EncodedCommand $beEncoded"

# --- Next.js ---
Write-Host "[4/4] Opening Next.js tab..." -ForegroundColor Cyan
$feCmd = "Set-Location '$root\web'; npm run dev"
$feEncoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($feCmd))
Start-Process wt -ArgumentList "new-tab --title `"Next.js`" powershell -NoExit -EncodedCommand $feEncoded"

Write-Host ""
Write-Host "All services started:" -ForegroundColor White
Write-Host "  PostgreSQL  -> localhost:5432" -ForegroundColor Green
Write-Host "  Redis       -> localhost:6379" -ForegroundColor Green
Write-Host "  FastAPI     -> http://localhost:8000" -ForegroundColor Green
Write-Host "  Next.js     -> http://localhost:3000" -ForegroundColor Green
