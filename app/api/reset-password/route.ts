// C:\Projects\wageflow01\app\api\reset-password\route.ts

import { NextResponse } from "next/server";
import { createResetToken } from "../../../lib/reset-store";

export const runtime = "nodejs";

type ResetBody = {
  email?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as ResetBody | null;
    const raw = body?.email;

    if (!raw || typeof raw !== "string") {
      return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });
    }

    const email = raw.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });
    }

    // Always respond success to avoid email enumeration.
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const token = createResetToken(email);
    const link = `${appUrl}/reset-password/confirm?token=${encodeURIComponent(token)}`;

    // TODO: Implement email sending when needed
    console.log(`Reset link for ${email}: ${link}`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}