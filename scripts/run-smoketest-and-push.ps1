param(
  [Parameter(Mandatory = $true)][string]$CommitMessage,
  [int]$Port = 3000,
  [int]$TimeoutSec = 180
)

$ErrorActionPreference = "Stop"

# Paths
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot   = Resolve-Path (Join-Path $scriptRoot "..")

function Run($file, $args) {
  $p = Start-Process -FilePath $file -ArgumentList $args -NoNewWindow -PassThru -Wait
  if ($p.ExitCode -ne 0) {
    throw "$file $args failed with exit code $($p.ExitCode)"
  }
}

Push-Location $repoRoot
try {
  Write-Host "Preparing preview env..." -ForegroundColor Cyan
  $env:BUILD_PROFILE = "preview"
  $env:NODE_ENV = "production"
  $env:NEXT_TELEMETRY_DISABLED = "1"

  Get-ChildItem .\scripts\*.ps1 | Unblock-File -ErrorAction SilentlyContinue

  Write-Host "Building, starting, and smoketesting..." -ForegroundColor Cyan
  & (Join-Path $scriptRoot "apply-stubs-and-rebuild.ps1") -StartServer -Port $Port -TimeoutSec $TimeoutSec

  Write-Host "Git add/commit/push..." -ForegroundColor Cyan
  Run "git" "add -A"

  # commit only if there are staged changes
  & git diff --cached --quiet
  $hasStaged = ($LASTEXITCODE -ne 0)
  if ($hasStaged) {
    Run "git" "commit -m `"$CommitMessage`""
  } else {
    Write-Host "No staged changes to commit." -ForegroundColor Yellow
  }

  Run "git" "push"
  Write-Host "Done." -ForegroundColor Green
}
finally {
  Pop-Location
}
