# ================================================================
#  NUTRIBEAR UPDATE + RUN ON YOUR PC
#  Run in VS Code terminal:  .\update.ps1
#  NOTE: English text on purpose - Windows PowerShell 5.1 breaks
#  on Cyrillic when a .ps1 file is saved without BOM.
# ================================================================
Write-Host "1/3 Pulling latest code from GitHub..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Host "git pull FAILED - check internet." -ForegroundColor Red; exit 1 }

Write-Host "2/3 Installing packages (npm install)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install FAILED." -ForegroundColor Red; exit 1 }

Write-Host "3/3 Starting app (Expo)..." -ForegroundColor Cyan
npx expo start --clear
