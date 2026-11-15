# ================================================================
#  NUTRIBEAR AI PROXY - UPDATE (git pull + wrangler deploy)
#  Run in the project root:  .\update-proxy.ps1
#  Use this AFTER the first deploy-proxy.ps1 run. It pulls the
#  latest worker code from GitHub and republishes it. Secrets
#  (AI_KEY, NB_SECRET) are stored on Cloudflare and survive
#  deploys - no need to re-enter them.
#  NOTE: English text on purpose - Windows PowerShell 5.1 breaks
#  on Cyrillic when a .ps1 file is saved without BOM.
# ================================================================

Set-Location $PSScriptRoot

if (-not (Test-Path ".\server\cloudflare-worker.js")) {
  Write-Host "server/cloudflare-worker.js not found - run this script from the project root." -ForegroundColor Red
  exit 1
}

Write-Host "1/3 Pulling the latest code from GitHub..." -ForegroundColor Cyan
git pull --ff-only
if ($LASTEXITCODE -ne 0) {
  Write-Host "git pull FAILED. Usual cause: local changes. Do not edit project files;" -ForegroundColor Red
  Write-Host "if you did, close them and try again, or write to the assistant." -ForegroundColor Red
  exit 1
}
Write-Host "OK: code is up to date." -ForegroundColor Green

Write-Host "2/3 Publishing the worker to Cloudflare (secrets stay as they are)..." -ForegroundColor Cyan
Push-Location ".\server"
npx -y wrangler deploy 2>&1 | Tee-Object -Variable deployOut
$deployExit = $LASTEXITCODE
Pop-Location
if ($deployExit -ne 0) {
  Write-Host "Deploy FAILED - see errors above. If login expired, run: npx wrangler login" -ForegroundColor Red
  exit 1
}

Write-Host "3/3 Checking the live worker..." -ForegroundColor Cyan
$check = (curl.exe -s -m 20 "https://nutribear-ai.popovakatua2013.workers.dev/v1/status" 2>&1) | Out-String
Write-Host $check.Trim()
if ($check -match "secret_required") {
  Write-Host "OK: the NEW worker version is live (status shows limits)." -ForegroundColor Green
  Write-Host "Photo up to ~450 KB and voice up to 5 MB now pass. Retest the app:" -ForegroundColor Green
  Write-Host "photo food, voice input, recipe KBJU, chat." -ForegroundColor Green
} else {
  Write-Host "The worker answered, but the NEW status fields are missing -" -ForegroundColor Yellow
  Write-Host "the deploy may have gone to a different worker. Check the output above." -ForegroundColor Yellow
}
Write-Host "Done." -ForegroundColor Cyan
