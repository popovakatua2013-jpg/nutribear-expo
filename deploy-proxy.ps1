# ================================================================
#  NUTRIBEAR AI PROXY - ONE-COMMAND DEPLOY (Cloudflare Worker)
#  Run in VS Code terminal:  .\deploy-proxy.ps1
#  What it does: login -> saves AI key from .env into a Cloudflare
#  secret -> generates app secret -> deploys -> writes the proxy URL
#  back into .env. The AI key never goes into the APK.
#  NOTE: English text on purpose - Windows PowerShell 5.1 breaks
#  on Cyrillic when a .ps1 file is saved without BOM.
# ================================================================

Set-Location $PSScriptRoot

if (-not (Test-Path ".\server\cloudflare-worker.js")) {
  Write-Host "server/cloudflare-worker.js not found - run this script from the project root." -ForegroundColor Red
  exit 1
}
$envPath = Join-Path $PSScriptRoot ".env"

Write-Host "0/6 Checking Node.js..." -ForegroundColor Cyan
node -v
if ($LASTEXITCODE -ne 0) { Write-Host "Node.js not found - install it first (expo needs it anyway)." -ForegroundColor Red; exit 1 }

Set-Location ".\server"

Write-Host "1/6 Checking Cloudflare login (browser may open)..." -ForegroundColor Cyan
$who = (npx -y wrangler whoami 2>&1) | Out-String
if ($who -notmatch "You are logged in|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}") {
  Write-Host "Not logged in - opening browser. Log in (free account is enough, no card)." -ForegroundColor Yellow
  npx -y wrangler login
  if ($LASTEXITCODE -ne 0) { Write-Host "Login FAILED - try again: npx wrangler login" -ForegroundColor Red; exit 1 }
} else {
  Write-Host "OK: already logged in to Cloudflare." -ForegroundColor Green
}

# --- read the AI key from .env (sk-...) -------------------------
$aiKey = ""
if (Test-Path $envPath) {
  $line = @(Get-Content $envPath) | Where-Object { $_ -match "^\s*EXPO_PUBLIC_AI_KEY\s*=" } | Select-Object -First 1
  if ($line) { $aiKey = ($line -split "=", 2)[1].Trim() }
}

Write-Host "2/6 Saving AI key into Cloudflare secret AI_KEY..." -ForegroundColor Cyan
if ($aiKey -match "^sk") {
  $masked = $aiKey.Substring(0, 6) + "..." + "(" + $aiKey.Length + " chars, taken from .env)"
  Write-Output $aiKey | npx -y wrangler secret put AI_KEY
  if ($LASTEXITCODE -ne 0) { Write-Host "secret put AI_KEY FAILED - run manually: npx wrangler secret put AI_KEY" -ForegroundColor Red; exit 1 }
  Write-Host "OK: key saved $masked" -ForegroundColor Green
} else {
  Write-Host "No EXPO_PUBLIC_AI_KEY found in .env - paste your sk-... key now." -ForegroundColor Yellow
  Write-Host "(input is invisible while typing - this is normal)" -ForegroundColor Yellow
  npx -y wrangler secret put AI_KEY
  if ($LASTEXITCODE -ne 0) { Write-Host "secret put AI_KEY FAILED." -ForegroundColor Red; exit 1 }
  Write-Host "OK: key saved." -ForegroundColor Green
}

Write-Host "3/6 App secret NB_SECRET (protects the worker from strangers)..." -ForegroundColor Cyan
$ans = Read-Host "Generate a random app secret and save it to .env? [Y/n]"
if ($ans -eq "n" -or $ans -eq "N") {
  $sec = Read-Host "Paste your own secret (any long random string)"
  if ([string]::IsNullOrWhiteSpace($sec)) { Write-Host "Empty secret - skipping NB_SECRET (worker stays open to anyone with the URL)." -ForegroundColor Yellow }
} else {
  $b = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($b)
  $sec = ([Convert]::ToBase64String($b) -replace "[^a-zA-Z0-9]", "")
  Write-Host "Generated a random 43-char secret." -ForegroundColor Green
}
if (-not [string]::IsNullOrWhiteSpace($sec)) {
  Write-Output $sec | npx -y wrangler secret put NB_SECRET
  if ($LASTEXITCODE -ne 0) { Write-Host "secret put NB_SECRET FAILED - run manually: npx wrangler secret put NB_SECRET" -ForegroundColor Red; exit 1 }
  # save the same secret into .env so the app can authenticate
  $lines = @()
  if (Test-Path $envPath) { $lines = @(Get-Content $envPath) }
  $found = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*EXPO_PUBLIC_AI_PROXY_SECRET\s*=") { $lines[$i] = "EXPO_PUBLIC_AI_PROXY_SECRET=$sec"; $found = $true }
  }
  if (-not $found) { $lines += "EXPO_PUBLIC_AI_PROXY_SECRET=$sec" }
  Set-Content -Path $envPath -Value $lines -Encoding ASCII
  Write-Host "OK: NB_SECRET saved on the worker and into .env (EXPO_PUBLIC_AI_PROXY_SECRET)." -ForegroundColor Green
}

Write-Host "4/6 Deploying the worker..." -ForegroundColor Cyan
npx -y wrangler deploy 2>&1 | Tee-Object -Variable deployOut
if ($LASTEXITCODE -ne 0) { Write-Host "Deploy FAILED - see errors above." -ForegroundColor Red; exit 1 }
$url = [regex]::Match(($deployOut -join "`n"), "https://[A-Za-z0-9.-]+\.workers\.dev").Value

Write-Host "5/6 Writing the proxy URL into .env..." -ForegroundColor Cyan
if ($url) {
  $lines = @()
  if (Test-Path $envPath) { $lines = @(Get-Content $envPath) }
  $found = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*EXPO_PUBLIC_AI_PROXY_URL\s*=") { $lines[$i] = "EXPO_PUBLIC_AI_PROXY_URL=$url/v1"; $found = $true }
  }
  if (-not $found) { $lines += "EXPO_PUBLIC_AI_PROXY_URL=$url/v1" }
  Set-Content -Path $envPath -Value $lines -Encoding ASCII
  Write-Host "OK: EXPO_PUBLIC_AI_PROXY_URL=$url/v1" -ForegroundColor Green
} else {
  Write-Host "Could not read the URL automatically - copy it from the deploy output above" -ForegroundColor Yellow
  Write-Host "and add to .env:  EXPO_PUBLIC_AI_PROXY_URL=https://your-worker.workers.dev/v1" -ForegroundColor Yellow
}

Write-Host "6/6 Done! Next steps:" -ForegroundColor Cyan
if ($url) {
  Write-Host "  1. Open $url in a browser - you should see:" -ForegroundColor Green
  Write-Host '     {"ok":true,"service":"nutribear-ai"}' -ForegroundColor Green
}
Write-Host "  2. Restart Expo with cleared cache:  npx expo start --clear" -ForegroundColor Green
Write-Host "  3. Chat / photo food / voice input now go through your worker." -ForegroundColor Green
Write-Host "  4. BEFORE the store APK build: remove the direct key from EAS" -ForegroundColor Yellow
Write-Host "     so it is not embedded in the build. Check:  npx eas env:list" -ForegroundColor Yellow
Write-Host "     (delete EXPO_PUBLIC_AI_KEY there or in the Expo dashboard)." -ForegroundColor Yellow
Write-Host "  5. Live logs anytime:  npx wrangler tail" -ForegroundColor Green
