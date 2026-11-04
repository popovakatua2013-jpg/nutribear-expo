@echo off
chcp 65001 >nul
title NutriBear launcher

rem ===== Find the real project folder (handles nested extraction) =====
if not exist package.json (
  if exist nutribear-expo\package.json (
    cd nutribear-expo
  )
)

if not exist package.json (
  echo.
  echo [!] package.json not found in this folder.
  echo     Please extract the full zip archive first.
  echo.
  pause
  exit /b
)

rem ===== Update from GitHub (only if this folder is a git clone) =====
where git >nul 2>nul
if errorlevel 1 goto no-git
if not exist ".git" goto no-git

echo.
echo ============================================
echo   Checking for updates (git pull)...
echo ============================================
echo.
call git pull origin main
if errorlevel 1 (
  echo.
  echo [!] git pull stumbled - resetting package-lock.json and retrying...
  call git checkout -- package-lock.json
  call git pull origin main
  if errorlevel 1 (
    echo.
    echo [!] Could not update - starting the current version anyway.
  )
)

:no-git
rem Folder is not a git clone - for example, extracted from a zip - update skipped

echo.
echo ============================================
echo   NutriBear - installing packages...
echo   (first run may take a few minutes)
echo ============================================
echo.
call npm install
if errorlevel 1 (
  echo.
  echo [!] npm install failed.
  echo     Check that Node.js is installed: https://nodejs.org
  echo.
  pause
  exit /b
)

echo.
echo ============================================
echo   Starting NutriBear...
echo   Scan the QR code with the Expo Go app.
echo   Phone and PC must be on the same Wi-Fi.
echo ============================================
echo.
call npx expo start
pause
