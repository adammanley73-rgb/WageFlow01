'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function deleteEmployeeAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) redirect('/dashboard/employees?m=missing');

  // Build absolute base URL so fetch works in any env
  const h = await headers();
  const host =
    h.get('x-forwarded-host') ??
    h.get('host') ??
    'localhost:3000';
  const proto =
    h.get('x-forwarded-proto') ??
    (host.startsWith('localhost') ? 'http' : 'https');
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}/api/employees/${id}/delete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  });

  if (res.ok) {
    revalidatePath('/dashboard/employees');
    redirect('/dashboard/employees?m=deleted');
  }

  if (res.status === 409) {
    redirect('/dashboard/employees?m=in_use');
  }

  // Bubble detail if present so you can see what moaned
  let detail = '';
  try {
    const j = await res.json();
    detail = j?.detail || j?.error || '';
  } catch {
    /* ignore */
  }
  redirect(
    `/dashboard/employees?m=error${
      detail ? `&d=${encodeURIComponent(detail)}` : ''
    }`,
  );
}
