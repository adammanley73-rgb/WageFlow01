# File: C:\Users\adamm\Projects\wageflow01\tools\step3_start_docker_wsl.ps1
# Purpose: Force Docker Desktop to Linux engine with WSL2, integrate 'Ubuntu', start it, wait for pipe, verify hello-world.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Require-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Run PowerShell as Administrator and re-run this script." -ForegroundColor Yellow
    exit 1
  }
}

function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }

function Test-NamedPipe($pipePath) {
  try {
    $fs = New-Object System.IO.FileStream($pipePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $fs.Close()
    return $true
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

function Ensure-Dir($path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
}

Require-Admin

Step "1) Verify Docker Desktop install paths"
$dockerDesktopExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
$dockerCliExe     = Join-Path $env:ProgramFiles "Docker\Docker\DockerCli.exe"
if (-not (Test-Path $dockerDesktopExe) -or -not (Test-Path $dockerCliExe)) {
  Write-Host "Docker Desktop not found at $($env:ProgramFiles)\Docker\Docker. Install Docker Desktop, then re-run." -ForegroundColor Red
  exit 1
}

Step "2) Force WSL2 defaults and Ubuntu responsiveness"
# Set WSL default version to 2 (idempotent)
wsl.exe --set-default-version 2 | Out-Null

# Force default distro to the literal 'Ubuntu'. If your machine named it differently, this still works if 'Ubuntu' exists.
try { wsl.exe --set-default Ubuntu | Out-Null } catch {}

# Make sure WSL service is up and Ubuntu responds at all
Start-Service LxssManager -ErrorAction SilentlyContinue
$probe = wsl.exe -d Ubuntu -e sh -c "echo PING" 2>&1
Write-Host $probe
if ($LASTEXITCODE -ne 0 -or ($probe -notmatch "PING")) {
  Write-Host "Ubuntu did not respond. Open the Start menu, launch 'Ubuntu' once to complete setup, then re-run this script." -ForegroundColor Red
  exit 1
}

Step "3) Stop stale Docker processes"
$procs = "Docker Desktop","com.docker.backend","com.docker.service","Docker"
foreach ($p in $procs) { Get-Process -Name $p -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Step "4) Force Linux engine"
& $dockerCliExe -SwitchLinuxEngine | Out-Null

Step "5) Overwrite Docker settings for WSL2 + Ubuntu integration"
$settingsPath = Join-Path $env:APPDATA "Docker\settings.json"
Ensure-Dir (Split-Path $settingsPath -Parent)

# Minimal, known-good config
$desired = @{
  wslEngineEnabled     = $true
  useWindowsContainers = $false
  autoStart            = $true
  integratedWslDistros = @("Ubuntu")
}

# Write the config atomically
($desired | ConvertTo-Json -Depth 5) | Out-File -FilePath $settingsPath -Encoding UTF8

Step "6) Start Docker Desktop UI"
Start-Process -FilePath $dockerDesktopExe
Start-Sleep -Seconds 3

Step "7) Wait for Docker Linux engine pipe (\\.\pipe\dockerDesktopLinuxEngine)"
$pipe = "\\.\pipe\dockerDesktopLinuxEngine"
$ok = Wait-ForPipe -pipePath $pipe -timeoutSec 300
if (-not $ok) {
  Write-Host "The Linux engine pipe did not appear. Do the two manual toggles, then re-run this script:" -ForegroundColor Yellow
  Write-Host " - Open Docker Desktop > Settings > General > enable 'Use the WSL 2 based engine'." -ForegroundColor Yellow
  Write-Host " - Settings > Resources > WSL Integration > enable 'Ubuntu' and click 'Apply & Restart'." -ForegroundColor Yellow
  exit 1
}

Step "8) Verify docker info"
$info = docker info 2>&1
Write-Host $info
if ($LASTEXITCODE -ne 0) {
  Write-Host "docker info failed. Waiting 15s and retrying..." -ForegroundColor Yellow
  Start-Sleep -Seconds 15
  $info = docker info 2>&1
  Write-Host $info
  if ($LASTEXITCODE -ne 0) {
    Write-Host "docker info still failing. Open Docker Desktop UI for errors, then re-run this script." -ForegroundColor Red
    exit 1
  }
}

Step "9) Run hello-world"
$hello = docker run --rm hello-world 2>&1
Write-Host $hello
if ($LASTEXITCODE -ne 0 -or ($hello -notmatch "Hello from Docker")) {
  Write-Host "hello-world did not succeed. Pulling image and retrying..." -ForegroundColor Yellow
  docker pull hello-world | Write-Host
  $hello2 = docker run --rm hello-world 2>&1
  Write-Host $hello2
  if ($LASTEXITCODE -ne 0 -or ($hello2 -notmatch "Hello from Docker")) {
    Write-Host "hello-world failed. Check Docker Desktop UI for diagnostics, then try again." -ForegroundColor Red
    exit 1
  }
}

Write-Host "`nDocker Desktop WSL2 engine is healthy. You can now run 'supabase db pull'." -ForegroundColor Green
