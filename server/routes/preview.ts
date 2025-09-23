// server/routes/preview.ts
// Express route to preview PAYE-calculated TAX and NET for a run.

import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { calculatePay } from '../../lib/payroll/calculatePay.ts';

// Parse "2025-09-M01" -> 1, "M12" -> 12
function parsePeriodFromRunNumber(runNumber?: string): number | null {
  if (!runNumber) return null;
  const m = runNumber.match(/M(\d{2})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n >= 1 && n <= 12) return n;
  return null;
}

function toNumber(val: unknown, fallback: number): number {
  const n = typeof val === 'string' ? Number(val) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export default function registerPreviewRoutes(): Router {
  const router = createRouter();

  router.get('/preview', async (req: Request, res: Response) => {
    try {
      const { runId, gross, taxCode, period, ytdTaxable, ytdTaxPaid, taxYear } =
        req.query as Record<string, string | undefined>;

      const inferredPeriod = parsePeriodFromRunNumber(runId);
      const monthPeriod = toNumber(period, inferredPeriod ?? 1);

      const grossForPeriod = toNumber(gross, 2000);
      const code = (taxCode || '1257L').toString().toUpperCase();

      const inputs = {
        grossForPeriod,
        taxCode: code,
        period: monthPeriod,
        ytdTaxableBeforeThisPeriod: toNumber(ytdTaxable, 0),
        ytdTaxPaidBeforeThisPeriod: toNumber(ytdTaxPaid, 0),
        taxYear: toNumber(taxYear, undefined as unknown as number)
      };

      const result = calculatePay(inputs);

      res.json({
        ok: true,
        runId: runId ?? null,
        params: {
          grossForPeriod: result.gross,
          taxCode: code,
          period: monthPeriod
        },
        pay: {
          gross: result.gross,
          tax: result.tax,
          net: result.net
        },
        paye: result.paye
      });
    } catch (err: any) {
      res.status(400).json({
        ok: false,
        error: err?.message ?? 'preview error'
      });
    }
  });

  return router;
}
