# Fishmaster one-time setup (use this if "npm" fails in PowerShell)
$env:Path = "C:\Program Files\nodejs;" + $env:Path
Set-Location $PSScriptRoot

Write-Host "Installing dependencies..."
& "C:\Program Files\nodejs\npm.cmd" install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Setting up database..."
& "C:\Program Files\nodejs\npm.cmd" run db:setup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done! Start the API:  npm.cmd run dev:api"
Write-Host "Start the web:       npm.cmd run dev:web"
