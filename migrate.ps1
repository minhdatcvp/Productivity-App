# Run Alembic migrations
# Usage: .\migrate.ps1 [upgrade|downgrade] [revision]
Set-Location "$PSScriptRoot\api"

# Load .env into environment variables
if (Test-Path ".env") {
    Get-Content ".env" | Where-Object { $_ -match "^\s*[^#].*=.*" } | ForEach-Object {
        $parts = $_ -split "=", 2
        [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
    }
}

$action = if ($args[0]) { $args[0] } else { "upgrade" }
$rev = if ($args[1]) { $args[1] } else { "head" }
.\venv\Scripts\alembic $action $rev
