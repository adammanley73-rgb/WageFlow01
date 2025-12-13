// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\[id]\edit\loader.ts

type LoadAbsenceOk = {
  ok: true;
  absence: unknown;
  employee: unknown;
};

type LoadAbsenceFail = {
  ok: false;
  error: string;
};

type LoadAbsenceResult = LoadAbsenceOk | LoadAbsenceFail;

export async function loadAbsence(absenceId: string): Promise<LoadAbsenceResult> {
  if (!absenceId) return { ok: false, error: "Missing absence ID" };

  try {
    const res = await fetch(`/api/absence/${absenceId}`, {
      method: "GET",
      cache: "no-store",
    });

    const data: any = await res.json().catch(() => null);

    if (!res.ok) {
      return { ok: false, error: data?.error || "Failed to load" };
    }

    return { ok: true, absence: data?.absence, employee: data?.employee };
  } catch (err) {
    console.error("loadAbsence error:", err);
    return { ok: false, error: "Unexpected error loading absence" };
  }
}
