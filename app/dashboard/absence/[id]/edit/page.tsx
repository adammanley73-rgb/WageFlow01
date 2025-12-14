/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\[id]\edit\page.tsx

"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import PageTemplate from "@/components/layout/PageTemplate"

const ACTION_BTN =
  "rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 transition"

type LoadedAbsence = {
  id: string
  employeeId: string
  employeeLabel: string
  type: string
  firstDay: string
  lastDayExpected: string | null
  lastDayActual: string | null
  referenceNotes: string | null
  status: string | null
}

type ApiResponse = {
  ok: boolean
  code?: string
  message?: string
  absence?: LoadedAbsence
  conflicts?: {
    id: string
    startDate: string
    endDate: string
  }[]
}

export default function EditAbsencePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = String(params?.id || "")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [employeeLabel, setEmployeeLabel] = useState("")
  const [firstDay, setFirstDay] = useState("")
  const [lastDayExpected, setLastDayExpected] = useState("")
  const [lastDayActual, setLastDayActual] = useState("")
  const [referenceNotes, setReferenceNotes] = useState("")

  const [loadError, setLoadError] = useState<string | null>(null)
  const [validationError, setValidationError] =
    useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    async function loadAbsence() {
      try {
        setLoading(true)
        setLoadError(null)

        const res = await fetch(`/api/absence/${id}`, {
          method: "GET",
        })

        if (!res.ok) {
          let message = "Could not load this absence."
          try {
            const data = (await res.json()) as ApiResponse
            if (data?.message) {
              message = data.message
            }
          } catch {
            // ignore JSON parse issues
          }
          setLoadError(message)
          return
        }

        const data = (await res.json()) as ApiResponse

        if (!data.ok || !data.absence) {
          setLoadError(
            data.message || "Could not load this absence."
          )
          return
        }

        const a = data.absence

        setEmployeeLabel(a.employeeLabel || "Employee")
        setFirstDay(a.firstDay || "")
        setLastDayExpected(a.lastDayExpected || "")
        setLastDayActual(a.lastDayActual || "")
        setReferenceNotes(a.referenceNotes || "")

        setLoadError(null)
      } catch (err: any) {
        console.error("Load absence error:", err)
        setLoadError(
          err?.message || "Could not load this absence."
        )
      } finally {
        setLoading(false)
      }
    }

    loadAbsence()
  }, [id])

  function validateForm(): boolean {
    if (!firstDay) {
      setValidationError("First day of absence is required.")
      return false
    }

    if (!lastDayExpected) {
      setValidationError(
        "Expected last day of absence is required."
      )
      return false
    }

    if (lastDayExpected < firstDay) {
      setValidationError(
        "Expected last day cannot be earlier than the first day."
      )
      return false
    }

    if (lastDayActual && lastDayActual < firstDay) {
      setValidationError(
        "Actual last day cannot be earlier than the first day."
      )
      return false
    }

    setValidationError(null)
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    setSaveError(null)

    const valid = validateForm()
    if (!valid) return

    try {
      setSaving(true)

      const payload = {
        first_day: firstDay,
        last_day_expected: lastDayExpected,
        last_day_actual: lastDayActual || null,
        reference_notes: referenceNotes || null,
      }

      const res = await fetch(`/api/absence/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      let data: ApiResponse | null = null
      try {
        data = (await res.json()) as ApiResponse
      } catch {
        data = null
      }

      if (!res.ok || !data?.ok) {
        if (data?.code === "ABSENCE_DATE_OVERLAP") {
          const conflict = data.conflicts?.[0]
          const msg = conflict
            ? `These dates would overlap another absence from ${conflict.startDate} to ${conflict.endDate}.`
            : data.message ||
              "These dates would overlap another existing absence."
          setSaveError(msg)
        } else {
          setSaveError(
            data?.message ||
              "Could not update this absence. Please try again."
          )
        }
        setSaving(false)
        return
      }

      router.push("/dashboard/absence")
    } catch (err: any) {
      console.error("Update absence error:", err)
      setSaveError(
        err?.message ||
          "Unexpected error while updating this absence."
      )
      setSaving(false)
    }
  }

  function handleCancel() {
    router.push("/dashboard/absence")
  }

  return (
    <PageTemplate title="Edit absence" currentSection="absence">
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-100 to-sky-100 px-6 py-5 md:px-8 md:py-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Edit absence
          </h1>
          <p className="mt-1 text-sm text-neutral-700">
            Update this recorded absence. These changes affect future
            payroll.
          </p>
        </div>

        {loadError && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {loadError}
          </div>
        )}

        {validationError && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {validationError}
          </div>
        )}

        {saveError && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {saveError}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-300 px-6 py-6 md:px-8 md:py-8 text-sm text-neutral-600">
            Loading absenceÃ¢â‚¬Â¦
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-300 px-6 py-6 md:px-8 md:py-8 space-y-6"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-900">
                Employee
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm bg-neutral-50 text-neutral-800"
                value={employeeLabel}
                disabled
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-900">
                  First day of absence
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  value={firstDay}
                  onChange={(e) => setFirstDay(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-900">
                  Last day (expected)
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  value={lastDayExpected}
                  onChange={(e) =>
                    setLastDayExpected(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-900">
                Last day (actual)
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                value={lastDayActual}
                onChange={(e) =>
                  setLastDayActual(e.target.value)
                }
              />
              <p className="text-xs text-neutral-500">
                Leave this blank until the absence has ended. You can
                update it later from this Edit absence page.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-900">
                Reference notes
              </label>
              <textarea
                className="w-full min-h-[96px] rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                value={referenceNotes}
                onChange={(e) =>
                  setReferenceNotes(e.target.value)
                }
                placeholder="Optional notes for this absence."
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`${ACTION_BTN} ${
                  saving ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {saving ? "SavingÃ¢â‚¬Â¦" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </PageTemplate>
  )
}
