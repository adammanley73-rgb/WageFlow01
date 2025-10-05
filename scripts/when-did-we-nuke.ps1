# scripts\when-did-we-nuke.ps1
$ErrorActionPreference = "Stop"

$bak = Get-ChildItem "app\dashboard" -Recurse -Filter "page.tsx.*.bak" -ErrorAction SilentlyContinue
if (-not $bak) { Write-Error "No .bak files found under app\dashboard"; exit 1 }

$events = $bak | ForEach-Object {
  $m = [regex]::Match($_.Name, "\.(\d{8}-\d{6})\.bak$")
  if ($m.Success) {
    $stamp = [datetime]::ParseExact($m.Groups[1].Value, "yyyyMMdd-HHmmss", $null)
    [pscustomobject]@{
      File       = $_.FullName
      NameStamp  = $stamp      # when the overwrite happened
      Modified   = $_.LastWriteTime
      SizeKB     = [math]::Round($_.Length/1KB,1)
    }
  }
} | Sort-Object NameStamp

$events | Format-Table -AutoSize
""
"FIRST overwrite:  " + ($events[0].NameStamp)
"LAST overwrite:   " + ($events[-1].NameStamp)
