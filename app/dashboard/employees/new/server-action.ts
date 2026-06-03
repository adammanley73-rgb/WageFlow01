"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { requireCompanyIdOrRedirect } from "@/lib/company";

type PayFrequency = "weekly" | "fortnightly" | "four_weekly" | "monthly";

function normalizePayFrequency(value: FormDataEntryValue | null): PayFrequency | null {
  const raw = String(value ?? "").trim().toLowerCase();

  if (!raw) return null;
  if (raw === "weekly") return "weekly";
  if (raw === "fortnightly") return "fortnightly";
  if (raw === "four_weekly") return "four_weekly";
  if (raw === "4-weekly") return "four_weekly";
  if (raw === "4 weekly") return "four_weekly";
  if (raw === "monthly") return "monthly";

  return null;
}

async function resolvePayScheduleId(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  companyId: string,
  payFrequency: PayFrequency
): Promise<string | null> {
  const { data: defaultSchedule, error: defaultError } = await supabase
    .from("pay_schedules")
    .select("id")
    .eq("company_id", companyId)
    .eq("frequency", payFrequency)
    .eq("is_active", true)
    .eq("is_default", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (defaultError) {
    throw new Error(defaultError.message);
  }

  if (defaultSchedule?.id) {
    return String(defaultSchedule.id);
  }

  const { data: fallbackSchedule, error: fallbackError } = await supabase
    .from("pay_schedules")
    .select("id")
    .eq("company_id", companyId)
    .eq("frequency", payFrequency)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    throw new Error(fallbackError.message);
  }

  return fallbackSchedule?.id ? String(fallbackSchedule.id) : null;
}

export async function createServerAction(formData: FormData) {
  try {
    const companyId = await requireCompanyIdOrRedirect();
    const supabase = await supabaseServer();

    const payFrequency = normalizePayFrequency(formData.get("pay_frequency"));

    if (!payFrequency) {
      return {
        ok: false,
        error: "Pay frequency is required.",
      };
    }

    const payScheduleId = await resolvePayScheduleId(supabase, companyId, payFrequency);

    if (!payScheduleId) {
      return {
        ok: false,
        error: "No active pay schedule exists for the selected pay frequency.",
      };
    }

    const payload = {
      company_id: companyId,
      first_name: (formData.get("first_name") as string)?.trim() || null,
      last_name: (formData.get("last_name") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim()?.toLowerCase() || null,
      job_title: (formData.get("job_title") as string)?.trim() || null,
      ni_number: (formData.get("ni_number") as string)?.trim()?.toUpperCase() || null,
      national_insurance_number:
        (formData.get("ni_number") as string)?.trim()?.toUpperCase() || null,
      pay_frequency: payFrequency,
      frequency: payFrequency,
      pay_schedule_id: payScheduleId,
    };

    if (!payload.first_name || !payload.last_name) {
      return {
        ok: false,
        error: "First name and last name are required.",
      };
    }

    const { error } = await supabase.from("employees").insert(payload);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Unexpected error" };
  }
}
