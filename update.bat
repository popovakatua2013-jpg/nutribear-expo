@echo off
title NutriBear Update
echo.
choice /C YN /M "Delete junk files before update (git clean -fd)?"
if errorlevel 2 (set "CLEANARG=-Clean N") else (set "CLEANARG=-Clean Y")
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" %CLEANARG%
echo.
pause
