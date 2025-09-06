import { createClient } from "@supabase/supabase-js";

// Guard against missing env vars at build/runtime (avoids cryptic errors)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Types for your employee data (snake_case to match DB columns)
export interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  annual_salary: number;
  employment_type: string;
  status: string;
  hire_date: string; // ISO date string
  address?: {
    line1: string;
    city: string;
    postcode: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}
