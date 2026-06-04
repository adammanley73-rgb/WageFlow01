// C:\Projects\wageflow01\app\api\employees\[id]\emergency\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type EmployeeRef = {
  id: string;
  employee_id: string | null;
  company_id: string | null;
};

type EmergencyContactRow = {
  contact_name: string | null;
  relationship: string | null;
  phone: string | null;
  email: string | null;
};

function isUuid(v: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim()
  );
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status });
}

function canonPhone(raw: unknown) {
  const trimmed = String(raw ?? "").trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return plus + digits;
}

function isValidPhone(raw: unknown) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return true;

  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isValidEmail(raw: unknown) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return true;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

async function resolveEmployee(supabase: any, rawId: unknown): Promise<EmployeeRef | null> {
  const rid = String(rawId ?? "").trim();
  if (!rid) return null;

  {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_id, company_id")
      .eq("employee_id", rid)
      .maybeSingle();

    if (error) throw error;

    const row = (data ?? null) as EmployeeRef | null;
    if (row?.id) return row;
  }

  if (isUuid(rid)) {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_id, company_id")
      .eq("id", rid)
      .maybeSingle();

    if (error) throw error;

    const row = (data ?? null) as EmployeeRef | null;
    if (row?.id) return row;
  }

  return null;
}

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const supabase = await createClient();

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) return json(401, { ok: false, error: "UNAUTHENTICATED" });

    const params = await ctx.params;
    const emp = await resolveEmployee(supabase, params?.id);
    if (!emp?.id) return json(404, { ok: false, error: "EMPLOYEE_NOT_FOUND" });

    const { data, error } = await supabase
      .from("employee_emergency_contacts")
      .select("contact_name, relationship, phone, email")
      .eq("employee_id", emp.id)
      .maybeSingle();

    if (error) return json(500, { ok: false, error: "LOAD_FAILED", details: error.message });

    if (!data) return new NextResponse(null, { status: 204 });

    const row = data as EmergencyContactRow;

    return json(200, { ok: true, data: row });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : String(e);
    return json(500, { ok: false, error: "UNEXPECTED_ERROR", details: msg });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const supabase = await createClient();

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) return json(401, { ok: false, error: "UNAUTHENTICATED" });

    const params = await ctx.params;
    const emp = await resolveEmployee(supabase, params?.id);
    if (!emp?.id || !emp?.company_id) return json(404, { ok: false, error: "EMPLOYEE_NOT_FOUND" });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const skipRequested =
      body?.skip_emergency_contact === true ||
      body?.skip_emergency_contact === "true" ||
      body?.skip_emergency_contact === 1 ||
      body?.skip_emergency_contact === "1";

    const contact_name = String(body?.contact_name ?? "").trim();
    const relationship = String(body?.relationship ?? "").trim();
    const rawPhone = String(body?.phone ?? "").trim();
    const phone = rawPhone ? canonPhone(rawPhone) : "";
    const email = String(body?.email ?? "").trim();

    const hasAnyValue = Boolean(contact_name || relationship || rawPhone || email);
    const hasContactMethod = Boolean(rawPhone || email);

    if (skipRequested || !hasAnyValue) {
      return json(200, { ok: true, skipped: true });
    }

    if (!contact_name) {
      return json(400, {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Contact name is required when adding an emergency contact.",
      });
    }

    if (!hasContactMethod) {
      return json(400, {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Enter a phone number or email address for the emergency contact.",
      });
    }

    if (rawPhone && !isValidPhone(rawPhone)) {
      return json(400, {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Enter a valid phone number.",
      });
    }

    if (email && !isValidEmail(email)) {
      return json(400, {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Enter a valid email address.",
      });
    }

    const payload: Record<string, unknown> = {
      employee_id: emp.id,
      company_id: emp.company_id,
      contact_name,
      relationship: relationship || null,
      phone: phone || null,
      email: email || null,
    };

    const { error } = await supabase.from("employee_emergency_contacts").upsert(payload, { onConflict: "employee_id" });

    if (error) return json(500, { ok: false, error: "SAVE_FAILED", details: error.message });

    return json(200, { ok: true });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : String(e);
    return json(500, { ok: false, error: "UNEXPECTED_ERROR", details: msg });
  }
}