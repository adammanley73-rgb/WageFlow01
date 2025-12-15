/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\dashboard\employees\[id]\wizard\emergency\page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/ui/PageTemplate";

const BTN_PRIMARY =
  "w-44 inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2 text-white disabled:opacity-50";
const BTN_SECONDARY =
  "w-32 inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-800";
const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

function canonPhone(raw: string) {
  const trimmed = String(raw || "").trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return plus + digits;
}

export default function EmergencyContactPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ""), [params]);
  const router = useRouter();

  const [contactName, setContactName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;

    const name = contactName.trim();
    const rel = relationship.trim();
    const tel = canonPhone(phone);
    const mail = email.trim();

    if (!name) {
      setErr("Contact name is required.");
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      const res = await fetch(`/api/employees/${id}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: id,
          contact_name: name,
          relationship: rel || null,
          phone: tel || null,
          email: mail || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || "Failed to save emergency contact");
      }

      router.push(`/dashboard/employees/${id}/edit`);
    } catch (err: any) {
      setErr(err?.message || "Failed to save emergency contact");
      setBusy(false);
    }
  }

  return (
    <PageTemplate
      title="Emergency Contact"
      currentSection="employees"
      headerMode="wizard"
      backHref={`/dashboard/employees/${id}/wizard/bank`}
      backLabel="Back"
    >
      <form onSubmit={onSubmit} className={CARD}>
        <h2 className="text-lg font-semibold text-center mb-4">
          Emergency Contact
        </h2>

        {err ? (
          <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              Contact name
            </label>
            <input
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Jane Bloggs"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Relationship
            </label>
            <input
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Spouse, Parent, Friend"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+447700900123"
                inputMode="tel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Link href={`/dashboard/employees/${id}/edit`} className={BTN_SECONDARY}>
              Cancel
            </Link>
            <button type="submit" className={BTN_PRIMARY} disabled={busy}>
              {busy ? "Saving…" : "Save and finish"}
            </button>
          </div>
        </div>
      </form>
    </PageTemplate>
  );
}
