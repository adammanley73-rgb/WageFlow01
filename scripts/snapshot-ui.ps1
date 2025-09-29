# scripts/snapshot-ui.ps1
param(
  [string[]] $Paths = @(
    "components/layout/PageTemplate.tsx",
    "components/tables/EmployeesTable.tsx",
    "app/dashboard/page.tsx",
    "app/dashboard/employees/page.tsx",
    "app/dashboard/payroll/page.tsx",
    "app/dashboard/absence/page.tsx",
    "app/dashboard/settings/page.tsx"
  )
)

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Resolve-Path "$here\..")
$dest = "recovery\snapshots\$stamp"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

foreach ($p in $Paths) {
  if (Test-Path $p) {
    $targetDir = Split-Path -Parent (Join-Path $dest $p)
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    Copy-Item $p (Join-Path $dest $p) -Force
    Write-Host "Saved $p"
  } else {
    Write-Warning "Missing $p"
  }
}

Write-Host "Snapshot written to $dest"
