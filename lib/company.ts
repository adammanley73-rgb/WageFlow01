// lib/company.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

// Note: do NOT put "use server" in this file.
// Next would treat every export as a server action and require async.

export function getCompanyIdFromCookie(): string | null {
  const c = cookies().get("company_id");
  return c?.value ?? null;
}

export function requireCompanyIdOrRedirect(): string {
  const id = getCompanyIdFromCookie();
  if (!id) redirect("/dashboard/companies");
  return id;
}

export function clearCompanyCookie() {
  cookies().delete("company_id");
}

export function setCompanyCookie(id: string) {
  if (!id) return;
  cookies().set({
    name: "company_id",
    value: id,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
}

export async function fetchSelectedCompanyName(): Promise<string | null> {
  const id = getCompanyIdFromCookie();
  if (!id) return null;
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.name ?? null;
}
