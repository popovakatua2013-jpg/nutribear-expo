# ═══════════════════════════════════════════════════════════════
#  СБОРКА НОВОГО APK NUTRIBEAR (5-15 минут)
#  Запуск в терминале VS Code:  .\build-apk.ps1
#  Ссылку на готовый APK покажет eas build в конце.
# ═══════════════════════════════════════════════════════════════
Write-Host "1/3 Обновляю код с GitHub..." -ForegroundColor Cyan
git pull origin main
Write-Host "2/3 Проверяю пакеты..." -ForegroundColor Cyan
npm install
Write-Host "3/3 Собираю APK через EAS..." -ForegroundColor Cyan
npx eas build --profile preview --platform android
Write-Host "Готово! Ссылка на APK выше в выводе eas build." -ForegroundColor Green
