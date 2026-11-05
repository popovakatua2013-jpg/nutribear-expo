# ================================================================
#  NUTRIBEAR APK BUILD (5-15 minutes)
#  Run in VS Code terminal:  .\build-apk.ps1
#  The APK link will be printed by eas build at the end.
#  NOTE: English text on purpose - Windows PowerShell 5.1 breaks
#  on Cyrillic when a .ps1 file is saved without BOM.
# ================================================================
Write-Host "1/4 Pulling latest code from GitHub..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Host "git pull FAILED - check internet. Build stopped." -ForegroundColor Red; exit 1 }

Write-Host "2/4 Checking .env (AI key)..." -ForegroundColor Cyan
if (-not (Test-Path .env)) {
  Write-Host "WARNING: .env not found - AI recognition will be SILENT in the APK." -ForegroundColor Yellow
  Write-Host "Create it:  notepad .env   and add line:  EXPO_PUBLIC_AI_KEY=sk-your-key" -ForegroundColor Yellow
  Write-Host "(key from your ProxyAPI account). Then run this script again." -ForegroundColor Yellow
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
