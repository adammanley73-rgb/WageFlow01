// app/dashboard/companies/new/actions.ts
/* @ts-nocheck */
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Sets the company cookie (helper kept local so we don't import other modules)
 */
function setCompanyCookieLocal(id: string) {
  if (!id) return;
  cookies().set({
    name: "company_id",
    value: id,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
}

export async function createCompanyAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { ok: false, error: "Company name is required." };
  }

  const supabase = supabaseServer();

  // Call the SECURITY DEFINER RPC so RLS cannot block us mid-flow
  const { data: newId, error } = await supabase.rpc(
    "create_company_with_owner",
    { company_name: name }
  );

  if (error) {
    return { ok: false, error: error.message || "Failed to create company." };
  }
  if (!newId) {
    return { ok: false, error: "No company id returned." };
  }

  setCompanyCookieLocal(newId);
  redirect("/dashboard");
}
