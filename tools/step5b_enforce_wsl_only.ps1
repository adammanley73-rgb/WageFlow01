# File: C:\Users\adamm\Projects\wageflow01\tools\step5b_enforce_wsl_only.ps1
# Purpose: Force a WSL2-only environment. Enable WSL components. Disable Hyper-V stack and Containers to avoid installer failures.

$ErrorActionPreference = "Stop"

function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function IsEnabled($name){ (dism /online /Get-FeatureInfo /FeatureName:$name | Out-String) -match "State : Enabled" }

Step "1) Enable WSL features required for WSL2 backend"
dism /online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All /NoRestart | Out-Null
dism /online /Enable-Feature /FeatureName:VirtualMachinePlatform /All /NoRestart | Out-Null

Step "2) Disable Hyper-V stack so the installer stops trying to enable it"
# These may not exist on Home edition; disable if present. NoRestart to batch a single reboot.
dism /online /Disable-Feature /FeatureName:Microsoft-Hyper-V-All /NoRestart | Out-Null
dism /online /Disable-Feature /FeatureName:HypervisorPlatform /NoRestart | Out-Null
dism /online /Disable-Feature /FeatureName:Containers /NoRestart | Out-Null

Step "3) Set WSL default version to 2"
wsl.exe --set-default-version 2 | Out-Null

Step "4) Confirm Ubuntu responds"
# If Ubuntu is not initialized, open it once from Start Menu before re-running Docker install.
$probe = wsl.exe -d Ubuntu -e sh -c "echo PING" 2>&1
Write-Host $probe

Step "5) Reboot strongly recommended"
Write-Host "Features toggled. Reboot now to finalize changes." -ForegroundColor Yellow
