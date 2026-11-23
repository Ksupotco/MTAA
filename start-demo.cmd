@echo off
cd /d "%~dp0"
set "PORT=18761"
if not exist "..\.botharness\logs\whale-demo" mkdir "..\.botharness\logs\whale-demo"
if not exist "node_modules" (
  echo Installing dependencies (first run)...
  call npm install --no-audit --no-fund
)
echo Building single-file UI...
call npm run build
echo Whale Demo: http://127.0.0.1:18761/
echo Keep this window open while using the demo.
node server.mjs >> "..\.botharness\logs\whale-demo\manual-server.log" 2>&1
echo Server stopped. Details: ..\.botharness\logs\whale-demo\manual-server.log
pause
