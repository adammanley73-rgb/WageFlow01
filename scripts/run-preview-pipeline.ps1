#requires -version 5.1
param(
  [string]$CommitMessage = "Preview: green smoketest, pushing for Vercel pin",
  [int]$Port = 3000,
  [int]$TimeoutSec = 180
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Jump to repo root (this script lives in /scripts)
Set-Location (Join-Path $PSScriptRoot "..")

# Make this session permissive for local scripts
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# Ensure preview profile
$env:BUILD_PROFILE = "preview"
$env:NODE_ENV = "production"
$env:NEXT_TELEMETRY_DISABLED = "1"

# Unblock helper scripts
Unblock-File .\scripts\preview-smoketest.ps1 -ErrorAction SilentlyContinue
Unblock-File .\scripts\run-smoketest-and-push.ps1 -ErrorAction SilentlyContinue

# Delegate to the hardened runner
.\scripts\run-smoketest-and-push.ps1 -CommitMessage $CommitMessage -Port $Port -TimeoutSec $TimeoutSec
