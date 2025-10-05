/* @ts-nocheck */
"use server";

import { supabaseServer } from "@/lib/supabaseServer";
import { requireCompanyIdOrRedirect } from "@/lib/company";

export async function createServerAction(formData: FormData) {
  try {
    const companyId = requireCompanyIdOrRedirect();
    const supabase = supabaseServer();

    const payload = {
      company_id: companyId,
      first_name: (formData.get("first_name") as string)?.trim() || null,
      last_name: (formData.get("last_name") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      job_title: (formData.get("job_title") as string)?.trim() || null,
      ni_number: (formData.get("ni_number") as string)?.trim()?.toUpperCase() || null,
      pay_frequency: (formData.get("pay_frequency") as string) || null,
    };

    // Basic required fields
    if (!payload.first_name || !payload.last_name || !payload.email || !payload.pay_frequency) {
      return { ok: false, error: "First name, last name, email, and pay frequency are required." };
    }

    const { error } = await supabase.from("employees").insert(payload);
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Unexpected error" };
  }
}
