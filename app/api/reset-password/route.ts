import { NextResponse } from 'next/server';
import { createResetToken } from '../../../lib/reset-store';
import { sendResetEmail } from '../../../lib/mailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Email required' }, { status: 400 });
    }

    // Always respond success to avoid email enumeration.
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const token = createResetToken(email.toLowerCase().trim());
    const link = `${appUrl}/reset-password/confirm?token=${encodeURIComponent(token)}`;

    // Fire and forget. Swallow send errors to avoid leaking info.
    try { await sendResetEmail(email, link); } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
