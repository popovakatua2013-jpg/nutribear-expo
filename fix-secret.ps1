# ================================================================
#  NUTRIBEAR AI PROXY - FIX APP SECRET (401 "secret mismatch")
#  Run in the project root:  .\fix-secret.ps1
#  Symptom: the app shows "AI service did not accept this build:
#  access secret mismatch" on photo / voice / chat.
#  Cause: the value of NB_PROXY_SECRET in GitHub differs from the
#  worker's NB_SECRET (a typo or an old value when copying).
#  What it does:
#    1. reads EXPO_PUBLIC_AI_PROXY_SECRET from .env (or generates one)
#    2. probes the worker with it - a dummy model name is rejected
#       locally with 400, so the probe never spends AI money
#    3. if the worker rejects the secret -> saves it as NB_SECRET
#    4. copies the value to the clipboard and opens the GitHub
#       secrets page - update NB_PROXY_SECRET with it (paste, save)
#    5. rebuild the APK afterwards (Actions -> Build APK -> Run
#       workflow, or ask the assistant)
#  NOTE: English text on purpose - Windows PowerShell 5.1 breaks
#  on Cyrillic when a .ps1 file is saved without BOM.
# ================================================================

Set-Location $PSScriptRoot
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$worker = "https://nutribear-ai.popovakatua2013.workers.dev"
$envPath = Join-Path $PSScriptRoot ".env"

$sec = ""
if (Test-Path $envPath) {
  $line = @(Get-Content $envPath) | Where-Object { $_ -match "^\s*EXPO_PUBLIC_AI_PROXY_SECRET\s*=" } | Select-Object -First 1
  if ($line) { $sec = ($line -split "=", 2)[1].Trim() }
}

if ([string]::IsNullOrWhiteSpace($sec)) {
  Write-Host "1/4 No secret in .env - generating a new one..." -ForegroundColor Cyan
  $b = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($b)
  $sec = ([Convert]::ToBase64String($b) -replace "[^a-zA-Z0-9]", "")
  $lines = @()
  if (Test-Path $envPath) { $lines = @(Get-Content $envPath) }
  $found = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*EXPO_PUBLIC_AI_PROXY_SECRET\s*=") { $lines[$i] = "EXPO_PUBLIC_AI_PROXY_SECRET=$sec"; $found = $true }
  }
  if (-not $found) { $lines += "EXPO_PUBLIC_AI_PROXY_SECRET=$sec" }
  Set-Content -Path $envPath -Value $lines -Encoding ASCII
  Write-Host "OK: new secret generated and saved into .env." -ForegroundColor Green
} else {
  Write-Host "1/4 Secret found in .env (kept as is, not printed)." -ForegroundColor Green
}

Write-Host "2/4 Probing the worker (dummy model is rejected locally - no AI money spent)..." -ForegroundColor Cyan
$body = @{ model = "nb-secret-probe"; messages = @(@{ role = "user"; content = "ping" }) } | ConvertTo-Json -Depth 5
$code = 0
try {
  $r = Invoke-WebRequest -Uri "$worker/v1/chat/completions" -Method Post -ContentType "application/json" -Headers @{ "X-NB-Secret" = $sec } -Body $body -UseBasicParsing -TimeoutSec 20
  $code = [int]$r.StatusCode
} catch {
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode } else { $code = -1 }
}
# 400 = the secret passed, the worker stopped on the dummy model name.
# 200 = the secret passed too - the probe got a real AI answer, the
#       whole server chain (secret + AI key + upstream) works.
# 401 = the worker does NOT accept this secret.
if ($code -eq 400 -or $code -eq 200) {
  Write-Host "OK: the worker ACCEPTS the .env secret (probe HTTP $code)." -ForegroundColor Green
  if ($code -eq 200) {
    Write-Host "Bonus: the probe got a real AI answer - key and upstream are healthy too." -ForegroundColor DarkGray
  }
  Write-Host "" -ForegroundColor Yellow
  Write-Host "But the installed APK carries the GITHUB value (it got 401 inside the app)," -ForegroundColor Yellow
  Write-Host "so the NB_PROXY_SECRET in GitHub holds something else. Update it below:" -ForegroundColor Yellow
} elseif ($code -eq 401) {
  Write-Host "The worker REJECTS this secret - saving it as NB_SECRET on the worker..." -ForegroundColor Yellow
  Push-Location ".\server"
  Write-Output $sec | npx -y wrangler secret put NB_SECRET
  $putExit = $LASTEXITCODE
  Pop-Location
  if ($putExit -ne 0) { Write-Host "secret put FAILED - run manually: npx wrangler secret put NB_SECRET" -ForegroundColor Red; exit 1 }
  Write-Host "OK: worker NB_SECRET updated (secrets survive deploys)." -ForegroundColor Green
} else {
  Write-Host "Unexpected probe result (HTTP $code). Check internet and the worker URL, then try again." -ForegroundColor Red
  exit 1
}

Write-Host "3/4 Copying the secret value to the clipboard..." -ForegroundColor Cyan
Set-Clipboard -Value $sec
Write-Host "OK: the value is in your clipboard now (it is NOT printed here)." -ForegroundColor Green

Write-Host "4/4 Opening the GitHub secrets page in the browser..." -ForegroundColor Cyan
Start-Process "https://github.com/popovakatua2013-jpg/nutribear-expo/settings/secrets/actions"

Write-Host ""
Write-Host "FINISH IN THE BROWSER (page is already open):" -ForegroundColor Cyan
Write-Host "  1. In the list find NB_PROXY_SECRET, click the pencil (Update)." -ForegroundColor White
Write-Host "  2. Click into the Secret/Value field and press Ctrl+V." -ForegroundColor White
Write-Host "  3. Click 'Update secret'." -ForegroundColor White
Write-Host "  4. Rebuild the app: GitHub -> Actions -> Build APK -> Run workflow," -ForegroundColor White
Write-Host "     or just write to the assistant - it will start the build." -ForegroundColor White
Write-Host ""
Write-Host "Aligned: .env = worker NB_SECRET = GitHub NB_PROXY_SECRET." -ForegroundColor Green
