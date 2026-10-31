# ==============================================================
#  NutriBear - обновление с GitHub одной командой
# --------------------------------------------------------------
#  Как пользоваться (любой способ):
#    1) Двойной клик по файлу update.bat   - самый простой
#    2) В терминале VS Code:  .\update.ps1
#
#  Скрипт сам:
#    - находит рабочую копию проекта: путь каждой удачно
#      обновлённой копии запоминается в файле-настройке
#      %USERPROFILE%\.nutribear\work-path.txt, поэтому скрипт
#      находит нужную копию, даже если запущен из другой папки;
#    - предупреждает, если видит две вложенные копии проекта
#      («Похоже, у вас две папки проекта — оставьте одну»);
#    - проверяет сам себя: если update.ps1 на GitHub новее,
#      сразу обновляет сам себя и перезапускается;
#    - убирает мусорные файлы (git clean -fd), которые могут
#      мешать обновлению (в update.bat - автоматически, без вопросов);
#    - забирает последнюю версию с GitHub
#      (локальные правки файлов заменяются свежей версией);
#    - переносит файл .env (ключи ИИ) из старой копии, если в этой
#      его нет, и держит запасную копию в %USERPROFILE%\.nutribear;
#    - переустанавливает библиотеки, если они изменились, ещё не
#      стоят или устарели (старше файла зависимостей);
#    - записывает хэш версии для бейджа «сборка» в разделе «Ещё»;
#    - запускает приложение (npx expo start --clear).
#
#  Если что-то пошло не так - пришлите весь текст из этого окна.
# ==============================================================

param([string]$Clean = '')

$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/popovakatua2013-jpg/nutribear-expo.git'

function Wait-Exit([int]$code) {
    Read-Host 'Нажмите Enter для выхода'
    exit $code
}

function Test-Project([string]$p) {
    return ($p -and (Test-Path (Join-Path $p 'package.json')) -and (Test-Path (Join-Path $p 'src')))
}

# --- Мусорные файлы: git clean -fd по подтверждению -------------
# Удаляются только файлы, НЕ входящие в репозиторий и не
# описанные в .gitignore (папки node_modules и .expo не трогаются).
function Invoke-Clean {
    $preview = @(git clean -nd)
    if (-not $preview) { return }
    # Явный режим (update.bat передаёт -Clean Y): без вопросов.
    if ($Clean -match '^(y|д)') {
        Write-Host 'Убираю лишние файлы (git clean -fd)...' -ForegroundColor Cyan
        git clean -fd
        if ($LASTEXITCODE -eq 0) {
            Write-Host 'Лишние файлы удалены.' -ForegroundColor Green
        }
        return
    }
    if ($Clean -match '^(n)') { return }
    # Интерактивный режим (прямой запуск .\update.ps1 в терминале).
    Write-Host 'Найдены лишние файлы, не входящие в проект:' -ForegroundColor DarkGray
    $preview | Select-Object -First 10 | ForEach-Object {
        Write-Host ('  ' + $_) -ForegroundColor DarkGray
    }
    $ans = Read-Host 'Удалить их? (y - да / n - нет, Enter - нет)'
    if ($ans -match '^(y|д)') {
        git clean -fd
        if ($LASTEXITCODE -eq 0) {
            Write-Host 'Лишние файлы удалены.' -ForegroundColor Green
        }
    } else {
        Write-Host 'Оставляю лишние файлы как есть.' -ForegroundColor DarkGray
    }
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
    Wait-Exit 1
}

