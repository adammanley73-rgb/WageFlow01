// C:\Users\adamm\Projects\wageflow01\app\api\ai\copilot\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAiBaseUrl } from "@/lib/aiClient";

type CopilotRequestBody = {
  question?: string;
  context?: Record<string, unknown>;
  mode?: string;
  uiSurface?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type UpstreamSuccess = {
  ok: true;
  answer?: string;
  highlights?: string[];
  citations?: unknown[];
  followUps?: string[];
  safety?: {
    needsHumanReview: boolean;
    reasons?: string[];
    [key: string]: unknown;
  } | null;
  debug?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type UpstreamError = {
  ok: false;
  errorCode?: string;
  message?: string;
  details?: Record<string, unknown>;
  debug?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type UpstreamResponse = UpstreamSuccess | UpstreamError;

type ProxySuccessResponse = {
  ok: true;
  answer: string | null;
  highlights: string[];
  citations: unknown[];
  followUps: string[];
  safety: UpstreamSuccess["safety"] | null;
  debug: {
    source: string;
    target: string;
    upstreamDebug: Record<string, unknown> | null;
  };
};

type ProxyErrorResponse = {
  ok: false;
  errorCode: string;
  message: string;
  statusCode: number;
  details: Record<string, unknown> | null;
  rawText: string | null;
  debug: {
    source: string;
    target: string;
    stage: string;
    upstreamDebug: Record<string, unknown> | null;
  };
};

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    ok: true,
    endpoint: "copilot",
    message:
      "WageFlow AI Copilot proxy. Use POST with JSON body { question: string, mode?: string, context?: object }.",
    debug: {
      source: "wageflow-main",
      target: "wageflow-ai",
      method: "GET",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    let body: CopilotRequestBody | null = null;

    try {
      body = (await req.json()) as CopilotRequestBody;
    } catch {
      body = null;
    }

    const question = body?.question;

    if (!question || typeof question !== "string" || question.trim() === "") {
      const payload: ProxyErrorResponse = {
        ok: false,
        errorCode: "validation_error",
        message:
          "Missing or invalid 'question'. Provide a non-empty string in the request body.",
        statusCode: 400,
        details: null,
        rawText: null,
        debug: {
          source: "wageflow-main",
          target: "wageflow-ai",
          stage: "validate_request",
          upstreamDebug: null,
        },
      };
      return NextResponse.json(payload, { status: 400 });
    }

    const aiBaseUrl = getAiBaseUrl().replace(/\/+$/, "");
    const targetUrl = `${aiBaseUrl}/api/copilot`;

    const upstreamResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const contentType = upstreamResponse.headers.get("content-type") || "";
    let aiData: UpstreamResponse | null = null;
    let rawText: string | null = null;

    if (contentType.includes("application/json")) {
      try {
        aiData = (await upstreamResponse.json()) as UpstreamResponse;
      } catch {
        aiData = null;
      }
    } else {
      rawText = await upstreamResponse.text();
    }

    const upstreamDebug =
      aiData && "debug" in aiData && aiData.debug && typeof aiData.debug === "object"
        ? (aiData.debug as Record<string, unknown>)
        : null;

    const isSuccess =
      upstreamResponse.ok &&
      !!aiData &&
      aiData.ok === true;

    if (!isSuccess) {
      const errorCode =
        aiData && "errorCode" in aiData && typeof aiData.errorCode === "string"
          ? aiData.errorCode
          : "upstream_unavailable";

      const message =
        aiData && "message" in aiData && typeof aiData.message === "string"
          ? aiData.message
          : "AI service returned an error or non-JSON response.";

      const details =
        aiData && "details" in aiData && aiData.details
          ? (aiData.details as Record<string, unknown>)
          : null;

      const payload: ProxyErrorResponse = {
        ok: false,
        errorCode,
        message,
        statusCode: upstreamResponse.status,
        details,
        rawText,
        debug: {
          source: "wageflow-main",
          target: "wageflow-ai",
          stage: "upstream_error",
          upstreamDebug,
        },
      };

      return NextResponse.json(payload, { status: 502 });
    }

    const successData = aiData as UpstreamSuccess;

    const payload: ProxySuccessResponse = {
      ok: true,
      answer: successData.answer ?? null,
      highlights: successData.highlights ?? [],
      citations: successData.citations ?? [],
      followUps: successData.followUps ?? [],
      safety:
        typeof successData.safety === "object"
          ? successData.safety
          : null,
      debug: {
        source: "wageflow-main",
        target: "wageflow-ai",
        upstreamDebug,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error in Copilot proxy.";

    const payload: ProxyErrorResponse = {
      ok: false,
      errorCode: "internal_error",
      message,
      statusCode: 500,
      details: null,
      rawText: null,
      debug: {
        source: "wageflow-main",
        target: "wageflow-ai",
        stage: "exception",
        upstreamDebug: null,
      },
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
