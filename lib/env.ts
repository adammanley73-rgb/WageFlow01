/* @ts-nocheck */
type BuildProfile = 'preview' | 'prod';

function readProfile(): BuildProfile {
  const raw = process.env.BUILD_PROFILE?.toLowerCase();
  if (raw === 'prod') return 'prod';
  return 'preview';
}

const profile = readProfile();

export const env = {
  profile,
  preview: profile === 'preview',
  prod: profile === 'prod',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE || '',
} as const;
