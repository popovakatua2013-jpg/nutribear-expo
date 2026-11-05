# ═══════════════════════════════════════════════════════════════
#  ОБНОВЛЕНИЕ NUTRIBEAR НА ВАШЕМ КОМПЬЮТЕРЕ
#  Запуск в терминале VS Code:  .\update.ps1
# ═══════════════════════════════════════════════════════════════
Write-Host "1/3 Обновляю код с GitHub..." -ForegroundColor Cyan
git pull origin main
Write-Host "2/3 Проверяю пакеты..." -ForegroundColor Cyan
npm install
Write-Host "3/3 Запускаю приложение (Expo)..." -ForegroundColor Cyan
npx expo start --clear
