param()

$root = "C:\Users\adamm\Projects\wageflow01"
$appRoot = Join-Path $root "app"

$exclude = '\node_modules\|\.next\|\restore\'
$targets = Get-ChildItem -LiteralPath $appRoot -Recurse -File -Filter *.tsx |
Where-Object { $.FullName -notmatch $exclude } |
Where-Object { $.Name -in @("page.tsx","layout.tsx") }

function Get-FirstMatchValue {
param([string]$text, [string]$pattern)
$m = [regex]::Match($text, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
if ($m.Success -and $m.Groups.Count -ge 2) { return $m.Groups[1].Value }
return ""
}

$report = foreach ($f in $targets) {
$raw = Get-Content -LiteralPath $f.FullName -Raw

$rel = $f.FullName.Substring($appRoot.Length).TrimStart('')
$routeHint = $rel -replace '\','/'

$isWizard = $f.FullName -match '\wizard\'
$isDashboard = $f.FullName -match '\app\dashboard\'

$usesPageTemplate = $raw -match '\bPageTemplate\b'
$pageTemplateImport = Get-FirstMatchValue $raw 'from\s+"''
["'']'

$usesHeaderBanner = $raw -match '\bHeaderBanner\b'
$headerBannerImport = Get-FirstMatchValue $raw 'from\s+"''
["'']'

$currentSectionLiteral = Get-FirstMatchValue $raw 'currentSection\s*=\s*"''
["'']'
$titleLiteral = Get-FirstMatchValue $raw 'title\s*=\s*"''
["'']'

$headerModeWizard = $raw -match 'headerMode\s*=\s*["'']wizard["'']'
$modeWizard = $raw -match 'mode\s*=\s*["'']wizard["'']'

$usesFormatUkDate = $raw -match '\bformatUkDate\b'
$usesUkPayScheduleDate = $raw -match '\bpay-schedule\b' -or $raw -match '\bformatUkDate\b'

$usesActiveCompanyApi = $raw -match '/api/active-company' -or $raw -match 'active_company' -or $raw -match 'activeCompany'

[pscustomobject]@{
File = $f.FullName
RouteHint = $routeHint
Kind = $f.Name
Dashboard = [bool]$isDashboard
Wizard = [bool]$isWizard

UsesPageTemplate = [bool]$usesPageTemplate
PageTemplateImport = $pageTemplateImport

UsesHeaderBanner = [bool]$usesHeaderBanner
HeaderBannerImport = $headerBannerImport

TitleLiteral = $titleLiteral
CurrentSectionLiteral = $currentSectionLiteral
HeaderModeWizard = [bool]$headerModeWizard
ModeWizard = [bool]$modeWizard

UsesFormatUkDate = [bool]$usesFormatUkDate
UsesActiveCompanySignals = [bool]$usesActiveCompanyApi


}
}

$csvPath = Join-Path $root "_audit\page-audit.csv"
$report | Sort-Object RouteHint | Export-Csv -NoTypeInformation -Encoding UTF8 -LiteralPath $csvPath

Write-Host ""
Write-Host "AUDIT CSV WRITTEN:"
Write-Host $csvPath
Write-Host ""

$dashPages = $report | Where-Object { $.Dashboard -eq $true -and $.Kind -eq "page.tsx" }
$missingTemplate = $dashPages | Where-Object { $_.UsesPageTemplate -eq $false }

$wizardPages = $report | Where-Object { $.Wizard -eq $true -and $.Kind -eq "page.tsx" }
$wizardMissingTemplate = $wizardPages | Where-Object { $.UsesPageTemplate -eq $false }
$wizardNotWizardMode = $wizardPages | Where-Object { $.HeaderModeWizard -eq $false -and $_.ModeWizard -eq $false }

Write-Host "SUMMARY:"
Write-Host ("Total TSX pages/layouts scanned: {0}" -f $report.Count)
Write-Host ("Dashboard pages (page.tsx) total: {0}" -f $dashPages.Count)
Write-Host ("Dashboard pages missing PageTemplate: {0}" -f $missingTemplate.Count)
Write-Host ("Wizard pages total: {0}" -f $wizardPages.Count)
Write-Host ("Wizard pages missing PageTemplate: {0}" -f $wizardMissingTemplate.Count)
Write-Host ("Wizard pages not explicitly in wizard header mode (may rely on layout): {0}" -f $wizardNotWizardMode.Count)

if ($missingTemplate.Count -gt 0) {
Write-Host ""
Write-Host "RED LIST: DASHBOARD PAGES MISSING PAGETEMPLATE"
$missingTemplate | Select-Object -ExpandProperty RouteHint
}

if ($wizardMissingTemplate.Count -gt 0) {
Write-Host ""
Write-Host "RED LIST: WIZARD PAGES MISSING PAGETEMPLATE"
$wizardMissingTemplate | Select-Object -ExpandProperty RouteHint
}

if ($wizardNotWizardMode.Count -gt 0) {
Write-Host ""
Write-Host "NOTE: WIZARD PAGES NOT SET TO WIZARD MODE (OK if layout handles it)"
$wizardNotWizardMode | Select-Object -ExpandProperty RouteHint
}
