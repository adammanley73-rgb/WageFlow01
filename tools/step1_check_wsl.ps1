# File: C:\Users\adamm\Projects\wageflow01\tools\step1_check_wsl.ps1
# Purpose: Verify and repair WSL2 prerequisites on Windows so Docker Desktop can start its Linux engine.

# Stop on errors
$ErrorActionPreference = "Stop"

function Require-Admin {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script needs Administrator rights. Right-click PowerShell and run as Administrator." -ForegroundColor Yellow
    exit 1
  }
}

function Step-Header($text) {
  Write-Host ""
  Write-Host "=== $text ===" -ForegroundColor Cyan
}

function Check-Feature($name) {
  $feature = dism /online /Get-FeatureInfo /FeatureName:$name | Out-String
  return ($feature -match "State : Enabled")
}

function Enable-Feature($name) {
  Step-Header "Enabling Windows feature: $name"
  dism /online /Enable-Feature /FeatureName:$name /All /NoRestart | Out-Null
}

function Check-ServiceRunning($name) {
  $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
  if ($null -eq $svc) { return $false }
  return $svc.Status -eq 'Running'
}

function Ensure-ServiceRunning($name) {
  if (-not (Check-ServiceRunning $name)) {
    Step-Header "Starting service: $name"
    Start-Service $name -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
}

function Exec-Capture($cmd, $args) {
  try {
    $p = Start-Process -FilePath $cmd -ArgumentList $args -NoNewWindow -PassThru -Wait -RedirectStandardOutput "$env:TEMP\out.txt" -RedirectStandardError "$env:TEMP\err.txt"
    $out = Get-Content "$env:TEMP\out.txt" -Raw
    $err = Get-Content "$env:TEMP\err.txt" -Raw
    return @{ Code = $p.ExitCode; Out = $out; Err = $err }
  } catch {
    return @{ Code = 1; Out = ""; Err = "$($_.Exception.Message)" }
  } finally {
    Remove-Item "$env:TEMP\out.txt","$env:TEMP\err.txt" -ErrorAction SilentlyContinue
  }
}

Require-Admin

Step-Header "1) Enable core Windows features for WSL2"
$wslEnabled = Check-Feature "Microsoft-Windows-Subsystem-Linux"
$vmpEnabled = Check-Feature "VirtualMachinePlatform"

if (-not $wslEnabled) { Enable-Feature "Microsoft-Windows-Subsystem-Linux" }
if (-not $vmpEnabled) { Enable-Feature "VirtualMachinePlatform" }

$recheckWSL = Check-Feature "Microsoft-Windows-Subsystem-Linux"
$recheckVMP = Check-Feature "VirtualMachinePlatform"

if (-not ($recheckWSL -and $recheckVMP)) {
  Write-Host "Failed to enable required Windows features. Reboot and run this script again." -ForegroundColor Red
  exit 1
}

Step-Header "2) Ensure LxssManager service is running"
Ensure-ServiceRunning "LxssManager"

Step-Header "3) Set WSL default version to 2"
$setDefault = Exec-Capture "wsl.exe" "--set-default-version 2"
if ($setDefault.Code -ne 0) {
  Write-Host "WSL default version set command reported an issue. This can be normal if kernel update is needed." -ForegroundColor Yellow
  Write-Host $setDefault.Err
}

Step-Header "4) Check WSL status and kernel"
$status = Exec-Capture "wsl.exe" "--status"
Write-Host $status.Out
if ($status.Out -match "Kernel version:") {
  $kernel = ($status.Out | Select-String "Kernel version:" -CaseSensitive).ToString()
  Write-Host "Detected $kernel" -ForegroundColor Green
}
if ($status.Out -match "Default Version: 2") {
  Write-Host "WSL default is set to 2." -ForegroundColor Green
} else {
  Write-Host "WSL default is not 2. The set command may require a reboot or kernel update." -ForegroundColor Yellow
}

Step-Header "5) Check installed Linux distros"
$list = Exec-Capture "wsl.exe" "--list --verbose"
Write-Host $list.Out
$hasDistro = ($list.Out -match "Ubuntu") -or ($list.Out -match "Alpine") -or ($list.Out -match "Debian") -or ($list.Out -match "kali") -or ($list.Out -match "openSUSE")

if (-not $hasDistro) {
  Write-Host "No Linux distro found. Installing Ubuntu will fix 90% of Docker Desktop startup problems." -ForegroundColor Yellow
  Write-Host "Attempting to install Ubuntu..." -ForegroundColor Cyan
  $install = Exec-Capture "wsl.exe" "--install -d Ubuntu"
  Write-Host $install.Out
  if ($install.Code -ne 0) {
    Write-Host "Automatic install failed. You may need to reboot, then run:" -ForegroundColor Yellow
    Write-Host "wsl --install -d Ubuntu"
  } else {
    Write-Host "Ubuntu installation initiated. A reboot is usually required." -ForegroundColor Green
  }
}

Step-Header "6) Recommend reboot if features were changed or a distro was installed"
$rebootNeeded = $false
if (-not $wslEnabled -or -not $vmpEnabled) { $rebootNeeded = $true }
if (-not $hasDistro) { $rebootNeeded = $true }

if ($rebootNeeded) {
  Write-Host ""
  Write-Host "Action required:" -ForegroundColor Yellow
  Write-Host "1) Reboot your PC now." -ForegroundColor Yellow
  Write-Host "2) After reboot, run this script again to confirm WSL2 status." -ForegroundColor Yellow
  exit 0
}

Step-Header "7) Quick WSL self-test"
# Launch a trivial command in default distro
$uname = Exec-Capture "wsl.exe" "-e sh -c ""uname -r && echo OK"""
if ($uname.Code -eq 0 -and $uname.Out -match "OK") {
  Write-Host "WSL responds from Linux userland. Good." -ForegroundColor Green
} else {
  Write-Host "WSL test failed. Reboot, then re-run this script. If it persists, WSL is unhealthy." -ForegroundColor Red
  exit 1
}

Step-Header "WSL2 prerequisites look healthy. Proceed to Docker Desktop startup in the next step."
