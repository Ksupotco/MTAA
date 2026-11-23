# 本机配置模型密钥：隐藏输入，只写入被 Git 忽略的 .env，然后重启 18762 预览。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$config = Join-Path $root '.env'; $script = Join-Path $root 'server.mjs'; $logs = Join-Path $root 'logs'
Write-Host '选择模型节点：'
Write-Host '  1) AgentScope 节点（SSE 流式，模型列表实时拉取）'
Write-Host '  2) DeepSeek'
$pick = Read-Host '输入 1 或 2'
if ($pick -eq '2') { $prefix = 'DEEPSEEK'; $base = 'https://api.deepseek.com'; $model = 'deepseek-flash'; $prov = 'deepseek' }
else { $prefix = 'AGENTSCOPE'; $base = 'https://platform.agentscope.io/v1'; $model = 'qwen3.8-flash'; $prov = 'agentscope' }
$secret = Read-Host 'Paste API key, then Enter (hidden)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Trim()
  if (!$key -or $key.IndexOfAny([char[]]@(9,10,13,32,34)) -ge 0) { throw 'Invalid key format' }
  $old = @(); if (Test-Path -LiteralPath $config) { $old = [IO.File]::ReadAllLines($config) | Where-Object { $_ -notmatch ('^\s*(' + $prefix + '_API_KEY|' + $prefix + '_MODEL|' + $prefix + '_BASE_URL|AI_PROVIDER)\s*=') } }
  $lines = @($old) + @(($prefix + '_API_KEY=' + $key), ($prefix + '_BASE_URL=' + $base), ($prefix + '_MODEL=' + $model), ('AI_PROVIDER=' + $prov))
  [IO.File]::WriteAllLines($config, $lines, (New-Object Text.UTF8Encoding($false))); $key = $null
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
Write-Host 'Saved locally. Restarting this demo...'
foreach ($c in @(Get-NetTCPConnection -LocalPort 18762 -State Listen -ErrorAction SilentlyContinue)) {
  $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $c.OwningProcess)
  if ($p.Name -ne 'node.exe' -or !$p.CommandLine.Contains($script)) { throw 'Port occupied by another application; restart manually' }
  Stop-Process -Id $c.OwningProcess
}
New-Item -ItemType Directory -Force $logs | Out-Null
Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"' + $script + '"') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'configured-server.log') -RedirectStandardError (Join-Path $logs 'configured-server-error.log')
Write-Host 'Ready: http://127.0.0.1:18762/'
