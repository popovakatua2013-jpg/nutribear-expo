# ================================================================
#  NUTRIBEAR SUPPORT INBOX - ONE-COMMAND SETUP (Telegram)
#  Run in VS Code terminal:  .\setup-support.ps1
#  What it does: creates nothing by itself - you create a Telegram
#  bot first (2 minutes with @BotFather). The script then:
#    1. checks the bot token you paste (via Telegram getMe),
#    2. finds your chat_id (you press START in the bot),
#    3. saves both as Cloudflare secrets TG_BOT_TOKEN / TG_CHAT_ID,
#    4. redeploys the worker,
#    5. sends a test request through the real worker endpoint -
#       you should receive a test message in your Telegram.
#  After that, "Написать нам" in the app sends support requests
#  DIRECTLY from the app (no e-mail app opens on the user's phone).
#  NOTE: English text on purpose - Windows PowerShell 5.1 breaks
#  on Cyrillic when a .ps1 file is saved without BOM.
# ================================================================

Set-Location $PSScriptRoot

if (-not (Test-Path ".\server\cloudflare-worker.js")) {
  Write-Host "server/cloudflare-worker.js not found - run this script from the project root." -ForegroundColor Red
  exit 1
}

Write-Host "0/6 Checking Node.js..." -ForegroundColor Cyan
node -v
if ($LASTEXITCODE -ne 0) { Write-Host "Node.js not found - install it first." -ForegroundColor Red; exit 1 }

Set-Location ".\server"

Write-Host "1/6 Checking Cloudflare login (browser may open)..." -ForegroundColor Cyan
$who = (npx -y wrangler whoami 2>&1) | Out-String
if ($who -notmatch "You are logged in|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}") {
  Write-Host "Not logged in - opening browser. Log in (free account is enough)." -ForegroundColor Yellow
  npx -y wrangler login
  if ($LASTEXITCODE -ne 0) { Write-Host "Login FAILED - try again: npx wrangler login" -ForegroundColor Red; exit 1 }
} else {
  Write-Host "OK: already logged in to Cloudflare." -ForegroundColor Green
}

# --- 2. bot token ----------------------------------------------
Write-Host "2/6 Bot token from @BotFather..." -ForegroundColor Cyan
Write-Host "If you have no bot yet (takes 2 minutes):" -ForegroundColor Yellow
Write-Host "  a) Telegram -> search @BotFather -> /newbot -> give it a name" -ForegroundColor Yellow
Write-Host "     (example: NutriBear Support) and a username ending in 'bot'" -ForegroundColor Yellow
Write-Host "     (example: nutribear_support_bot)" -ForegroundColor Yellow
Write-Host "  b) BotFather replies with a TOKEN like 123456789:AAE...b8o - copy it" -ForegroundColor Yellow
$token = ""
$botName = ""
for ($try = 1; $try -le 3 -and $token -eq ""; $try++) {
  $t = Read-Host "Paste the bot token (attempt $try of 3)"
  $t = $t.Trim()
  if ($t -match "^\d+:[A-Za-z0-9_-]{30,}$") {
    # token looks valid - double-check it is real via getMe
    try {
      $me = Invoke-RestMethod -Uri "https://api.telegram.org/bot$t/getMe" -TimeoutSec 15
      if ($me.ok) {
        $token = $t
        $botName = $me.result.username
        Write-Host "OK: bot @$botName ('$($me.result.first_name)') is alive." -ForegroundColor Green
      }
    } catch {
      Write-Host "Telegram rejected this token ($_ )" -ForegroundColor Red
    }
  } else {
    Write-Host "Format looks wrong - expected like 123456789:AAE...b8o (from @BotFather)." -ForegroundColor Red
  }
}
if ($token -eq "") { Write-Host "No valid token after 3 attempts - nothing changed, exiting." -ForegroundColor Red; exit 1 }

