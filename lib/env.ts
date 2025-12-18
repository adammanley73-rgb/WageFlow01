// C:\Users\adamm\Projects\wageflow01\lib\env.ts
// Public env shim. Exports named constants and both default and named env objects.
// preview should mean Vercel Preview deploys only (not local dev).

type NonEmpty = string & { __brand: "NonEmpty" };

function must(name: string): NonEmpty {
const v = process.env[name];
if (!v || v.trim() === "") {
throw new Error(Missing required environment variable: ${name});
}
return v as NonEmpty;
}

export const NEXT_PUBLIC_SUPABASE_URL: NonEmpty = must("NEXT_PUBLIC_SUPABASE_URL");
export const NEXT_PUBLIC_SUPABASE_ANON_KEY: NonEmpty = must("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Environment info for gating features
const vercelEnv = process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? "";
const nodeEnv = process.env.NODE_ENV ?? "development";

// Production means either Vercel production or NODE_ENV=production
const isProd = vercelEnv === "production" || nodeEnv === "production";

// Preview means Vercel Preview deployments only.
// Local dev should NOT be treated as preview.
const preview = vercelEnv === "preview" || process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

export type EnvShape = {
NEXT_PUBLIC_SUPABASE_URL: NonEmpty;
NEXT_PUBLIC_SUPABASE_ANON_KEY: NonEmpty;
preview: boolean;
isProd: boolean;
vercelEnv: string;
};

const env: EnvShape = {
NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY,
preview,
isProd,
vercelEnv,
};

export default env;
export { env };