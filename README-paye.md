# PAYE v1 Monthly Engine

Start PAYE v1 monthly now.

## Run the tests

We’re using Vitest. From project root:

    npm install
    npx vitest run tests/paye.test.ts

You should see all 5 PAYE cases pass:
- 1257L cumulative
- 1257L cumulative mid-year
- 1257L W1/M1
- BR
- D0

## Preview via API

The preview endpoint runs on port 3001.

1) Start the API:

    npm run dev:api

2) Grab the latest run ID:

    $latest = Invoke-WebRequest -UseBasicParsing http://localhost:3001/api/runs/latest | ConvertFrom-Json
    $runId = $latest.id

3) Hit preview for that run:

    Invoke-WebRequest -UseBasicParsing "http://localhost:3001/api/preview?runId=$runId" | Select-Object -ExpandProperty Content

Expect JSON with `gross`, `tax`, and `net`.

And yes, I saw your machine try to keep port 3001 hostage. You showed it who’s boss. Onward to actual tax.
