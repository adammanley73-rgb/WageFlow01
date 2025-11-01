# C:\Users\adamm\Projects\wageflow01\tools\start_docker_desktop.ps1
# Starts Docker Desktop and waits for the Linux engine pipe to be available.

$ErrorActionPreference = 'Stop'
$dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path -LiteralPath $dockerExe)) {
  throw "Docker Desktop not found at: $dockerExe. Install Docker Desktop for Windows."
}

# Start Docker Desktop if not already running
$proc = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $proc) {
  Write-Host "Starting Docker Desktop..."
  Start-Process -FilePath $dockerExe | Out-Null
} else {
  Write-Host "Docker Desktop already running."
}

# Wait for the Linux engine named pipe to exist
$pipe = "\\.\pipe\dockerDesktopLinuxEngine"
$maxWaitSec = 180
$sw = [Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt $maxWaitSec) {
  if (Test-Path -LiteralPath $pipe) { break }
  Start-Sleep -Seconds 3
  Write-Host "Waiting for Docker Linux engine..."
}

if (-not (Test-Path -LiteralPath $pipe)) {
  throw "Docker Linux engine pipe not found after $maxWaitSec seconds: $pipe. Open Docker Desktop and ensure WSL2 backend is enabled."
}

# Sanity checks
docker version
docker run --rm hello-world
Write-Host "Docker is up."
