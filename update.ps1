# ==============================================================
#  NutriBear - обновление с GitHub одной командой
# --------------------------------------------------------------
#  Как пользоваться (любой способ):
#    1) Двойной клик по файлу update.bat   - самый простой
#    2) В терминале VS Code:  .\update.ps1
#
#  Скрипт сам:
#    - находит рабочую копию проекта: сначала папка, где лежит
#      сам скрипт (запустили update.bat в папке - её и обновляем),
#      затем путь последней удачно обновлённой копии из файла-
#      настройки %USERPROFILE%\.nutribear\work-path.txt;
#    - предупреждает, если видит две вложенные копии проекта
#      («Похоже, у вас две папки проекта — оставьте одну»);
#    - ищет копию и в папке nutribear-expo на рабочем столе, и
#      перечисляет другие найденные копии: обновляет одну,
#      лишнюю можно удалить (чтобы не путаться, где свежая версия);
#    - проверяет сам себя: если update.ps1 на GitHub новее,
#      сразу обновляет сам себя и перезапускается;
#    - убирает мусорные файлы (git clean -fd), которые могут
#      мешать обновлению (в update.bat - автоматически, без вопросов);
#    - забирает последнюю версию с GitHub
#      (локальные правки файлов заменяются свежей версией);
#    - переносит файл .env (ключи ИИ) из старой копии, если в этой
#      его нет, и держит запасную копию в %USERPROFILE%\.nutribear;
#    - переустанавливает библиотеки, если они изменились, ещё не
#      стоят, устарели или прошлую установку оборвало (например,
#      кончилось место на диске) - перед установкой проверяется
#      свободное место и подсказывается, что освободить;
#    - гасит залипший Metro на порту 8081 перед стартом;
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
# Порядок: ПАПКА САМОГО СКРИПТА (запустили update.bat в папке -
# её и обновляем), затем файл-настройка, затем текущая папка,
# затем типовые места на рабочем столе. Раньше файл-настройка
# стояла первой: в ней сохранялся путь старой ZIP-копии, и скрипт
# уносил обновление туда, даже когда его запускали из основной
# папки (случай Кати: обновилась копия nutribear-expo-main\nutribear-app
# вместо запущенной nutribear-expo, и .env переехал в лишнюю копию).
$proj = ''
$scriptDir = $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$cfgDir  = Join-Path $env:USERPROFILE '.nutribear'
$cfgFile = Join-Path $cfgDir 'work-path.txt'
if ($scriptDir -and (Test-Project $scriptDir)) {
    # папка, где лежит сам update.ps1 - главный ориентир
    $proj = $scriptDir
}
if (-not $proj -and (Test-Path $cfgFile)) {
    $saved = ''
    try { $saved = (Get-Content $cfgFile -Raw).Trim() } catch { $saved = '' }
    if ($saved -and (Test-Project $saved)) { $proj = $saved }
}
if (-not $proj -and (Test-Project (Get-Location).Path)) {
    $proj = (Get-Location).Path
}
if (-not $proj) {
    foreach ($c in @(
        (Join-Path $desktop 'nutribear-expo'),
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

# --- 3б. Вторая копия рядом с основной: подсказываем, как убрать ---
$dupWarned = $false
if (($proj -match '\\nutribear-expo-main\\nutribear-app$') -and
    (-not ($proj -match 'nutribear-expo-main\\nutribear-expo-main'))) {
    $dup = Join-Path $proj '..\nutribear-expo-main'
    if (Test-Path $dup) {
        $dupFull = (Resolve-Path $dup).Path
        Write-Host '[!] Рядом нашлась вторая копия проекта (из ZIP):' -ForegroundColor Yellow
        Write-Host ('    ' + $dupFull)
        Write-Host '    Когда убедитесь, что приложение работает из этой папки,'
        Write-Host '    удалите её двумя командами (обычный Remove-Item падает'
        Write-Host '    на длинных путях в node_modules — robocopy справляется):'
        Write-Host ('    robocopy "' + $env:TEMP + '\empty_dir" "' + $dupFull + '" /MIR')
        Write-Host ('    Remove-Item -Recurse -Force "' + $dupFull + '", "' + $env:TEMP + '\empty_dir"')
        $dupWarned = $true
    }
}

# --- 3в. Несколько копий на рабочем столе: показываем, какую обновляем ---
# Одна рабочая копия - меньше путаницы: обновления всегда приходят
# в неё, а лишние папки со старой версией только мешают.
if ($desktop -and (-not $dupWarned)) {
    $others = @()
    foreach ($n in @('nutribear-expo', 'nutribear-app', 'nutribear-expo-main\nutribear-expo-main')) {
        $p = Join-Path $desktop $n
        if (Test-Project $p) {
            $full = (Resolve-Path $p).Path
            if ($full -ne $proj) { $others += $full }
        }
    }
    if ($others.Count -gt 0) {
        Write-Host '[i] На рабочем столе есть и другие копии проекта:' -ForegroundColor DarkGray
        foreach ($o in $others) { Write-Host ('    ' + $o) -ForegroundColor DarkGray }
        Write-Host '    Обновляю ту, что в строке «Папка проекта» ниже.' -ForegroundColor DarkGray
        Write-Host '    Когда убедитесь, что приложение работает, лишние папки' -ForegroundColor DarkGray
        Write-Host '    лучше удалить в Проводнике - так не будет путаницы.' -ForegroundColor DarkGray
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
        (Join-Path $desktop 'nutribear-expo\.env'),
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
    # Сравниваем хэш ЛОКАЛЬНОГО файла ДО и ПОСЛЕ git checkout из
    # origin. Раньше сравнивали git-хэш файла с хэшем блоба на
    # GitHub: у Кати на Windows core.autocrlf при подсчёте хэша
    # превращает CRLF в LF, а блоб в репозитории хранит CRLF -
    # хэши не сходились даже у одинаковых файлов, и после
    # перезапуска скрипт снова считал себя устаревшим («Не удалось
    # обновить сам скрипт»). Теперь одинаковый файл не перезапуска.
    $self = Join-Path $proj 'update.ps1'
    if ($scriptDir -and (Test-Path (Join-Path $scriptDir 'update.ps1'))) {
        # скрипт может лежать не в обновляемой копии - тогда
        # обновляем файл, из которого реально запущены
        $self = Join-Path $scriptDir 'update.ps1'
    }
    if (Test-Path $self) {
        $selfDir = Split-Path $self -Parent
        $hashBefore = git hash-object -- $self
        Push-Location $selfDir
        try {
            git checkout origin/main -- update.ps1
            if ($LASTEXITCODE -eq 0) {
                $hashAfter = git hash-object -- $self
            } else {
                $hashAfter = $hashBefore
            }
        } finally { Pop-Location }
        if ($hashBefore -ne $hashAfter) {
            if ($env:NUTRIBEAR_SELFCHECK -eq '1') {
                Write-Host '[!] Не удалось обновить сам скрипт - продолжаю текущей версией.' -ForegroundColor Yellow
            } else {
                Write-Host 'Файл update.ps1 отличается от GitHub - обновляю сам себя и перезапускаюсь...' -ForegroundColor Cyan
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

# --- 7б. Свежий update.ps1 раздаём во все известные копии ---------
# Копий проекта может быть несколько (основная и ZIP-копия): если в
# одной из них остался старый скрипт, он снова уводил обновление не
# в ту папку (случай Кати: старый скрипт в nutribear-expo брал путь
# из файла-настройки и тащил всё в ZIP-копию). Раздаём текущий
# скрипт во все валидные копии - где бы ни запустили update.bat,
# везде будет одна и та же версия.
$self = Join-Path $proj 'update.ps1'
if ($scriptDir -and (Test-Path (Join-Path $scriptDir 'update.ps1'))) {
    $self = Join-Path $scriptDir 'update.ps1'
}
if (Test-Path $self) {
    $selfDir = Split-Path $self -Parent
    foreach ($cand in @(
        (Join-Path $desktop 'nutribear-expo'),
        (Join-Path $desktop 'nutribear-app'),
        (Join-Path $desktop 'nutribear-expo-main\nutribear-app'),
        (Join-Path $desktop 'nutribear-expo-main\nutribear-expo-main\nutribear-app'),
        (Join-Path $desktop 'nutribear-expo-main\nutribear-expo-main'),
        (Join-Path $desktop 'nutribear-expo-main')
    )) {
        if ((Test-Project $cand) -and ((Resolve-Path $cand).Path -ne $selfDir)) {
            try { Copy-Item $self (Join-Path $cand 'update.ps1') -Force } catch {}
        }
    }
}

# --- 8. Библиотеки: ставим, если изменились, отсутствуют или устарели
$after = ($depFiles | ForEach-Object {
    $f = Join-Path $proj $_
    if (Test-Path $f) { $_ + ':' + (Get-FileHash $f).Hash } else { $_ + ':none' }
}) -join '|'

$nodeModules = Join-Path $proj 'node_modules'
$nmExpo = Join-Path $nodeModules 'expo'
# Маркер успешной установки: npm install мог оборваться в прошлый
# раз (например, кончилось место на диске - ошибка ENOSPC), а
# package.json с тех пор не менялся - без маркера установка
# повторится и докачает библиотеки, иначе expo не запускается
# («"expo" не является внутренней или внешней командой»)
$okMark = Join-Path $nodeModules '.nutribear-install-ok'
$installReason = ''
if ($before -ne $after) {
    $installReason = 'Состав библиотек изменился'
} elseif (-not (Test-Path $nmExpo)) {
    # В свежей копии (например, из ZIP) node_modules нет вовсе
    $installReason = 'Библиотеки ещё не установлены'
} elseif (-not (Test-Path $okMark)) {
    $installReason = 'Прошлая установка библиотек оборвалась - докачиваю'
} else {
    # Свежесть по дате: git переписывает package-lock.json только при
    # реальных изменениях зависимостей, поэтому если он новее последней
    # успешной установки - библиотеки старее кода и могут ломать его.
    # Сравниваем с маркером установки, а не с папкой expo: npm install
    # без изменений не трогает папки библиотек, и сравнение с папкой
    # запускало установку заново при каждом запуске скрипта (случай
    # Кати: «Библиотеки старше файла зависимостей» на каждом запуске).
    $lockFile = Join-Path $proj 'package-lock.json'
    if (Test-Path $lockFile) {
        $lockTime = (Get-Item $lockFile).LastWriteTimeUtc
        $markTime = (Get-Item $okMark).LastWriteTimeUtc
        if ($lockTime -gt $markTime) {
            $installReason = 'Библиотеки старше файла зависимостей'
        }
    }
}

if ($installReason) {
    # Место на диске: npm распаковывает сотни мегабайт, при нехватке
    # места установка падает с ENOSPC и приложение не стартует
    $driveName = ([System.IO.Path]::GetPathRoot($proj)).TrimEnd('\').TrimEnd(':')
    $drive = Get-PSDrive -Name $driveName -ErrorAction SilentlyContinue
    if ($drive) {
        $freeGb = [math]::Round($drive.Free / 1GB, 1)
        if ($freeGb -lt 3) {
            Write-Host ('[i] Свободно на диске ' + $driveName + ': всего ' + $freeGb + ' ГБ - для установки библиотек нужно ~2-3 ГБ.') -ForegroundColor Yellow
            Write-Host '    Можно освободить: Корзина, старые копии проекта (например,' -ForegroundColor Yellow
            Write-Host '    лишняя папка nutribear-expo-main из ZIP занимает гигабайты),' -ForegroundColor Yellow
            Write-Host '    временные файлы Windows (папка %TEMP%).' -ForegroundColor Yellow
        }
    }
    Write-Host ($installReason + ' - устанавливаю (может занять несколько минут)...') -ForegroundColor Cyan
    if (Test-Path $okMark) { Remove-Item $okMark -Force -ErrorAction SilentlyContinue }
    # EAP=Stop ломает нативный stderr через 2>&1 (NativeCommandError) -
    # на время установки переключаем на Continue (вывод npm сохраняем
    # в переменную, чтобы распознать нехватку места). Строки stderr npm
    # приходят как ErrorRecord - PowerShell рисует их красной ошибкой
    # «NativeCommandError» (случай Кати: пугающий красный блок из-за
    # безобидного npm warn allow-scripts). ForEach-Object { "$_" } превращает
    # их обратно в обычный текст. --no-audit --no-fund убирают блок
    # «23 vulnerabilities ... run npm audit fix» - запуск npm audit fix
    # --force на проекте Expo ломает зависимости.
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & npm install --no-audit --no-fund 2>&1 | ForEach-Object { "$_" } | Tee-Object -Variable npmLog
    $ErrorActionPreference = $prevEap
    if ($LASTEXITCODE -eq 0) {
        New-Item -ItemType File -Path $okMark -Force | Out-Null
    } else {
        $npmText = ($npmLog | ForEach-Object { "$_" }) -join ' '
        if ($npmText -match 'ENOSPC|no space left') {
            Write-Host ''
            Write-Host '[!] На диске кончилось место - npm не смог распаковать библиотеки.' -ForegroundColor Yellow
            Write-Host '    Освободите место: очистите Корзину, удалите лишние копии' -ForegroundColor Yellow
            Write-Host '    проекта (папка nutribear-expo-main из ZIP - гигабайты), файлы' -ForegroundColor Yellow
            Write-Host '    во временной папке Windows (%TEMP%). Затем запустите update.bat' -ForegroundColor Yellow
            Write-Host '    ещё раз - установка докачается с этого места.' -ForegroundColor Yellow
            Wait-Exit 1
        }
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

# --- 10а. Гасим залипший Metro на порту 8081 ----------------------
# Оставшийся от прошлого запуска Metro продолжает раздавать старый
# битый бандл ("Something went wrong" на телефоне). Останавливаем,
# чтобы новый старт гарантированно отдал свежий.
$stale = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($stale) {
    Write-Host 'На порту 8081 висит старый Metro - останавливаю его...' -ForegroundColor Cyan
    try { Stop-Process -Id $stale.OwningProcess -Force -ErrorAction Stop; Start-Sleep -Seconds 2 } catch {}
}

# --- 11. Запускаем приложение ---
Write-Host ''
Write-Host 'Запускаю NutriBear (остановка: Ctrl+C)...' -ForegroundColor Green
Write-Host ''
npx expo start --clear
