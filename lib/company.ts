import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export async function getCompanyIdFromCookie(): Promise<string | null> {
  const c = (await cookies()).get("company_id");
  return c?.value ?? null;
}

export async function requireCompanyIdOrRedirect(): Promise<string> {
  const id = await getCompanyIdFromCookie();
  if (!id) redirect("/dashboard/companies");
  return id;
}

export async function clearCompanyCookie(): Promise<void> {
  (await cookies()).delete("company_id");
}

export async function setCompanyCookie(id: string): Promise<void> {
  if (!id) return;
  (await cookies()).set({
    name: "company_id",
    value: id,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
}

export async function fetchSelectedCompanyName(): Promise<string | null> {
  const id = await getCompanyIdFromCookie();
  if (!id) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.name ?? null;
}