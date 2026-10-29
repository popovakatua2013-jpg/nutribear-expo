# ==============================================================
#  NutriBear - обновление с GitHub одной командой
# --------------------------------------------------------------
#  Как пользоваться (любой способ):
#    1) Двойной клик по файлу update.bat   - самый простой
#    2) В терминале VS Code:  .\update.ps1
#
#  Скрипт сам:
#    - найдёт папку проекта,
#    - заберёт последнюю версию с GitHub
#      (локальные правки файлов заменяются свежей версией),
#    - обновит библиотеки, только если они менялись,
#    - запустит приложение (npx expo start --clear).
#
#  Если что-то пошло не так - пришлите весь текст из этого окна.
# ==============================================================

$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/popovakatua2013-jpg/nutribear-expo.git'

function Pause-Exit([int]$code) {
    Read-Host 'Нажмите Enter для выхода'
    exit $code
}

Write-Host ''
Write-Host '===== NutriBear: обновление с GitHub =====' -ForegroundColor Cyan

# --- 1. Проверяем, что установлен git ---
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host ''
    Write-Host '[!] Git не найден.' -ForegroundColor Yellow
    Write-Host '    Установите его командой:'
    Write-Host '    winget install --id Git.Git -e --source winget'
    Write-Host '    Затем закройте и заново откройте это окно.'
    Pause-Exit 1
}

# --- 2. Находим папку проекта (там, где package.json и папка src) ---
function Test-Project([string]$p) {
    return (Test-Path (Join-Path $p 'package.json')) -and (Test-Path (Join-Path $p 'src'))
}

$proj = (Get-Location).Path
if (-not (Test-Project $proj)) {
    $desktop = [Environment]::GetFolderPath('Desktop')
    foreach ($c in @(
        (Join-Path $desktop 'nutribear-app'),
        (Join-Path $desktop 'nutribear-expo-main\nutribear-expo-main'),
        (Join-Path $desktop 'nutribear-expo-main')
    )) {
        if (Test-Project $c) { $proj = $c; break }
    }
}
if (-not (Test-Project $proj)) {
    Write-Host ''
    Write-Host '[!] Не нашёл папку проекта (нужны package.json и папка src).' -ForegroundColor Yellow
    Write-Host '    Откройте терминал в папке проекта и запустите скрипт оттуда.'
    Pause-Exit 1
}
Set-Location $proj
Write-Host ''
Write-Host ('Папка проекта: ' + $proj) -ForegroundColor Cyan

# --- 3. Связываем папку с GitHub (один раз, если ещё не связана) ---
if (-not (Test-Path (Join-Path $proj '.git'))) {
    Write-Host 'Папка пока не связана с GitHub - связываю...' -ForegroundColor Cyan
    git init | Out-Null
}
if (git remote) {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

# --- 4. Запоминаем зависимости ДО обновления ---
$depFiles = @('package.json', 'package-lock.json')
$before = ($depFiles | ForEach-Object {
    $f = Join-Path $proj $_
    if (Test-Path $f) { $_ + ':' + (Get-FileHash $f).Hash } else { $_ + ':none' }
}) -join '|'

# --- 5. Забираем последнюю версию с GitHub ---
Write-Host 'Проверяю обновления на GitHub...' -ForegroundColor Cyan
git fetch origin
if ($LASTEXITCODE -ne 0) {
    Write-Host '[!] Не удалось связаться с GitHub. Проверьте интернет и запустите ещё раз.' -ForegroundColor Yellow
    Pause-Exit 1
}

$remote = git rev-parse origin/main
if (-not $remote) {
    Write-Host '[!] На GitHub не найдена ветка main. Напишите мне об этом.' -ForegroundColor Yellow
    Pause-Exit 1
}
$local = ''
git rev-parse -q --verify HEAD | Out-Null
if ($LASTEXITCODE -eq 0) { $local = git rev-parse HEAD }

if ($local -eq $remote) {
    Write-Host 'У вас уже последняя версия.' -ForegroundColor Green
} else {
    Write-Host 'Обновляю файлы до последней версии...' -ForegroundColor Cyan
    git reset --hard origin/main | Out-Null
    git branch --set-upstream-to=origin/main | Out-Null
    Write-Host ('Готово. Версия: ' + $remote.Substring(0, 7)) -ForegroundColor Green
}

# --- 6. Библиотеки: ставим только если они менялись ---
$after = ($depFiles | ForEach-Object {
    $f = Join-Path $proj $_
    if (Test-Path $f) { $_ + ':' + (Get-FileHash $f).Hash } else { $_ + ':none' }
}) -join '|'

if ($before -ne $after) {
    Write-Host 'Состав библиотек изменился - устанавливаю (может занять пару минут)...' -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[!] npm install завершился с ошибкой. Продолжаю, но если приложение не запустится - пришлите мне текст ошибки.' -ForegroundColor Yellow
    }
} else {
    Write-Host 'Библиотеки не менялись - установка не нужна.' -ForegroundColor DarkGray
}

# --- 7. Запускаем приложение ---
Write-Host ''
Write-Host 'Запускаю NutriBear (остановка: Ctrl+C)...' -ForegroundColor Green
Write-Host ''
npx expo start --clear
