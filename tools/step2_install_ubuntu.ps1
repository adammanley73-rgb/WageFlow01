# File: C:\Users\adamm\Projects\wageflow01\tools\step2_install_ubuntu.ps1
# Purpose: Install and initialize Ubuntu on WSL2, set defaults, and verify readiness for Docker.

$ErrorActionPreference = "Stop"

function Require-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Run PowerShell as Administrator and re-run this script." -ForegroundColor Yellow
    exit 1
  }
}

function Step($text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }

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

Step "1) Set WSL default version to 2"
$r = Exec "wsl.exe" @("--set-default-version","2")
if ($r.Code -ne 0) {
  Write-Host "wsl --set-default-version 2 returned a warning or needs a reboot. Continuing..." -ForegroundColor Yellow
  if ($r.Err) { Write-Host $r.Err }
}

Step "2) Check existing distros"
$list = Exec "wsl.exe" @("--list","--verbose")
Write-Host $list.Out
$hasUbuntu = ($list.Out -match "Ubuntu")

if (-not $hasUbuntu) {
  Step "3) Install Ubuntu (this may request a reboot)"
  $inst = Exec "wsl.exe" @("--install","-d","Ubuntu")
  Write-Host $inst.Out
  if ($inst.Code -ne 0) {
    Write-Host "Automatic install failed or requires a reboot. Reboot, then run this script again." -ForegroundColor Yellow
    exit 0
  }
  Write-Host "Ubuntu installation initiated. If prompted, reboot, then re-run this script." -ForegroundColor Green
  exit 0
}

Step "4) Initialize Ubuntu first-run (create UNIX user)"
# If Ubuntu hasn’t been initialized, this launches a console where you must create a username and password.
# If it’s already initialized, Ubuntu will just open and close quickly.
Start-Process "ubuntu.exe"
Write-Host "Complete Ubuntu's first-run setup in the new window (username and password). When finished, press Enter here to continue." -ForegroundColor Yellow
[void][System.Console]::ReadLine()

Step "5) Set default distro to Ubuntu"
$r2 = Exec "wsl.exe" @("--set-default","Ubuntu")
if ($r2.Code -ne 0) { Write-Host $r2.Err -ForegroundColor Yellow }

Step "6) Quick WSL userland test"
$t = Exec "wsl.exe" @("-d","Ubuntu","-e","sh","-c","uname -r && echo OK")
Write-Host $t.Out
if (($t.Code -ne 0) -or (-not ($t.Out -match "OK"))) {
  Write-Host "Ubuntu did not execute correctly. Reboot, open 'Ubuntu' once from Start Menu to finish setup, then run this script again." -ForegroundColor Red
  exit 1
}

Step "7) Show WSL status"
$s = Exec "wsl.exe" @("--status")
Write-Host $s.Out

Write-Host "`nUbuntu on WSL2 is ready. Proceed to Docker startup." -ForegroundColor Green
