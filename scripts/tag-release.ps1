#requires -version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$Tag = "v0.1.0",
  [string]$Message = "PAYE v1 monthly preview"
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

# Ensure working tree is clean enough
$dirty = (git status --porcelain).Trim()
if ($dirty) {
  Write-Host "Working tree has changes. Committing them before tagging." -ForegroundColor Yellow
  Run 'git add -A'
  Run ("git commit -m " + ('"chore: pre-tag snapshot for {0}"' -f $Tag))
}

# Create or update tag
$existing = (git tag -l $Tag).Trim()
if ($existing) {
  Write-Host "Tag $Tag exists. Updating annotated tag message." -ForegroundColor Yellow
  Run ("git tag -fa " + $Tag + " -m " + ('"{0}"' -f $Message))
} else {
  Run ("git tag -a " + $Tag + " -m " + ('"{0}"' -f $Message))
}

# Push tag
Run ("git push origin " + $Tag)
