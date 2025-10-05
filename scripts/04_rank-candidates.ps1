# scripts\04_rank-candidates.ps1
param(
  [Parameter(Mandatory=$true)][ValidateSet("dashboard","employees","payroll","absence","settings")]
  [string]$Page
)

$ErrorActionPreference = "Stop"

$patterns = @{
  "dashboard" = @("Employees","Payroll Runs","Pending Tasks","Notices","View Employees","Go to Payroll","View Tasks","View Notices","New Employee Wizard","Run Payroll","Record Absence")
  "employees" = @("Active employees","Onboarding","Leavers","Create employee","Directory")
  "payroll"   = @("Open runs","Approved","RTI submitted","Completed","New payroll run","View runs")
  "absence"   = @("Sickness","Parental","Annual leave","Other","New absence","Absence list")
  "settings"  = @("Configured items","Warnings","Company settings","Payroll settings")
}

$dir = Join-Path "recovery\candidates" $Page
if (-not (Test-Path $dir)) { throw "No candidates folder found: $dir. Run 02_find-recovery-candidates.ps1 first." }

$files = Get-ChildItem -Path $dir -File -Recurse
$results = @()

foreach ($f in $files) {
  $text = Get-Content -Raw $f.FullName
  $score = 0
  foreach ($p in $patterns[$Page]) {
    if ($text -like "*$p*") { $score++ }
  }
  $results += [pscustomobject]@{
    Score = $score
    SizeKB = [math]::Round($f.Length/1KB,1)
    Modified = $f.LastWriteTime
    Path = $f.FullName
  }
}

$results | Sort-Object Score -Descending, Modified -Descending | Format-Table -AutoSize
