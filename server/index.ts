// server/index.ts
// Minimal Express server for WageFlow preview API.

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import registerPreviewRoutes from './routes/preview.ts';

// Helper to format run_number like "YYYY-MM-MMM" where MMM is M01..M12
function currentRunNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1; // 1..12
  const mm = m.toString().padStart(2, '0');
  return `${y}-${mm}-M${mm}`;
}

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'wageflow-api', ts: new Date().toISOString() });
});

// Stub for latest run. Replace with your DB-backed run lookup when ready.
app.get('/api/runs/latest', (_req, res) => {
  res.json({
    ok: true,
    id: randomUUID(),
    run_number: currentRunNumber(),
    created_at: new Date().toISOString()
  });
});

// Preview routes (GET /api/preview)
app.use('/api', registerPreviewRoutes());

// Boot
const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`[wageflow-api] listening on http://localhost:${PORT}`);
});
