# ================================================================
#  NUTRIBEAR UPDATE + RUN ON YOUR PC
#  Run in VS Code terminal:  .\update.ps1
#  NOTE: English text on purpose - Windows PowerShell 5.1 breaks
#  on Cyrillic when a .ps1 file is saved without BOM.
# ================================================================
Write-Host "0/3 Switching to the script folder..." -ForegroundColor Cyan
Set-Location $PSScriptRoot

Write-Host "0b/3 Stopping stale Expo/Metro on port 8081 (if any)..." -ForegroundColor Cyan
# A stale Metro from a previous run keeps serving a broken mixed bundle
# ("Something went wrong" / EventEmitter crash on the phone). Kill it so
# the fresh start below is guaranteed to serve a clean bundle.
$stale = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($stale) {
  Write-Host "    Metro found on port 8081 (PID $($stale.OwningProcess)) - stopping..." -ForegroundColor Yellow
  try { Stop-Process -Id $stale.OwningProcess -Force -ErrorAction Stop; Start-Sleep -Seconds 2 } catch {}
} else {
  Write-Host "    Port 8081 is free." -ForegroundColor DarkGray
}

Write-Host "1/3 Pulling latest code from GitHub..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Host "git pull FAILED - check internet." -ForegroundColor Red; exit 1 }

Write-Host "2/3 Installing packages (npm install)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install FAILED." -ForegroundColor Red; exit 1 }

Write-Host "3/3 Starting app (Expo)..." -ForegroundColor Cyan
npx expo start --clear
