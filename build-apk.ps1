# ================================================================
#  NUTRIBEAR APK BUILD (5-15 minutes)
#  Run in VS Code terminal:  .\build-apk.ps1
#  The APK link will be printed by eas build at the end.
#  NOTE: English text on purpose - Windows PowerShell 5.1 breaks
#  on Cyrillic when a .ps1 file is saved without BOM.
# ================================================================
Write-Host "0/4 Switching to the script folder..." -ForegroundColor Cyan
Set-Location $PSScriptRoot

Write-Host "1/4 Pulling latest code from GitHub..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Host "git pull FAILED - check internet. Build stopped." -ForegroundColor Red; exit 1 }

Write-Host "2/4 Checking .env (AI proxy)..." -ForegroundColor Cyan
if (-not (Test-Path .env)) {
  Write-Host "WARNING: .env not found - AI recognition will be SILENT in the APK." -ForegroundColor Yellow
  Write-Host "Deploy the proxy first (server/README.md), then create .env:" -ForegroundColor Yellow
  Write-Host "  notepad .env   and add line:  EXPO_PUBLIC_AI_PROXY_URL=https://nutribear-ai.YOUR-ACCOUNT.workers.dev/v1" -ForegroundColor Yellow
  Write-Host "NEVER put the AI key (sk-...) in .env: it is excluded from EAS builds (.easignore)." -ForegroundColor Yellow
  Write-Host "Instead, create EAS secrets (see internal/eas-build.md): eas secret:create --name EXPO_PUBLIC_AI_PROXY_URL ..." -ForegroundColor Yellow
} else {
  Write-Host "OK: .env found." -ForegroundColor Green
}

Write-Host "3/4 Installing packages (npm install)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install FAILED - build stopped." -ForegroundColor Red; exit 1 }

Write-Host "4/4 Building APK via EAS (5-15 min)..." -ForegroundColor Cyan
npx eas build --profile preview --platform android
if ($LASTEXITCODE -ne 0) { Write-Host "Build FAILED - see errors above." -ForegroundColor Red; exit 1 }

Write-Host "DONE! APK link is above in the eas build output." -ForegroundColor Green
