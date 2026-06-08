# Start all development services: FastAPI, Next.js
# PostgreSQL is hosted on Neon (cloud); Redis is hosted on Upstash (cloud) — no local start needed.

$root = "c:\Users\Crossian LLC\Desktop\dat\News"

# --- FastAPI ---
Write-Host "[1/2] Opening FastAPI tab..." -ForegroundColor Cyan
$beCmd = "Set-Location '$root\api'; .\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
$beEncoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($beCmd))
Start-Process wt -ArgumentList "new-tab --title `"FastAPI`" powershell -NoExit -EncodedCommand $beEncoded"

# --- Next.js ---
Write-Host "[2/2] Opening Next.js tab..." -ForegroundColor Cyan
$feCmd = "Set-Location '$root\web'; npm run dev"
$feEncoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($feCmd))
Start-Process wt -ArgumentList "new-tab --title `"Next.js`" powershell -NoExit -EncodedCommand $feEncoded"

Write-Host ""
Write-Host "All services started:" -ForegroundColor White
Write-Host "  PostgreSQL  -> Neon (cloud)" -ForegroundColor Green
Write-Host "  Redis       -> Upstash (cloud)" -ForegroundColor Green
Write-Host "  FastAPI     -> http://localhost:8000" -ForegroundColor Green
Write-Host "  Next.js     -> http://localhost:3000" -ForegroundColor Green
