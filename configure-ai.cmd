@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PORT=18762"
set "WHALE_DEMO_CONFIG=%~dp0.env"
set "WHALE_DEMO_SCRIPT=%~dp0server.mjs"
set "WHALE_DEMO_LOGS=%~dp0..\logs\81-记忆对话闭环"
echo Configure DeepSeek locally. The key will be hidden and will not enter chat.
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $secret=Read-Host 'Paste API key, then Enter (hidden)' -AsSecureString; $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret); try { $key=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Trim(); if(!$key -or $key.IndexOfAny([char[]]@(9,10,13,32,34)) -ge 0){throw 'Invalid key format'}; $old=@(); if(Test-Path -LiteralPath $env:WHALE_DEMO_CONFIG){$old=[IO.File]::ReadAllLines($env:WHALE_DEMO_CONFIG) | Where-Object {$_ -notmatch '^s*(DEEPSEEK_API_KEY|DEEPSEEK_MODEL|DEEPSEEK_BASE_URL)s*='}}; $lines=@($old); $lines+=('DEEPSEEK_API_KEY='+$key); $lines+='DEEPSEEK_MODEL=deepseek-flash'; $lines+='DEEPSEEK_BASE_URL=https://api.deepseek.com'; [IO.File]::WriteAllLines($env:WHALE_DEMO_CONFIG,$lines,(New-Object Text.UTF8Encoding($false))); $key=$null } finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}; Write-Host 'Saved locally. Restarting this demo...'; foreach($c in @(Get-NetTCPConnection -LocalPort 18762 -State Listen -ErrorAction SilentlyContinue)){ $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$c.OwningProcess); if($p.Name -ne 'node.exe' -or !$p.CommandLine.Contains($env:WHALE_DEMO_SCRIPT)){throw 'Port occupied by another application; restart manually'}; Stop-Process -Id $c.OwningProcess }; New-Item -ItemType Directory -Force $env:WHALE_DEMO_LOGS | Out-Null; Start-Process -FilePath (Get-Command node).Source -ArgumentList ([string][char]34+$env:WHALE_DEMO_SCRIPT+[string][char]34) -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput (Join-Path $env:WHALE_DEMO_LOGS 'configured-server.log') -RedirectStandardError (Join-Path $env:WHALE_DEMO_LOGS 'configured-server-error.log'); Write-Host 'Ready: http://127.0.0.1:18762/'"
if errorlevel 1 echo Configuration did not finish. Do not paste the key into chat.
pause
