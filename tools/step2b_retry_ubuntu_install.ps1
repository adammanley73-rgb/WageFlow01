# File: C:\Users\adamm\Projects\wageflow01\tools\step2b_retry_ubuntu_install.ps1
# Purpose: After a reboot, install Ubuntu for WSL2 or provide a clean fallback.

$ErrorActionPreference = "Stop"

function Require-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Run PowerShell as Administrator and re-run this script." -ForegroundColor Yellow
    exit 1
  }
}

function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }

function Exec($file, $args) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $file
  $psi.Arguments = ($args -join ' ')
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  return @{ Code = $p.ExitCode; Out = $out; Err = $err }
}

Require-Admin

Step "1) Verify WSL features and default version"
# Set default version again in case the reboot finalized feature enablement
$setv = Exec "wsl.exe" @("--set-default-version","2")
if ($setv.Code -ne 0) {
  Write-Host "wsl --set-default-version 2 returned a warning. Continuing." -ForegroundColor Yellow
  if ($setv.Err) { Write-Host $setv.Err }
}

Step "2) Check current distros"
$list = Exec "wsl.exe" @("--list","--verbose")
Write-Host $list.Out
$hasUbuntu = ($list.Out -match "Ubuntu")

if (-not $hasUbuntu) {
  Step "3) List available online distros (sanity check)"
  $online = Exec "wsl.exe" @("--list","--online")
  Write-Host $online.Out

  Step "4) Attempt to install Ubuntu"
  $inst = Exec "wsl.exe" @("--install","-d","Ubuntu")
  Write-Host $inst.Out
  if ($inst.Code -ne 0) {
    Write-Host "Automatic install failed or requires Store components." -ForegroundColor Yellow
    Write-Host "Fallback options:" -ForegroundColor Yellow
    Write-Host "A) Open Microsoft Store, search 'Ubuntu', install 'Ubuntu' by Canonical." -ForegroundColor Yellow
    Write-Host "B) Or run: wsl --install Ubuntu-22.04 if listed in --list --online." -ForegroundColor Yellow
    Write-Host "After installing, launch 'Ubuntu' once from Start Menu to create a UNIX user." -ForegroundColor Yellow
    exit 0
  } else {
    Write-Host "Ubuntu installation initiated. If nothing appears, open Start Menu and launch 'Ubuntu' to finish first-run." -ForegroundColor Green
    Write-Host "Create your UNIX username and password when prompted." -ForegroundColor Green
    Write-Host "Press Enter here after you complete first-run."
    [void][System.Console]::ReadLine()
  }
} else {
  Write-Host "Ubuntu already listed. Launching it now to ensure first-run is complete..." -ForegroundColor Green
  Start-Process "ubuntu.exe"
  Write-Host "Create your UNIX username and password if prompted. Press Enter here when done."
  [void][System.Console]::ReadLine()
}

Step "5) Set default distro to Ubuntu"
$def = Exec "wsl.exe" @("--set-default","Ubuntu")
if ($def.Code -ne 0 -and $def.Err) { Write-Host $def.Err -ForegroundColor Yellow }

Step "6) Quick Linux userland test"
$test = Exec "wsl.exe" @("-d","Ubuntu","-e","sh","-c","uname -r && echo OK")
Write-Host $test.Out
if (($test.Code -ne 0) -or (-not ($test.Out -match "OK"))) {
  Write-Host "Ubuntu did not execute correctly. If you just installed from Store, reboot once, then run this script again." -ForegroundColor Red
  exit 1
}

Step "WSL2 + Ubuntu ready"
Write-Host "Ubuntu on WSL2 is healthy. Proceed to Docker startup next." -ForegroundColor Green
