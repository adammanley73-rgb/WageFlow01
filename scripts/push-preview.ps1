# File: scripts/push-preview.ps1
#requires -version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$Message = "Preview: add vercel.json + .vercelignore and hardening stubs"
)

function Ensure-RepoRoot {
  if ($PSScriptRoot) { Set-Location (Join-Path $PSScriptRoot "..") }
  if (-not (Test-Path ".git")) { throw "Not a git repository. Run from repo root." }
}

function Run([string]$Cmd) {
  Write-Host ">> $Cmd" -ForegroundColor Cyan
  iex $Cmd
}

Ensure-RepoRoot

Run 'git add -A'
$staged = (git diff --cached --name-only).Trim()
if ($staged) {
  Run ("git commit -m " + ('"{0}"' -f $Message))
} else {
  Write-Host "No staged changes to commit." -ForegroundColor Yellow
}

Run 'git push origin HEAD'

# Optional local build sanity check
if (Test-Path ".\.next") { Remove-Item -Recurse -Force ".\.next" }
$env:BUILD_PROFILE="preview"
Run 'npm run build'
