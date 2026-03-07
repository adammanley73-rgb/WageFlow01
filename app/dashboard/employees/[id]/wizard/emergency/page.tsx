// C:\Projects\wageflow01\app\dashboard\employees\[id]\wizard\emergency\page.tsx

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageTemplate from "@/components/ui/PageTemplate";

const BTN_PRIMARY =
  "w-44 inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "w-32 inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-800";
const CARD = "rounded-xl bg-neutral-300 ring-1 ring-neutral-400 shadow-sm p-6";

type FieldErrors = {
  contact_name: string;
  relationship: string;
  phone: string;
  email: string;
};

function canonPhone(raw: string) {
  const trimmed = String(raw || "").trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return plus + digits;
}

function isValidPhone(raw: string) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return false;

  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isValidEmail(raw: string) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function isJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

function getFieldErrors(values: {
  contactName: string;
  relationship: string;
  phone: string;
  email: string;
}): FieldErrors {
  const contactName = String(values.contactName || "").trim();
  const relationship = String(values.relationship || "").trim();
  const phone = String(values.phone || "").trim();
  const email = String(values.email || "").trim();

  return {
    contact_name: contactName ? "" : "Contact name is required.",
    relationship: relationship ? "" : "Relationship is required.",
    phone: !phone ? "Phone is required." : !isValidPhone(phone) ? "Enter a valid phone number." : "",
    email: !isValidEmail(email) ? "Enter a valid email address." : "",
  };
}

export default function EmergencyContactPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => String(params?.id || ""), [params]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [contactName, setContactName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [touched, setTouched] = useState({
    contact_name: false,
    relationship: false,
    phone: false,
    email: false,
  });

  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;

    (async () => {
      if (!id) return;

      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/employees/${id}/emergency`, { cache: "no-store" });

        if (res.status === 404 || res.status === 204) {
          return;
        }

        if (!res.ok) {
          let msg = `Load failed (${res.status})`;

          if (isJson(res)) {
            const j = await res.json().catch(() => ({} as any));
            msg = j?.error || msg;
          }

          throw new Error(msg);
        }

        if (isJson(res)) {
          const j = await res.json().catch(() => ({} as any));
          const d = (j?.data ?? j ?? null) as any;

          if (aliveRef.current && d) {
            setContactName(String(d.contact_name ?? ""));
            setRelationship(String(d.relationship ?? ""));
            setPhone(String(d.phone ?? ""));
            setEmail(String(d.email ?? ""));
          }
        }
      } catch (e: any) {
        if (aliveRef.current) setErr(String(e?.message || e));
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    })();

    return () => {
      aliveRef.current = false;
    };
  }, [id]);

  const fieldErrors = useMemo(
    () =>
      getFieldErrors({
        contactName,
        relationship,
        phone,
        email,
      }),
    [contactName, relationship, phone, email]
  );

  const canSave = useMemo(() => {
    return (
      !fieldErrors.contact_name &&
      !fieldErrors.relationship &&
      !fieldErrors.phone &&
      !fieldErrors.email
    );
  }, [fieldErrors]);

  function markTouched(name: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;

    setTouched({
      contact_name: true,
      relationship: true,
      phone: true,
      email: true,
    });

    if (!canSave) {
      setErr(
        [
          fieldErrors.contact_name,
          fieldErrors.relationship,
          fieldErrors.phone,
          fieldErrors.email,
        ]
          .filter(Boolean)
          .join(" ")
      );
      return;
    }

    const name = contactName.trim();
    const rel = relationship.trim();
    const tel = canonPhone(phone);
    const mail = email.trim();

    setBusy(true);
    setErr(null);

    try {
      const res = await fetch(`/api/employees/${id}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: name,
          relationship: rel,
          phone: tel,
          email: mail || null,
        }),
      });

      if (!res.ok) {
        let msg = "Failed to save emergency contact";

        if (isJson(res)) {
          const j = await res.json().catch(() => ({} as any));
          msg = j?.error || msg;
          if (j?.extra?.details) msg = `${msg}: ${j.extra.details}`;
        } else {
          msg = `${msg} (${res.status})`;
        }

        throw new Error(msg);
      }

      router.push(`/dashboard/employees/${id}`);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setBusy(false);
    }
  }

  function inputClass(hasError: boolean) {
    return `w-full rounded-lg border px-3 py-2 bg-white ${
      hasError ? "border-red-600 ring-2 ring-red-200" : "border-neutral-300"
    }`;
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
        <h2 className="mb-4 text-center text-lg font-semibold">Emergency Contact</h2>

        {loading ? <div className="text-sm text-neutral-800">Loading...</div> : null}

        {err ? (
          <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">{err}</div>
        ) : null}

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium">Contact name</label>
            <input
              className={inputClass(!!(touched.contact_name && fieldErrors.contact_name))}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onBlur={() => markTouched("contact_name")}
              placeholder="e.g. Jane Bloggs"
              disabled={busy}
              aria-invalid={touched.contact_name && !!fieldErrors.contact_name}
            />
            {touched.contact_name && fieldErrors.contact_name ? (
              <div className="mt-1 text-xs text-red-700">{fieldErrors.contact_name}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Relationship</label>
            <input
              className={inputClass(!!(touched.relationship && fieldErrors.relationship))}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              onBlur={() => markTouched("relationship")}
              placeholder="e.g. Spouse, Parent, Friend"
              disabled={busy}
              aria-invalid={touched.relationship && !!fieldErrors.relationship}
            />
            {touched.relationship && fieldErrors.relationship ? (
              <div className="mt-1 text-xs text-red-700">{fieldErrors.relationship}</div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input
                className={inputClass(!!(touched.phone && fieldErrors.phone))}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => markTouched("phone")}
                placeholder="+447700900123"
                inputMode="tel"
                disabled={busy}
                aria-invalid={touched.phone && !!fieldErrors.phone}
              />
              {touched.phone && fieldErrors.phone ? (
                <div className="mt-1 text-xs text-red-700">{fieldErrors.phone}</div>
              ) : (
                <div className="mt-1 text-xs text-neutral-700">
                  Enter a real contact number, 10 to 15 digits.
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                className={inputClass(!!(touched.email && fieldErrors.email))}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched("email")}
                placeholder="name@example.com"
                disabled={busy}
                aria-invalid={touched.email && !!fieldErrors.email}
              />
              {touched.email && fieldErrors.email ? (
                <div className="mt-1 text-xs text-red-700">{fieldErrors.email}</div>
              ) : (
                <div className="mt-1 text-xs text-neutral-700">Optional, but must be valid if entered.</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href={`/dashboard/employees/${id}/wizard/bank`} className={BTN_SECONDARY}>
              Back
            </Link>

            <button type="submit" className={BTN_PRIMARY} disabled={busy || !canSave}>
              {busy ? "Saving..." : "Save and continue"}
            </button>
          </div>
        </div>
      </form>
    </PageTemplate>
  );
}
