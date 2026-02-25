/* @ts-nocheck */
// C:\Projects\wageflow01\app\api\absence\types\route.ts

import { NextResponse } from "next/server";
import { env } from "@lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: "absence/types disabled on preview" }, { status: 404 });
  }

  const items = [
    {
      code: "annual_leave",
      label: "Annual leave",
      endpoint: "/api/absence/annual",
      category: "holiday",
      paid_default: true,
      effective_from: null,
    },
    {
      code: "sickness",
      label: "Sickness",
      endpoint: "/api/absence/sickness",
      category: "sickness",
      paid_default: true,
      effective_from: null,
    },
    {
      code: "maternity",
      label: "Maternity",
      endpoint: "/api/absence/maternity",
      category: "family",
      paid_default: true,
      effective_from: null,
    },
    {
      code: "paternity",
      label: "Paternity",
      endpoint: "/api/absence/paternity",
      category: "family",
      paid_default: true,
      effective_from: null,
    },
    {
      code: "shared_parental",
      label: "Shared parental leave",
      endpoint: "/api/absence/shared-parental",
      category: "family",
      paid_default: true,
      effective_from: null,
    },
    {
      code: "adoption",
      label: "Adoption",
      endpoint: "/api/absence/adoption",
      category: "family",
      paid_default: true,
      effective_from: null,
    },
    {
      code: "parental_bereavement",
      label: "Parental bereavement",
      endpoint: "/api/absence/parental-bereavement",
      category: "bereavement",
      paid_default: true,
      effective_from: null,
    },
    {
      code: "unpaid_leave",
      label: "Unpaid leave",
      endpoint: "/api/absence/unpaid",
      category: "unpaid",
      paid_default: false,
      effective_from: null,
    },
    {
      code: "bereaved_partners_paternity",
      label: "Bereaved partner's paternity leave",
      endpoint: "/api/absence/bereaved-partners-paternity",
      category: "bereavement",
      paid_default: false,
      effective_from: "2026-04-06",
    },
  ];

  return NextResponse.json({ ok: true, items }, { status: 200 });
}

export async function POST() {
  if (env.preview) {
    return NextResponse.json({ ok: false, error: "absence/types disabled on preview" }, { status: 404 });
  }
  return NextResponse.json({ ok: false, error: "not implemented" }, { status: 501 });
}