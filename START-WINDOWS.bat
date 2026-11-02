@echo off
chcp 65001 >nul
title NutriBear launcher

rem ===== Find the real project folder (handles nested extraction) =====
rem The zip often unpacks as nutribear-expo-main\nutribear-app\...,
rem so if this folder has no project, we search one or two levels
rem down for a folder that has both package.json and src.
if exist package.json if exist src goto :project

for /d %%D in (*) do (
  if exist "%%D\package.json" if exist "%%D\src" (
    cd /d "%%D"
    goto :project
  )
)

for /d %%D in (*) do for /d %%E in ("%%D\*") do (
  if exist "%%E\package.json" if exist "%%E\src" (
    cd /d "%%E"
    goto :project
  )
)

echo.
echo [!] package.json not found in this folder.
echo     Please extract the full zip archive first.
echo.
pause
exit /b

:project
echo.
echo ============================================
echo   NutriBear - project folder found: %CD%
echo   Installing packages...
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
