<#
  Stops the Study Hub server started by the launcher (the process listening on the port).

    powershell -ExecutionPolicy Bypass -File scripts\windows\stop-study-hub.ps1 [-Port 5180]
#>
param([int]$Port = 0)

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if ($Port -eq 0) {
  $Port = 5180
  $file = Join-Path $Root ".env"
  if (Test-Path $file) {
    foreach ($line in Get-Content $file -Encoding UTF8) {
      if ($line -match "^\s*PORT\s*=\s*(\d+)") { $Port = [int]$Matches[1] }
    }
  }
}

$owners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
$stopped = 0
foreach ($id in $owners) {
  $process = Get-Process -Id $id -ErrorAction SilentlyContinue
  # Only Node: never stop some other program that happens to use the port.
  if ($process -and $process.ProcessName -eq "node") {
    Stop-Process -Id $id -Force
    $stopped++
  }
}
if ($stopped -gt 0) { Write-Host "Study Hub остановлен (порт $Port)." }
else { Write-Host "На порту $Port сервер Study Hub не запущен." }