# --- 2. Находим рабочую копию проекта ----------------------------
# Сначала файл-настройка, затем текущая папка, затем типовые места.
$fromSettings = $false
$proj = ''
$desktop = [Environment]::GetFolderPath('Desktop')
$cfgDir  = Join-Path $env:USERPROFILE '.nutribear'
$cfgFile = Join-Path $cfgDir 'work-path.txt'
if (Test-Path $cfgFile) {
    $saved = ''
    try { $saved = (Get-Content $cfgFile -Raw).Trim() } catch { $saved = '' }
    if ($saved -and (Test-Project $saved)) {
        $proj = $saved
        $fromSettings = $true
    }
}
if (-not $proj -and (Test-Project (Get-Location).Path)) {
    $proj = (Get-Location).Path
}
if (-not $proj) {
    foreach ($c in @(
        (Join-Path $desktop 'nutribear-app'),
        (Join-Path $desktop 'nutribear-expo-main\nutribear-app'),
        (Join-Path $desktop 'nutribear-expo-main\nutribear-expo-main\nutribear-app'),
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
    Wait-Exit 1
}

# --- 3. Две вложенные копии (папка из ZIP внутри такой же) -------
if ($proj -match 'nutribear-expo-main\\nutribear-expo-main') {
    Write-Host '[!] Похоже, у вас две папки проекта — оставьте одну.' -ForegroundColor Yellow
    if (-not $fromSettings) {
        # ...\nbem\nbem\остальное  ->  ...\nbem\остальное
        $alt = $proj -replace '(nutribear-expo-main\\)+', 'nutribear-expo-main\'
        if ($alt -eq $proj) {
            # ...\nbem\nbem (без завершающего слэша)  ->  ...\nbem
            $alt = $proj -replace 'nutribear-expo-main\\nutribear-expo-main$', 'nutribear-expo-main'
        }
        if (($alt -ne $proj) -and (Test-Project $alt)) {
            Write-Host ('    Обновляю основную копию: ' + $alt)
            $proj = $alt
        } else {
            Write-Host ('    Обновляю копию: ' + $proj)
        }
    }
}

# --- 3б. Вторая копия рядом с основной: подсказываем, как убрать ---
if (($proj -match '\\nutribear-expo-main\\nutribear-app$') -and
    (-not ($proj -match 'nutribear-expo-main\\nutribear-expo-main'))) {
    $dup = Join-Path $proj '..\nutribear-expo-main'
    if (Test-Path $dup) {
        $dupFull = (Resolve-Path $dup).Path
        Write-Host '[!] Рядом нашлась вторая копия проекта (из ZIP):' -ForegroundColor Yellow
        Write-Host ('    ' + $dupFull)
        Write-Host '    Когда убедитесь, что приложение работает из этой папки,'
        Write-Host '    удалите её командой:'
        Write-Host ('    Remove-Item -Recurse -Force "' + $dupFull + '"')
    }
}

Set-Location $proj
Write-Host ''
Write-Host ('Папка проекта: ' + $proj) -ForegroundColor Cyan

# --- 4. Связываем папку с GitHub (один раз, если ещё не связана) ---
if (-not (Test-Path (Join-Path $proj '.git'))) {
    Write-Host 'Папка пока не связана с GitHub - связываю...' -ForegroundColor Cyan
    git init | Out-Null
}
if (git remote) {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

# --- 5. Файл .env: ключи ИИ. На GitHub их нет - берегём ----------
# Делаем запасную копию, а если в этой копии .env нет - переносим
# его из другой известной копии или из запасной.
$envFile = Join-Path $proj '.env'
if (Test-Path $envFile) {
    New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
    Copy-Item $envFile (Join-Path $cfgDir 'env-backup') -Force
} else {
    foreach ($c in @(
        (Join-Path $cfgDir 'env-backup'),
        (Join-Path $desktop 'nutribear-app\.env'),
        (Join-Path $desktop 'nutribear-expo-main\nutribear-app\.env'),
        (Join-Path $desktop 'nutribear-expo-main\nutribear-expo-main\nutribear-app\.env'),
        (Join-Path $desktop 'nutribear-expo-main\.env')
    )) {
        if (Test-Path $c) {
            Copy-Item $c $envFile -Force
            Write-Host ('Файл .env перенесён из: ' + $c) -ForegroundColor Green
            break
        }
    }
    if (-not (Test-Path $envFile)) {
        Write-Host '[i] Файл .env не найден - если пользовались ИИ-помощником, ключ нужно вписать заново.' -ForegroundColor DarkGray
    }
}

# --- 6. Запоминаем зависимости ДО обновления ---
$depFiles = @('package.json', 'package-lock.json')
$before = ($depFiles | ForEach-Object {
    $f = Join-Path $proj $_
    if (Test-Path $f) { $_ + ':' + (Get-FileHash $f).Hash } else { $_ + ':none' }
}) -join '|'

# --- 7. Забираем последнюю версию с GitHub ---
Write-Host 'Проверяю обновления на GitHub...' -ForegroundColor Cyan
$fetched = $false
git fetch origin
if ($LASTEXITCODE -eq 0) {
    $fetched = $true
} else {
    Write-Host '[!] Нет связи с GitHub. Запускаю локальную версию без обновления.' -ForegroundColor Yellow
    Write-Host '    Когда появится интернет - запустите update.bat ещё раз.' -ForegroundColor Yellow
}

if ($fetched) {
    $remote = git rev-parse origin/main
    if (-not $remote) {
        Write-Host '[!] На GitHub не найдена ветка main. Напишите мне об этом.' -ForegroundColor Yellow
        Wait-Exit 1
    }
    $local = ''
    git rev-parse -q --verify HEAD | Out-Null
    if ($LASTEXITCODE -eq 0) { $local = git rev-parse HEAD }

    # --- 7а. Самопроверка: сначала обновляем сам скрипт ----------
    # Если файл update.ps1 отличается от версии на GitHub - сразу
    # забираем свежий и перезапускаем себя, чтобы все остальные
    # шаги выполнились по актуальной версии скрипта.
    $self = Join-Path $proj 'update.ps1'
    if (Test-Path $self) {
        $localSelf = git hash-object -- $self
        $remoteSelf = git rev-parse --verify --quiet 'origin/main:update.ps1'
        if ($localSelf -and $remoteSelf -and ($localSelf -ne $remoteSelf)) {
            if ($env:NUTRIBEAR_SELFCHECK -eq '1') {
                Write-Host '[!] Не удалось обновить сам скрипт - продолжаю текущей версией.' -ForegroundColor Yellow
            } else {
                Write-Host 'Файл update.ps1 отличается от GitHub - обновляю сам себя и перезапускаюсь...' -ForegroundColor Cyan
                git checkout origin/main -- update.ps1
                $env:NUTRIBEAR_SELFCHECK = '1'
                $childArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $self)
                if ($Clean) { $childArgs += @('-Clean', $Clean) }
                & powershell.exe @childArgs
                exit $LASTEXITCODE
            }
        }
    }

    if ($local -eq $remote) {
        Write-Host 'У вас уже последняя версия.' -ForegroundColor Green
        if ($Clean) { Invoke-Clean }
        $updateOk = $true
    } else {
        Write-Host 'Обновляю файлы до последней версии...' -ForegroundColor Cyan
        Invoke-Clean
        git reset --hard origin/main
        if ($LASTEXITCODE -ne 0) {
            # свежая копия без единого коммита - просто ставим ветку main
            # на версию GitHub
            git checkout -B main origin/main
        }
        if ($LASTEXITCODE -ne 0) {
            if ($Clean -match '^(y|д)') {
                Write-Host '[!] Не удалось записать файлы - убираю лишние и пробую ещё раз...' -ForegroundColor Yellow
                git clean -fd
            } else {
                Write-Host '[!] Не удалось записать новые файлы - обычно мешают лишние файлы.' -ForegroundColor Yellow
                $ans = Read-Host 'Удалить лишние файлы и повторить? (y - да / n - нет)'
                if ($ans -match '^(y|д)') { git clean -fd }
            }
            git reset --hard origin/main
            if ($LASTEXITCODE -ne 0) {
                git checkout -B main origin/main
            }
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Host '[!] Обновление не удалось. Пришлите мне весь текст из этого окна.' -ForegroundColor Yellow
            Wait-Exit 1
        }
        git branch --set-upstream-to=origin/main | Out-Null
        Write-Host ('Готово. Версия: ' + $remote.Substring(0, 7)) -ForegroundColor Green
        $updateOk = $true
    }
} else {
    $updateOk = $false
}

# --- 8. Библиотеки: ставим, если изменились, отсутствуют или устарели
$after = ($depFiles | ForEach-Object {
    $f = Join-Path $proj $_
    if (Test-Path $f) { $_ + ':' + (Get-FileHash $f).Hash } else { $_ + ':none' }
}) -join '|'

$nodeModules = Join-Path $proj 'node_modules'
$nmExpo = Join-Path $nodeModules 'expo'
$installReason = ''
if ($before -ne $after) {
    $installReason = 'Состав библиотек изменился'
} elseif (-not (Test-Path $nmExpo)) {
    # В свежей копии (например, из ZIP) node_modules нет вовсе
    $installReason = 'Библиотеки ещё не установлены'
} else {
    # Свежесть по дате: git переписывает package-lock.json только при
    # реальных изменениях зависимостей, поэтому если он новее самой
    # установки node_modules - библиотеки старее кода и могут ломать его.
    $lockFile = Join-Path $proj 'package-lock.json'
    if (Test-Path $lockFile) {
        $lockTime = (Get-Item $lockFile).LastWriteTimeUtc
        $nmTime = (Get-Item $nmExpo).LastWriteTimeUtc
        if ($lockTime -gt $nmTime) {
            $installReason = 'Библиотеки старше файла зависимостей'
        }
    }
}

if ($installReason) {
    Write-Host ($installReason + ' - устанавливаю (может занять несколько минут)...') -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[!] npm install завершился с ошибкой. Продолжаю, но если приложение не запустится - пришлите мне текст ошибки.' -ForegroundColor Yellow
    }
} else {
    Write-Host 'Библиотеки свежие - переустановка не нужна.' -ForegroundColor DarkGray
}

# --- 9. Бейдж версии: пишем хэш этой копии в src/lib/version.js ---
git rev-parse -q --verify HEAD | Out-Null
if ($LASTEXITCODE -eq 0) {
    $short = (git rev-parse --short HEAD).Trim()
    $verFile = Join-Path $proj 'src\lib\version.js'
    $verText = "// Auto-generated by update.ps1 - do not edit.`r`n// The 'More' tab shows this build hash of the running copy.`r`nexport const BUILD_HASH = '$short'`r`n"
    [System.IO.File]::WriteAllText($verFile, $verText)
    # добавляем файл в ЛОКАЛЬНОЕ игнорирование, чтобы он не мешал git
    $exclude = Join-Path $proj '.git\info\exclude'
    if (-not (Test-Path $exclude)) {
        New-Item -ItemType File -Path $exclude -Force | Out-Null
    }
    if (-not (Select-String -Path $exclude -SimpleMatch 'src/lib/version.js' -Quiet)) {
        Add-Content -Path $exclude -Value 'src/lib/version.js'
    }
    Write-Host ('Бейдж версии: сборка ' + $short) -ForegroundColor DarkGray
}

# --- 10. Запоминаем рабочую копию в файле-настройке ---------------
# Сохраняем только после удачного обновления, чтобы не закрепить
# случайную копию при сбое сети.
if ($updateOk) {
    New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
    $utf8bom = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText($cfgFile, $proj, $utf8bom)
}

# --- 11. Запускаем приложение ---
Write-Host ''
Write-Host 'Запускаю NutriBear (остановка: Ctrl+C)...' -ForegroundColor Green
Write-Host ''
npx expo start --clear
