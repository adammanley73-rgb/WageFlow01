param(
    # Run with -Apply to actually modify files.
    [switch]$Apply
)

$root    = "C:\Users\adamm\Projects\wageflow01"
$search  = "pay_run_employees"
$replace = "payroll_run_employees"

# File extensions to scan
$extensions = @(
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".sql",
    ".ps1",
    ".psm1"
)

# Directories we do NOT want to touch
$excludePatterns = @(
    "\.git\",
    "\node_modules\",
    "\.next\",
    "\supabase\migrations\"
)

Write-Host "Root path: $root"
Write-Host "Searching for '$search' (will replace with '$replace')"
Write-Host ""

# 1) Get all files under the repo
$allFiles = Get-ChildItem -Path $root -Recurse -File

# 2) Limit to our chosen extensions
$allFiles = $allFiles | Where-Object {
    $extensions -contains $_.Extension.ToLower()
}

# 3) Exclude junk dirs (git, node_modules, .next, migrations)
$allFiles = $allFiles | Where-Object {
    $path = $_.FullName
    -not ($excludePatterns | Where-Object { $path -like "*$_*" })
}

Write-Host "Scanning $($allFiles.Count) file(s) for '$search'..." -ForegroundColor Cyan

# 4) Keep only files that actually contain the search text
$targetFiles = @()
foreach ($file in $allFiles) {
    if (Select-String -Path $file.FullName -Pattern $search -SimpleMatch -Quiet) {
        $targetFiles += $file
    }
}

if ($targetFiles.Count -eq 0) {
    Write-Host "No files containing '$search' were found in the filtered set." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Found $($targetFiles.Count) file(s) containing '$search':" -ForegroundColor Cyan
$targetFiles | ForEach-Object { Write-Host " - $($_.FullName)" }

if (-not $Apply) {
    Write-Host ""
    Write-Host "Preview only. No changes have been made." -ForegroundColor Yellow
    Write-Host "Run this script again with the -Apply switch to perform the replacement." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Applying replacements..." -ForegroundColor Green

foreach ($file in $targetFiles) {
    $path = $file.FullName
    $content = Get-Content -Path $path -Raw

    $newContent = $content -replace [regex]::Escape($search), $replace

    if ($newContent -ne $content) {
        Set-Content -Path $path -Value $newContent
        Write-Host "Updated: $path"
    } else {
        Write-Host "No changes needed (already replaced?): $path"
    }
}

Write-Host ""
Write-Host "Replacement complete. Run a fresh search for '$search' in VS Code to confirm it's gone from app code." -ForegroundColor Green
