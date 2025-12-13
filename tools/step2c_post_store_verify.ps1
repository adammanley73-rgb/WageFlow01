# File: C:\Users\adamm\Projects\wageflow01\tools\step2c_post_store_verify.ps1
# Purpose: After installing Ubuntu from Microsoft Store and completing first-run, verify WSL2 health.

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

Step "1) Ensure WSL default version is 2"
$setv = Exec "wsl.exe" @("--set-default-version","2")
if ($setv.Code -ne 0 -and $setv.Err) { Write-Host $setv.Err -ForegroundColor Yellow }

Step "2) List distros and check Ubuntu state"
$list = Exec "wsl.exe" @("--list","--verbose")
Write-Host $list.Out

if (-not ($list.Out -match "Ubuntu")) {
  Write-Host "Ubuntu is not detected. Make sure you installed 'Ubuntu' from Microsoft Store and launched it once." -ForegroundColor Red
  exit 1
}

Step "3) Set default distro to Ubuntu"
$def = Exec "wsl.exe" @("--set-default","Ubuntu")
if ($def.Code -ne 0 -and $def.Err) { Write-Host $def.Err -ForegroundColor Yellow }

Step "4) Quick Linux userland test on Ubuntu"
$test = Exec "wsl.exe" @("-d","Ubuntu","-e","sh","-c","uname -r && id && echo OK")
Write-Host $test.Out
if (($test.Code -ne 0) -or (-not ($test.Out -match "OK"))) {
  Write-Host "Ubuntu did not execute correctly. Reboot Windows, open Ubuntu once, then run this script again." -ForegroundColor Red
  exit 1
}

Step "5) Show WSL status"
$status = Exec "wsl.exe" @("--status")
Write-Host $status.Out

Write-Host "`nWSL2 + Ubuntu are healthy. Proceed to Docker startup." -ForegroundColor Green
