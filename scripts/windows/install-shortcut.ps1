<#
  Puts "Study Hub" on the desktop and in the Start menu (with "Остановить Study Hub" next to
  it). Run it again after moving the project folder; -Remove takes the shortcuts away.

    powershell -ExecutionPolicy Bypass -File scripts\windows\install-shortcut.ps1 [-Remove]
#>
param([switch]$Remove)

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Desktop = [Environment]::GetFolderPath("Desktop")
$Menu = Join-Path ([Environment]::GetFolderPath("Programs")) "Study Hub"
$Icon = Join-Path $PSScriptRoot "study-hub.ico"
$PowerShell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

$Shortcuts = @(
  @{ Path = (Join-Path $Desktop "Study Hub.lnk"); Script = "start-study-hub.ps1"; Style = 7; Text = "Открыть Study Hub" },
  @{ Path = (Join-Path $Menu "Study Hub.lnk"); Script = "start-study-hub.ps1"; Style = 7; Text = "Открыть Study Hub" },
  @{ Path = (Join-Path $Menu "Остановить Study Hub.lnk"); Script = "stop-study-hub.ps1"; Style = 7; Text = "Остановить сервер Study Hub" }
)

if ($Remove) {
  foreach ($item in $Shortcuts) { Remove-Item $item.Path -ErrorAction SilentlyContinue }
  Remove-Item $Menu -ErrorAction SilentlyContinue
  Write-Host "Ярлыки Study Hub убраны."
  exit 0
}

New-Item -ItemType Directory -Force $Menu | Out-Null
$shell = New-Object -ComObject WScript.Shell
foreach ($item in $Shortcuts) {
  $link = $shell.CreateShortcut($item.Path)
  $link.TargetPath = $PowerShell
  $link.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot $item.Script)`""
  $link.WorkingDirectory = $Root
  $link.IconLocation = "$Icon,0"
  # 7 = minimized: the launcher window only shows up when something needs attention.
  $link.WindowStyle = $item.Style
  $link.Description = $item.Text
  $link.Save()
}
Write-Host "Готово: ярлык «Study Hub» на рабочем столе и в меню «Пуск»."
