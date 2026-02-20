/* @ts-nocheck */
"use server";

import { revalidatePath } from "next/cache";
import { setCompanyCookie, clearCompanyCookie } from "@/lib/company";

export async function selectCompanyAction(formData: FormData) {
  const id = (formData.get("company_id") as string) || "";
  if (!id) return { ok: false, error: "Missing company_id" };
  await setCompanyCookie(id);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function clearCompanyAction() {
  await clearCompanyCookie();
  revalidatePath("/dashboard");
  return { ok: true };
}
