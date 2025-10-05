# scripts\05_filter-and-rank-before-cutoff.ps1
param([string]$ProjectRoot = ".")

$ErrorActionPreference = "Stop"

# Determine cutoff from earliest .bak filename timestamp (when overwrite happened)
$bak = Get-ChildItem (Join-Path $ProjectRoot "app\dashboard") -Recurse -Filter "page.tsx.*.bak" -ErrorAction SilentlyContinue
if (-not $bak) { throw "No .bak files found under app\dashboard." }

$cutoff = ($bak | Sort-Object Name | Select-Object -First 1 | ForEach-Object {
  $m = [regex]::Match($_.Name, "\.(\d{8}-\d{6})\.bak$")
  if (-not $m.Success) { throw "Unexpected .bak name: $($_.Name)" }
  [datetime]::ParseExact($m.Groups[1].Value, "yyyyMMdd-HHmmss", $null)
})
Write-Host ("Cutoff (overwrite time): {0}" -f $cutoff)

$pages = "dashboard","employees","payroll","absence","settings"

$patterns = @{
  "dashboard" = @("Employees","Payroll Runs","Pending Tasks","Notices","View Employees","Go to Payroll","View Tasks","View Notices","New Employee Wizard","Run Payroll","Record Absence")
  "employees" = @("Active employees","Onboarding","Leavers","Create employee","Directory")
  "payroll"   = @("Open runs","Approved","RTI submitted","Completed","New payroll run","View runs")
  "absence"   = @("Sickness","Parental","Annual leave","Other","New absence","Absence list")
  "settings"  = @("Configured items","Warnings","Company settings","Payroll settings")
}

$srcRoot  = Join-Path $ProjectRoot "recovery\candidates"
$destRoot = Join-Path $ProjectRoot "recovery\shortlist"
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null

function Score-File([string]$text, [string]$page) {
  $s = 0
  foreach ($p in $patterns[$page]) { if ($text -like "*$p*") { $s++ } }
  return $s
}

$report = @()

foreach ($page in $pages) {
  $dir = Join-Path $srcRoot $page
  if (-not (Test-Path $dir)) { continue }

  # only files modified BEFORE the overwrite
  $files = Get-ChildItem $dir -File -Recurse -ErrorAction SilentlyContinue |
           Where-Object { $_.LastWriteTime -le $cutoff }

  $tmp = @()
  foreach ($f in $files) {
    $text = Get-Content -Raw $f.FullName
    $tmp += [pscustomobject]@{
      Page     = $page
      Score    = (Score-File $text $page)
      Modified = $f.LastWriteTime
      SizeKB   = [math]::Round($f.Length/1KB,1)
      Path     = $f.FullName
      Source   = $( if ($f.FullName -like "*\.next*") { "next-cache" } else { "history" } )
    }
  }

  $ranked = if ($tmp.Count -gt 0) {
    $tmp | Sort-Object -Property @{Expression='Score';Descending=$true}, @{Expression='Modified';Descending=$true}
  } else { @() }

  # Copy top 5 per page to shortlist
  $outDir = Join-Path $destRoot $page
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  $i = 1
  foreach ($it in ($ranked | Select-Object -First 5)) {
    $name = "{0:D2}-score{1}-{2:yyyyMMdd-HHmmss}-{3}" -f $i,$it.Score,$it.Modified,(Split-Path $it.Path -Leaf)
    Copy-Item $it.Path (Join-Path $outDir $name) -Force
    $i++
  }

  $report += $ranked
}

if ($report.Count -eq 0) {
  Write-Warning "No candidates found before cutoff. History/cache may be gone."
} else {
  $report |
    Sort-Object -Property @{Expression='Page';Descending=$false}, @{Expression='Score';Descending=$true}, @{Expression='Modified';Descending=$true} |
    Format-Table -AutoSize
  Write-Host "`nShortlist created under: $destRoot\<page>\"
}
