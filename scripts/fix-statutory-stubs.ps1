#requires -version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-File {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Content
  )
  $full = Join-Path -Path (Get-Location) -ChildPath $Path
  $dir  = Split-Path $full -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  if (Test-Path $full) {
    $bk = Join-Path -Path (Get-Location) -ChildPath ("backup_preview\" + $Path)
    $bkDir = Split-Path $bk -Parent
    if (-not (Test-Path $bkDir)) { New-Item -ItemType Directory -Force -Path $bkDir | Out-Null }
    Copy-Item -LiteralPath $full -Destination $bk -Force
  }
  $Content | Set-Content -LiteralPath $full -Encoding UTF8
}

# 1) AWE stub that exports the exact names your pages import.
$AweTs = @'
/* @ts-nocheck */

// Compile-safe preview stub for Average Weekly Earnings

// Pages expect these shapes in different places.
// Include the fields they actually use.
export type PayItem = {
  paidOn?: string;   // used in maternity page
  gross?: number;    // used in maternity page
  date?: string;     // alternate naming in other modules
  amount?: number;   // alternate naming in other modules
  type?: string;
};

// Basic AWE calculation placeholder
export function calculateAWE(_items: PayItem[] = []): number {
  return 0;
}

// Some pages import this utility by name.
export function calcAWEforFamily(_items: PayItem[] = [], _qwSaturday?: string): number {
  return 0;
}
'@
Write-File -Path "lib/statutory/awe.ts" -Content $AweTs

# 2) SMP stub with exported type SmpResult.
$SmpTs = @'
/* @ts-nocheck */

// Compile-safe preview stub for Statutory Maternity Pay

export type SmpResult = {
  weeklyRate: number;
  total: number;
  details?: any;
};

export function calculateSMP(): SmpResult {
  return { weeklyRate: 0, total: 0, details: "SMP preview stub" };
}
'@
Write-File -Path "lib/statutory/smp.ts" -Content $SmpTs

# 3) Optional helpers for other statutory pages to avoid future missing export drama.
$SppTs = @'
/* @ts-nocheck */

// Preview stub for Statutory Paternity Pay
export type SppResult = { weeklyRate: number; total: number; details?: any };

export function calculateSPP(): SppResult {
  return { weeklyRate: 0, total: 0, details: "SPP preview stub" };
}
'@
Write-File -Path "lib/statutory/spp.ts" -Content $SppTs

$SpbpTs = @'
/* @ts-nocheck */

// Preview stub for Statutory Parental Bereavement Pay
export type SpbpResult = { weeks: number; total: number; details?: any };

export function calculateSPBP(): SpbpResult {
  return { weeks: 0, total: 0, details: "SPBP preview stub" };
}
'@
Write-File -Path "lib/statutory/spbp.ts" -Content $SpbpTs

Write-Host "Statutory stubs refreshed. Backups in .\backup_preview" -ForegroundColor Green
