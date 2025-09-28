<# 
apply-dashboard-template.ps1
Overwrites app pages to use the Dashboard gold standard via PageTemplate.
Backs up existing files with .bak timestamp. Idempotent.
Assumes:
  - PageTemplate at "@/components/layout/PageTemplate"
  - Props:
      currentSection: "Dashboard" | "Employees" | "Payroll" | "Absence" | "Settings"
      hideCurrentChip: boolean
      showSettingsChip?: boolean  # pass $false on non-Dashboard pages
      statTiles?: Array<{ label: string; value: number | string }>
      actionTiles?: Array<{ label: string; href: string }>
#>

param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

function New-Dir([string]$p) {
  $full = Join-Path $ProjectRoot $p
  if (-not (Test-Path $full)) { New-Item -ItemType Directory -Path $full | Out-Null }
  return $full
}

function Backup-And-WriteFile([string]$path, [string]$content) {
  $full = Join-Path $ProjectRoot $path
  $dir = Split-Path $full -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  if (Test-Path $full) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $full "$full.$stamp.bak" -Force
  }
  $content | Set-Content -Path $full -Encoding UTF8 -NoNewline
  Write-Host "Wrote $path"
}

# Common import header
$Import = @"
'use client';

import PageTemplate from '@/components/layout/PageTemplate';
"@

# Dashboard page template
$DashboardPage = @"
$Import

export default function Page() {
  return (
    <PageTemplate
      currentSection="Dashboard"
      hideCurrentChip
      showSettingsChip={true}
      statTiles={[
        { label: 'Employees', value: 0 },
        { label: 'Payroll runs', value: 0 },
        { label: 'Absences', value: 0 },
        { label: 'Settings checks', value: 0 }
      ]}
      actionTiles={[
        { label: 'Employees', href: '/dashboard/employees' },
        { label: 'Payroll', href: '/dashboard/payroll' },
        { label: 'Absence', href: '/dashboard/absence' }
      ]}
    />
  );
}
"@

# Employees page template
$EmployeesPage = @"
$Import

export default function Page() {
  return (
    <PageTemplate
      currentSection="Employees"
      hideCurrentChip
      showSettingsChip={false}
      statTiles={[
        { label: 'Active employees', value: 0 },
        { label: 'Onboarding', value: 0 },
        { label: 'Leavers', value: 0 }
      ]}
      actionTiles={[
        { label: 'Create employee', href: '/dashboard/employees/new' },
        { label: 'Directory', href: '/dashboard/employees' }
      ]}
    />
  );
}
"@

# Payroll page template
$PayrollPage = @"
$Import

export default function Page() {
  return (
    <PageTemplate
      currentSection="Payroll"
      hideCurrentChip
      showSettingsChip={false}
      statTiles={[
        { label: 'Open runs', value: 0 },
        { label: 'Approved', value: 0 },
        { label: 'RTI submitted', value: 0 },
        { label: 'Completed', value: 0 }
      ]}
      actionTiles={[
        { label: 'New payroll run', href: '/dashboard/payroll/new' },
        { label: 'View runs', href: '/dashboard/payroll' }
      ]}
    />
  );
}
"@

# Absence page template
$AbsencePage = @"
$Import

export default function Page() {
  return (
    <PageTemplate
      currentSection="Absence"
      hideCurrentChip
      showSettingsChip={false}
      statTiles={[
        { label: 'Sickness', value: 0 },
        { label: 'Parental', value: 0 },
        { label: 'Annual leave', value: 0 },
        { label: 'Other', value: 0 }
      ]}
      actionTiles={[
        { label: 'New absence', href: '/dashboard/absence/new' },
        { label: 'Absence list', href: '/dashboard/absence/list' }
      ]}
    />
  );
}
"@

# Settings page template
$SettingsPage = @"
$Import

export default function Page() {
  return (
    <PageTemplate
      currentSection="Settings"
      hideCurrentChip
      showSettingsChip={false}
      statTiles={[
        { label: 'Configured items', value: 0 },
        { label: 'Warnings', value: 0 }
      ]}
      actionTiles={[
        { label: 'Company settings', href: '/dashboard/settings/company' },
        { label: 'Payroll settings', href: '/dashboard/settings/payroll' }
      ]}
    />
  );
}
"@

# Ensure base folders exist
New-Dir "app\dashboard" | Out-Null
New-Dir "app\dashboard\employees" | Out-Null
New-Dir "app\dashboard\payroll"   | Out-Null
New-Dir "app\dashboard\absence"   | Out-Null
New-Dir "app\dashboard\settings"  | Out-Null

# Write files
Backup-And-WriteFile "app\dashboard\page.tsx"                $DashboardPage
Backup-And-WriteFile "app\dashboard\employees\page.tsx"      $EmployeesPage
Backup-And-WriteFile "app\dashboard\payroll\page.tsx"        $PayrollPage
Backup-And-WriteFile "app\dashboard\absence\page.tsx"        $AbsencePage
Backup-And-WriteFile "app\dashboard\settings\page.tsx"       $SettingsPage

Write-Host "`nAll pages updated to use PageTemplate and hide their own chip."
Write-Host "Next: npm run build, then npm run start, and verify nav flow."
