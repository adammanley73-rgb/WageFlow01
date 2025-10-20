# C:\Users\adamm\Projects\wageflow01\00-PRODUCT\v1-scope\create_scope_files.ps1
# Creates/overwrites WageFlow v1 scope documents with multi-frequency support.
# UTF-8 without BOM. No external modules.

$BasePath = 'C:\Users\adamm\Projects\wageflow01\00-PRODUCT\v1-scope'
$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# Ensure folder exists
if (-not (Test-Path -LiteralPath $BasePath)) {
    New-Item -ItemType Directory -Path $BasePath -Force | Out-Null
}

# ----- File contents -----

$wageflowScope = @'
Title: WageFlow v1 scope

Pay frequencies
- Monthly: full support (baseline test frequency)
- Weekly, Fortnightly, Four-weekly, Lunar: supported using the shared calculation engine
- Each frequency maintains its own pay period, cumulative settings, and FPS submission schedule
- Monthly validated first; others released as beta until 3 consecutive clean runs pass acceptance tests

Tax codes
- 1257L cumulative, BR, D0, D1, W1/M1

RTI
- FPS only in v1, one submission per approved run
- Manual resend with retry/backoff and error logging

Statutory
- Exclude SMP/SPP/SAP/ShPP in v1
- Include SSP basic only if time permits

Pension
- One provider template with fixed settings and basic AE flags

Payslips
- PDF generation, employee portal access
- Optional email delivery

Imports
- CSV for employees with minimal required fields
- No historic payroll import in v1

Exports
- CSV for journals and HMRC audit basics

Logs
- Append-only audit for all pay-affecting changes with actor, timestamp, before/after

Access
- Roles: Owner, Manager, Processor, Employee
- All queries company-scoped; enforce via RLS and tests

UI flow
- Create run → add employees → preview → approve → submit RTI → generate payslips

Out of scope v1
- EPS, weekly/fortnightly specific edge-cases beyond shared engine, multi-pension, pro-rata edge-case library, multi-currency
'@

$acceptance = @'
Acceptance criteria

Core reliability
- 10 consecutive monthly runs across 3 test companies complete with 0 data leaks
- ≥95% FPS submissions succeed on first try; 100% succeed after auto-retry within 15 minutes
- Payslips generated for 100% of employees in approved runs

Security and isolation
- RLS tests: cross-company access attempts return 0 rows in automated tests
- Audit log records actor, timestamp, entity, and before/after for all pay-affecting actions

Onboarding
- Time to first successful run for a new company ≤ 7 days using CSV import and a checklist

Support
- Support load ≤ 3 tickets per 1,000 payslips during pilot month

Multi-frequency validation
- At least one successful test company per pay frequency (monthly, weekly, fortnightly, four-weekly, lunar)
- No cross-frequency leakage; each frequency generates independent FPS and payslips
'@

$aiScope = @'
Title: WageFlow-AI v1 scope

Copilot
- Answers ≤120 words
- Always cite HMRC docs or internal rule table IDs
- Refuse when confidence is low and point to manual

Anomaly rules (v1)
1) NI spike > 30% vs previous run
2) Net pay ≤ 0
3) Pay delta > 25% vs previous run
4) Missing pension eligibility where AE threshold is met

UX
- One side panel for Q&A
- One inline banner per anomaly with reason and rule ID

Logging and privacy
- Store prompt, retrieved rules, answer, citations, user rating
- No PII in logs; redact names and NI numbers
- EU/UK residency for storage

Out of scope
- Free-text bulk advice, generative emails, policy writing
'@

$aiGuardrails = @'
Guardrails for WageFlow-AI v1

- Refuse if source confidence below threshold; reply with safe fallback and manual link
- Always show sources: HMRC document title + section or internal rule ID
- No arithmetic without showing inputs used
- Never override a human approval; only suggest
- Latency targets: p50 ≤ 2.5s, p95 ≤ 5s; do not block UI
- Log every AI output with rule hits and timing
'@

$pilotPlan = @'
Pilot plan

Cohort
- 2 accountants, 1 SME direct

Duration
- 2 full monthly cycles

Setup
- CSV import template
- 60-minute onboarding call
- Shared checklist

Success metrics
- Approval with no manual correction ≥ 85%
- Copilot helpful rating ≥ 80% across 200 sessions
- Anomaly recall ≥ 80% with false positive ≤ 10%

Evidence to collect
- Screenshare recordings of approvals
- Time-to-approve logs
- Defect list with severity and fixes
'@

$freezeNotice = @'
Freeze notice

- PeopleFlow paused until WageFlow v1 acceptance criteria are met
- WhisperLine paused until either 10 paying WageFlow companies or 2 bureau pilots complete
- Any exception requires a written 1-page impact note and removal of equal work from the WageFlow v1 scope
'@

# ----- Write helper -----
function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] [string] $Content
    )
    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

# ----- Write files -----
Write-Utf8NoBom -Path (Join-Path $BasePath 'WageFlow-v1-scope.txt')             -Content $wageflowScope
Write-Utf8NoBom -Path (Join-Path $BasePath 'WageFlow-acceptance-criteria.txt')  -Content $acceptance
Write-Utf8NoBom -Path (Join-Path $BasePath 'AI-v1-scope.txt')                   -Content $aiScope
Write-Utf8NoBom -Path (Join-Path $BasePath 'AI-guardrails.txt')                 -Content $aiGuardrails
Write-Utf8NoBom -Path (Join-Path $BasePath 'Pilot-plan.txt')                    -Content $pilotPlan
Write-Utf8NoBom -Path (Join-Path $BasePath 'Freeze-notice.txt')                 -Content $freezeNotice

Write-Host "Created files in ${BasePath}:"
Get-ChildItem -LiteralPath $BasePath -File | Select-Object Name, Length | Sort-Object Name | Format-Table -AutoSize
