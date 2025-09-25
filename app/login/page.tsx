/* @ts-nocheck */
import { redirect } from 'next/navigation';

export default function LoginPage() {
  const bypass =
    process.env.AUTH_BYPASS === '1' ||
    process.env.NEXT_PUBLIC_AUTH_BYPASS === '1';

  if (bypass) {
    redirect('/dashboard');
  }

  // Optional: keep empty during build; add your real form later
  return null;
}

