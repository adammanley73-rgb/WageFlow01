# File: C:\Users\adamm\Projects\wageflow01\tools\step4_verify_docker_pipe.ps1
# Purpose: After enabling WSL2 + Ubuntu in Docker Desktop UI, confirm the Linux engine pipe and run hello-world.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Test-NamedPipe($pipePath) {
  try {
    $fs = New-Object System.IO.FileStream($pipePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $fs.Close(); return $true
  } catch { return $false }
}
function Wait-ForPipe($pipePath, $timeoutSec) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
    if (Test-NamedPipe $pipePath) { return $true }
    Start-Sleep -Seconds 3
  }
  return $false
}

Step "1) Show WSL status"
wsl.exe --status 2>&1 | Write-Host
wsl.exe --list --verbose 2>&1 | Write-Host

Step "2) Show Docker Desktop settings.json summary"
$settingsPath = Join-Path $env:APPDATA "Docker\settings.json"
if (Test-Path $settingsPath) {
  try {
    $j = Get-Content $settingsPath -Raw | ConvertFrom-Json
    Write-Host ("wslEngineEnabled: {0}" -f $j.wslEngineEnabled)
    Write-Host ("useWindowsContainers: {0}" -f $j.useWindowsContainers)
    Write-Host ("integratedWslDistros: {0}" -f (($j.integratedWslDistros | Where-Object { $_ }) -join ", "))
  } catch {
    Write-Host "settings.json exists but is not valid JSON."
  }
} else {
  Write-Host "settings.json not found at $settingsPath"
}

Step "3) Wait for Docker Linux engine pipe"
$pipe = "\\.\pipe\dockerDesktopLinuxEngine"
$ok = Wait-ForPipe -pipePath $pipe -timeoutSec 240
if (-not $ok) {
  Write-Host "Pipe not found. In Docker Desktop do BOTH toggles, click Apply & Restart, then run this script again:" -ForegroundColor Yellow
  Write-Host " - Settings > General > enable 'Use the WSL 2 based engine'." -ForegroundColor Yellow
  Write-Host " - Settings > Resources > WSL Integration > enable 'Ubuntu'." -ForegroundColor Yellow
  exit 1
}

Step "4) docker info"
$info = docker info 2>&1
Write-Host $info
if ($LASTEXITCODE -ne 0) {
  Write-Host "docker info failed. Wait 15s, then try again." -ForegroundColor Yellow
  Start-Sleep -Seconds 15
  $info = docker info 2>&1
  Write-Host $info
  if ($LASTEXITCODE -ne 0) { Write-Host "docker info still failing." -ForegroundColor Red; exit 1 }
}

Step "5) hello-world"
$hello = docker run --rm hello-world 2>&1
Write-Host $hello
if ($LASTEXITCODE -ne 0 -or ($hello -notmatch "Hello from Docker")) {
  Write-Host "hello-world failed. Pulling image and retrying..." -ForegroundColor Yellow
  docker pull hello-world | Write-Host
  $hello2 = docker run --rm hello-world 2>&1
  Write-Host $hello2
  if ($LASTEXITCODE -ne 0 -or ($hello2 -notmatch "Hello from Docker")) {
    Write-Host "hello-world still failed. Check Docker Desktop UI > Troubleshoot for errors." -ForegroundColor Red
    exit 1
  }
}

Write-Host "`nDocker WSL2 engine is healthy. Next step: supabase db pull." -ForegroundColor Green
