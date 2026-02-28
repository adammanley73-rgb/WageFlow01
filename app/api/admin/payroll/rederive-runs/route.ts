// C:\Projects\wageflow01\app\api\admin\payroll\rederive-runs\route.ts

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAdmin } from "@lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type JsonObject = Record<string, unknown>;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function getInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function isYmd(s: string | null) {
  return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(String(s)));
}

function nowIso() {
  return new Date().toISOString();
}

function getFirstHeader(req: Request, name: string) {
  const v = req.headers.get(name);
  if (!v) return "";
  return String(v).split(",")[0].trim();
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function tryInsertLog(client: any, row: JsonObject): Promise<string | null> {
  try {
    const { data, error } = await client
      .from("payroll_rederive_attempts")
      .insert(row)
      .select("id")
      .maybeSingle();

    if (error) return null;
    return data?.id ? String(data.id) : null;
  } catch {
    return null;
  }
}

async function tryUpdateLog(client: any, id: string, patch: JsonObject): Promise<void> {
  try {
    await client.from("payroll_rederive_attempts").update(patch).eq("id", id);
  } catch {
    return;
  }
}

export async function POST(req: Request) {
  const startedAt = nowIso();
  const packId = crypto.randomUUID();

  let client: any = null;
  let companyId: string | null = null;
  let logId: string | null = null;

  try {
    const headerKey = String(req.headers.get("x-wageflow-admin-key") ?? "");
    const expectedKey = String(process.env.WAGEFLOW_ADMIN_REDERIVE_KEY ?? "");

    if (!expectedKey || headerKey !== expectedKey) {
      return json(
        {
          ok: false,
          error: "UNAUTHORISED",
          message:
            "Missing or invalid x-wageflow-admin-key, or WAGEFLOW_ADMIN_REDERIVE_KEY not set.",
        },
        401
      );
    }

    const admin = await getAdmin();
    if (!admin || !(admin as any).client) {
      return json(
        { ok: false, error: "ADMIN_UNAVAILABLE", message: "Admin client not available" },
        503
      );
    }

    client = (admin as any).client;
    companyId = String((admin as any).companyId ?? "").trim() || null;

    if (!companyId) {
      return json(
        {
          ok: false,
          error: "COMPANY_CONTEXT_MISSING",
          message: "Company context not resolved",
        },
        503
      );
    }

    const url = new URL(req.url);

    const requestedLimit = getInt(url.searchParams.get("limit"), 50);
    const offset = getInt(url.searchParams.get("offset"), 0);

    const dryRun = String(url.searchParams.get("dryRun") ?? "").toLowerCase() === "true";
    const runId = url.searchParams.get("runId");

    const from = url.searchParams.get("from"); // YYYY-MM-DD (filters period_end >= from)
    const to = url.searchParams.get("to"); // YYYY-MM-DD (filters period_end <= to)

    if (requestedLimit <= 0) {
      return json({ ok: false, error: "BAD_LIMIT", message: "limit must be >= 1" }, 400);
    }

    const SAFE_LIMIT = 200;
    const HARD_MAX_LIMIT = 1000;

    const confirmHeaderName = "x-wageflow-rederive-confirm";
    const confirmHeaderValue = String(req.headers.get(confirmHeaderName) ?? "");
    const expectedConfirm = String(
      (process.env.WAGEFLOW_ADMIN_REDERIVE_CONFIRM || "I_REALLY_MEAN_IT").trim()
    );

    if (requestedLimit > SAFE_LIMIT) {
      const okConfirm =
        expectedConfirm.length > 0 && confirmHeaderValue.trim() === expectedConfirm;

      if (!okConfirm) {
        return json(
          {
            ok: false,
            error: "CAP_EXCEEDED",
            message:
              `Refusing to process more than ${SAFE_LIMIT} runs per call. ` +
              `To proceed, resend with header ${confirmHeaderName}: ${expectedConfirm}`,
            safeLimit: SAFE_LIMIT,
            requestedLimit,
          },
          400
        );
      }

      if (requestedLimit > HARD_MAX_LIMIT) {
        return json(
          {
            ok: false,
            error: "HARD_CAP_EXCEEDED",
            message: `Hard cap is ${HARD_MAX_LIMIT}. Reduce limit.`,
            hardMaxLimit: HARD_MAX_LIMIT,
            requestedLimit,
          },
          400
        );
      }
    }

    const effectiveLimit = Math.min(
      requestedLimit,
      requestedLimit > SAFE_LIMIT ? HARD_MAX_LIMIT : SAFE_LIMIT
    );

    const callerIp =
      getFirstHeader(req, "x-forwarded-for") || getFirstHeader(req, "x-real-ip") || "";
    const userAgent = String(req.headers.get("user-agent") ?? "");

    logId = await tryInsertLog(client, {
      pack_id: packId,
      company_id: companyId,
      dry_run: dryRun,
      requested_limit: requestedLimit,
      effective_limit: effectiveLimit,
      offset_rows: offset,

      run_id: runId ?? null,
      from_date: isYmd(from) ? from : null,
      to_date: isYmd(to) ? to : null,

      started_at: startedAt,
      finished_at: null,
      ok: null,
      error_code: null,
      error_message: null,

      succeeded: 0,
      failed: 0,
      processed: 0,
      run_count: 0,

      results_json: null,

      caller_ip: callerIp || null,
      user_agent: userAgent ? userAgent.slice(0, 500) : null,
      vercel_env: process.env.VERCEL_ENV || null,
      node_env: process.env.NODE_ENV || null,
    });

    let runs: any[] = [];

    if (runId) {
      const { data, error } = await client
        .from("payroll_runs")
        .select("id, company_id, period_start, period_end, pay_date, created_at")
        .eq("id", runId)
        .maybeSingle();

      if (error) {
        if (logId) {
          await tryUpdateLog(client, logId, {
            finished_at: nowIso(),
            ok: false,
            error_code: "RUN_LOOKUP_FAILED",
            error_message: String(error.message ?? "Lookup failed"),
          });
        }
        return json(
          { ok: false, error: "RUN_LOOKUP_FAILED", message: error.message, packId },
          500
        );
      }

      if (!data) {
        if (logId) {
          await tryUpdateLog(client, logId, {
            finished_at: nowIso(),
            ok: false,
            error_code: "RUN_NOT_FOUND",
            error_message: "Payroll run not found",
          });
        }
        return json(
          { ok: false, error: "RUN_NOT_FOUND", message: "Payroll run not found", packId },
          404
        );
      }

      if (String(data.company_id) !== companyId) {
        if (logId) {
          await tryUpdateLog(client, logId, {
            finished_at: nowIso(),
            ok: false,
            error_code: "FORBIDDEN_TENANT",
            error_message: "Run does not belong to active company",
          });
        }
        return json(
          { ok: false, error: "FORBIDDEN_TENANT", message: "Run not in active company", packId },
          403
        );
      }

      runs = [data];
    } else {
      let q = client
        .from("payroll_runs")
        .select("id, company_id, period_start, period_end, pay_date, created_at")
        .eq("company_id", companyId)
        .order("period_end", { ascending: true });

      if (isYmd(from)) q = q.gte("period_end", from);
      if (isYmd(to)) q = q.lte("period_end", to);

      q = q.range(offset, offset + effectiveLimit - 1);

      const { data, error } = await q;

      if (error) {
        if (logId) {
          await tryUpdateLog(client, logId, {
            finished_at: nowIso(),
            ok: false,
            error_code: "RUN_LIST_FAILED",
            error_message: String(error.message ?? "List failed"),
          });
        }
        return json({ ok: false, error: "RUN_LIST_FAILED", message: error.message, packId }, 500);
      }

      runs = Array.isArray(data) ? data : [];
    }

    if (runs.length === 0) {
      if (logId) {
        await tryUpdateLog(client, logId, {
          finished_at: nowIso(),
          ok: true,
          processed: 0,
          run_count: 0,
          succeeded: 0,
          failed: 0,
          results_json: JSON.stringify([]),
        });
      }

      return json({
        ok: true,
        packId,
        companyId,
        dryRun,
        runCount: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        results: [],
        note: "No runs matched your filters.",
      });
    }

    const results: any[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const run of runs) {
      const id = String(run?.id ?? "");
      const target = new URL(`/api/payroll/${id}`, req.url);

      if (dryRun) {
        results.push({
          runId: id,
          ok: true,
          dryRun: true,
          message: "Would call PATCH /api/payroll/[id] { action: recalculate }",
        });
        succeeded += 1;
        continue;
      }

      try {
        const res = await fetch(target.toString(), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "recalculate" }),
        });

        const body = await safeJson(res);
        const bodyObj = (body && typeof body === "object") ? (body as any) : null;

        const ok = Boolean(bodyObj?.ok) && res.ok;

        if (ok) {
          succeeded += 1;
          results.push({
            runId: id,
            ok: true,
            status: res.status,
            debugSource: bodyObj?.debugSource ?? null,
          });
        } else {
          failed += 1;
          results.push({
            runId: id,
            ok: false,
            status: res.status,
            error: bodyObj?.error ?? bodyObj?.errorCode ?? "RECALC_FAILED",
            message: bodyObj?.message ?? "Recalculate call failed",
          });
        }
      } catch (e: unknown) {
        failed += 1;
        results.push({
          runId: id,
          ok: false,
          status: 0,
          error: "FETCH_FAILED",
          message: errMsg(e),
        });
      }
    }

    const finishedAt = nowIso();
    const overallOk = failed === 0;

    if (logId) {
      const maxLogged = 500;
      const loggedResults = results.length > maxLogged ? results.slice(0, maxLogged) : results;

      await tryUpdateLog(client, logId, {
        finished_at: finishedAt,
        ok: overallOk,
        processed: runs.length,
        run_count: runs.length,
        succeeded,
        failed,
        results_json: JSON.stringify(loggedResults),
        error_code: overallOk ? null : "PARTIAL_FAILURE",
        error_message: overallOk ? null : "One or more runs failed. See results_json.",
      });
    }

    return json({
      ok: true,
      packId,
      companyId,
      dryRun,
      runCount: runs.length,
      processed: runs.length,
      succeeded,
      failed,
      results,
      hint:
        "Use dryRun=true first. Then run in batches using limit/offset. You can also target a single runId. " +
        "If you request limit > 200 you must send x-wageflow-rederive-confirm.",
    });
  } catch (e: unknown) {
    const finishedAt = nowIso();

    if (client && logId) {
      await tryUpdateLog(client, logId, {
        finished_at: finishedAt,
        ok: false,
        error_code: "UNEXPECTED_ERROR",
        error_message: errMsg(e),
      });
    }

    return json(
      {
        ok: false,
        packId,
        error: "UNEXPECTED_ERROR",
        message: errMsg(e),
      },
      500
    );
  }
}