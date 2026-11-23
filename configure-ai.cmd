@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Configure the model key locally. The key is hidden and saved only to .env (git-ignored).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0configure-ai.ps1"
if errorlevel 1 echo Configuration did not finish. Do not paste the key into chat.
pause
