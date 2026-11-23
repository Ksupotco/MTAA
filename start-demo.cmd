@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PORT=18762"
if not exist "logs" mkdir "logs"
if not exist "node_modules" (
  echo Installing dependencies (first run)...
  call npm install --no-audit --no-fund
)
echo Building single-file UI...
call npm run build
if errorlevel 1 (
  echo Build failed. See the messages above.
  pause
  exit /b 1
)
echo Whale Demo: http://127.0.0.1:%PORT%/
echo Keep this window open while using the demo.
node server.mjs >> "logs\server.log" 2>&1
echo Server stopped. Details: logs\server.log
pause
