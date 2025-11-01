"use server";

import { revalidatePath } from "next/cache";

/**
 * Temporary no-DB delete action so the UI compiles and the modal works.
 * This simulates a successful delete and revalidates the Payroll page.
 * We'll wire the real Supabase deletion once your server client helper path is confirmed.
 */
export async function deletePayRun(runId: string) {
  // Simulate latency so the "Deleting..." state is visible
  await new Promise((r) => setTimeout(r, 300));

  // No actual deletion yet (demo data on the page). Just revalidate.
  revalidatePath("/dashboard/payroll");
}
