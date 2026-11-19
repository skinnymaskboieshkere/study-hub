<#
  Study Hub launcher for Windows (stage 7c): starts the server in the background when it is not
  running yet, then opens the app in its own window (Chrome or Edge, app mode).

    powershell -ExecutionPolicy Bypass -File scripts\windows\start-study-hub.ps1
    ... -Port 5195 -DataDir data\sandbox -VaultPath vault -NoBrowser   (checks on a sandbox)

  The desktop shortcut made by install-shortcut.ps1 runs this script.
#>
param(
  [int]$Port = 0,
  [string]$DataDir = "",
  [string]$VaultPath = "",
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "Study Hub"

function Read-EnvValue([string]$Name) {
  $file = Join-Path $Root ".env"
  if (-not (Test-Path $file)) { return "" }
  foreach ($line in Get-Content $file -Encoding UTF8) {
    if ($line -match "^\s*$Name\s*=\s*(.*)$") { return $Matches[1].Trim().Trim('"') }
  }
  return ""
}

function Test-Server([int]$ServerPort) {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$ServerPort/api/health" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Open-App([string]$Url) {
  if ($NoBrowser) { return }
  # App mode: a window without tabs and the address bar, like the installed app.
  $browsers = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  $browser = $browsers | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if ($browser) { Start-Process $browser -ArgumentList "--app=$Url" }
  else { Start-Process $Url }
}

function Get-NewestWrite([string[]]$Paths) {
  $items = foreach ($path in $Paths) {
    if (Test-Path $path) { Get-ChildItem $path -Recurse -File -ErrorAction SilentlyContinue }
  }
  ($items | Measure-Object -Property LastWriteTime -Maximum).Maximum
}

if ($Port -eq 0) {
  $fromEnv = Read-EnvValue "PORT"
  $Port = if ($fromEnv) { [int]$fromEnv } else { 5180 }
}
$Url = "http://127.0.0.1:$Port/"

try {
  if (Test-Server $Port) {
    Write-Host "Study Hub уже работает — открываю."
    Open-App $Url
    exit 0
  }

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Не найден Node.js. Установи Node.js 22 с https://nodejs.org и запусти ярлык снова."
  }
  if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    Write-Host "Первый запуск: ставлю зависимости (npm install)…"
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install не удался" }
  }

  # A build older than the sources (after git pull) is rebuilt; ~15 seconds.
  $built = Join-Path $Root "dist\client\index.html"
  $server = Join-Path $Root "dist\server\index.js"
  $sources = Get-NewestWrite @("src", "public", "index.html", "package.json")
  if (-not (Test-Path $built) -or -not (Test-Path $server) -or $sources -gt (Get-Item $built).LastWriteTime) {
    Write-Host "Собираю приложение (npm run build)…"
    npm run build | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Сборка не удалась: запусти npm run build в папке проекта, чтобы увидеть ошибку" }
  }

  $env:PORT = "$Port"
  if ($DataDir) { $env:DATA_DIR = $DataDir }
  if ($VaultPath) { $env:VAULT_PATH = $VaultPath }
  $logDir = if ($DataDir) { Join-Path $Root $DataDir } else { Join-Path $Root "data" }
  New-Item -ItemType Directory -Force $logDir | Out-Null
  $log = Join-Path $logDir "server.log"
  $errorLog = Join-Path $logDir "server-error.log"

  Write-Host "Запускаю сервер Study Hub…"
  Start-Process node -ArgumentList "dist/server/index.js" -WorkingDirectory $Root `
    -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $errorLog | Out-Null

  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Server $Port) {
      Write-Host "Готово: $Url"
      Open-App $Url
      exit 0
    }
  }
  throw "Сервер не ответил за 30 секунд. Подробности: $errorLog"
} catch {
  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  if (Test-Path variable:errorLog) {
    if (Test-Path $errorLog) { Get-Content $errorLog -Tail 15 }
  }
  Read-Host "Нажми Enter, чтобы закрыть окно"
  exit 1
}
