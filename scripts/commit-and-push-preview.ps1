#requires -version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$Message = "Preview hardening: stubs, ts-nocheck guards, alias fixes, preview API stable"
)

function Assert-GitRepo {
  if (-not (Test-Path ".git")) {
    throw "Not a git repository. Run this from the repo root."
  }
}

function Run {
  param([Parameter(Mandatory=$true)][string]$Cmd)
  Write-Host ">> $Cmd" -ForegroundColor Cyan
  iex $Cmd
}

# Move to repo root if script is in scripts\
try {
  if ($PSScriptRoot) {
    $repoRoot = Join-Path $PSScriptRoot ".."
    Set-Location $repoRoot
  }
} catch {}

Assert-GitRepo

# Show current branch
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "On branch: $branch" -ForegroundColor Yellow

# Stage everything
Run 'git add -A'

# Commit if there are staged changes
$pending = (git diff --cached --name-only).Trim()
if ($pending) {
  Run ("git commit -m " + ('"{0}"' -f $Message))
} else {
  Write-Host "No staged changes to commit." -ForegroundColor DarkYellow
}

# Push to origin
Run 'git push origin HEAD'