# --- 3. chat_id: user presses START in the bot ------------------
Write-Host "3/6 Finding YOUR chat id..." -ForegroundColor Cyan
Write-Host "In Telegram: open your bot @$botName and send it ANY message (for example 'privet')." -ForegroundColor Yellow
$chatId = ""
for ($try = 1; $try -le 5 -and $chatId -eq ""; $try++) {
  Read-Host "Send a message to the bot, then press Enter here (attempt $try of 5)"
  try {
    $up = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getUpdates" -TimeoutSec 15
    $msg = $up.result | Where-Object { $_.message.chat.id } | Select-Object -Last 1
    if ($msg) {
      $chatId = [string]$msg.message.chat.id
      $c = $msg.message.chat
      $who2 = if ($c.username) { "@" + $c.username } else { $c.first_name }
      Write-Host "OK: chat_id = $chatId ($who2)." -ForegroundColor Green
    } else {
      Write-Host "No messages yet - send ANY text to the bot in Telegram (not just press START)." -ForegroundColor Red
    }
  } catch {
    Write-Host "getUpdates failed: $_" -ForegroundColor Red
  }
}
if ($chatId -eq "") { Write-Host "No message received after 5 attempts - nothing changed, exiting." -ForegroundColor Red; exit 1 }

# --- 4. save Cloudflare secrets ---------------------------------
Write-Host "4/6 Saving Cloudflare secrets TG_BOT_TOKEN and TG_CHAT_ID..." -ForegroundColor Cyan
Write-Output $token | npx -y wrangler secret put TG_BOT_TOKEN
if ($LASTEXITCODE -ne 0) { Write-Host "secret put TG_BOT_TOKEN FAILED - run manually: npx wrangler secret put TG_BOT_TOKEN" -ForegroundColor Red; exit 1 }
Write-Output $chatId | npx -y wrangler secret put TG_CHAT_ID
if ($LASTEXITCODE -ne 0) { Write-Host "secret put TG_CHAT_ID FAILED - run manually: npx wrangler secret put TG_CHAT_ID" -ForegroundColor Red; exit 1 }
Write-Host "OK: secrets saved (token + chat id now live in Cloudflare, NOT in the APK)." -ForegroundColor Green

# --- 5. redeploy the worker -------------------------------------
Write-Host "5/6 Redeploying the worker (npx wrangler deploy)..." -ForegroundColor Cyan
npx -y wrangler deploy
if ($LASTEXITCODE -ne 0) { Write-Host "Deploy FAILED - try manually: npx wrangler deploy" -ForegroundColor Red; exit 1 }

# --- 6. end-to-end test through the real endpoint ---------------
Write-Host "6/6 Sending a TEST request through the worker..." -ForegroundColor Cyan
$envPath = Join-Path $PSScriptRoot ".env"
$proxySecret = ""
$proxyUrl = ""
if (Test-Path $envPath) {
  $lines = @(Get-Content $envPath)
  $l1 = $lines | Where-Object { $_ -match "^\s*EXPO_PUBLIC_AI_PROXY_SECRET\s*=" } | Select-Object -First 1
  if ($l1) { $proxySecret = ($l1 -split "=", 2)[1].Trim() }
  $l2 = $lines | Where-Object { $_ -match "^\s*EXPO_PUBLIC_AI_PROXY_URL\s*=" } | Select-Object -First 1
  if ($l2) { $proxyUrl = ($l2 -split "=", 2)[1].Trim() }
}
if ($proxySecret -and $proxyUrl) {
  $testUrl = "$($proxyUrl.TrimEnd('/'))/support"
  Write-Host "POST $testUrl" -ForegroundColor Gray
  & curl.exe -s -X POST $testUrl `
    -H "X-NB-Secret: $proxySecret" `
    -F "topic=Test" `
    -F "message=Setup script test - if you see this, in-app support requests reach you."
  Write-Host ""
  Write-Host "DONE. Check your Telegram: the test message above should arrive from your bot." -ForegroundColor Green
  Write-Host "Now 'Написать нам' in the app sends requests DIRECTLY - no e-mail app opens." -ForegroundColor Green
} else {
  Write-Host "Could not read EXPO_PUBLIC_AI_PROXY_URL/SECRET from .env - skipped the auto-test." -ForegroundColor Yellow
  Write-Host "Manual test: open the app -> More -> Support -> write something -> Send," -ForegroundColor Yellow
  Write-Host "then check your Telegram." -ForegroundColor Yellow
}
Write-Host "If the app (Expo Go) is already running - restart it is NOT required: no .env changed." -ForegroundColor Gray

Set-Location $PSScriptRoot
