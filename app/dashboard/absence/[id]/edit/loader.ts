/* @ts-nocheck */

export async function loadAbsence(absenceId) {
  if (!absenceId) return { ok: false, error: "Missing absence ID" };

  try {
    const res = await fetch(`/api/absence/${absenceId}`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) return { ok: false, error: data?.error || "Failed to load" };

    return { ok: true, absence: data?.absence, employee: data?.employee };
  } catch (err) {
    console.error("loadAbsence error:", err);
    return { ok: false, error: "Unexpected error loading absence" };
  }
}
