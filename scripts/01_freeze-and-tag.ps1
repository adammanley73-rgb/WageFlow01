# scripts\01_freeze-and-tag.ps1
$ErrorActionPreference = "Stop"
if (-not (Test-Path .git)) { git init | Out-Null }
git add -A
git commit -m "WIP: current broken dashboards before recovery" | Out-Null
git tag -f pre-recover
Write-Host "Snapshot saved as commit and tag 'pre-recover'."
