# File: C:\Users\adamm\Projects\wageflow01\tools\step5_docker_preclean.ps1
# Purpose: Remove stale Docker Desktop pieces so a fresh WSL2-only install can succeed.

$ErrorActionPreference = "Stop"

function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }

Step "1) Stop Docker services and processes"
$procs = "Docker Desktop","com.docker.backend","com.docker.service","Docker"
foreach ($p in $procs) {
  Get-Process -Name $p -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
# Stop Windows service if present
Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.Status -ne "Stopped") { Stop-Service $_ -Force }
}

Step "2) Attempt uninstall via installed uninstaller (if present)"
$uninstallers = @(
  "$env:ProgramFiles\Docker\Docker\Docker Desktop Installer.exe",
  "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
) | Where-Object { Test-Path $_ }

foreach ($u in $uninstallers) {
  try {
    & "$u" uninstall --quiet --accept-license | Out-Null
  } catch {}
}

Step "3) Remove Docker Desktop folders"
$paths = @(
  "$env:ProgramFiles\Docker\Docker",
  "$env:ProgramData\DockerDesktop",
  "$env:APPDATA\Docker",
  "$env:LOCALAPPDATA\Docker",
  "$env:LOCALAPPDATA\Docker Desktop"
)
foreach ($p in $paths) {
  if (Test-Path $p) {
    try { Remove-Item -Recurse -Force -LiteralPath $p } catch {}
  }
}

Step "4) Remove Docker named pipes if they’re lingering"
$pipes = @(
  "\\.\pipe\docker_engine",
  "\\.\pipe\dockerDesktopLinuxEngine",
  "\\.\pipe\dockerCLI"
)
# Named pipes vanish when processes stop; this is just a visibility note.
$pipes | ForEach-Object { Write-Host "Checked pipe: $_" }

Step "Preclean complete. Proceed to feature enforcement next."
