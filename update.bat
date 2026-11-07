@echo off
title NutriBear Update
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" -Clean Y
echo.
pause
