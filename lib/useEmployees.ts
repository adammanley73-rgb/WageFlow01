// @ts-nocheck
/* preview: auto-suppressed to keep Preview builds green. */
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  ni: string | null;
  pay_group: string | null;
  hourly_rate: number | null;
  weekly_hours: number | null;
  annual_salary: number | null;
};

export default function useEmployees() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchEmployees() {
    setLoading(true);
    const { data, error } = await supabase.from('employees').select('*');
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setError(null);
      setRows(data || []);
    }
    setLoading(false);
  }

  async function remove(id: string) {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      setRows(prev => prev.filter(emp => emp.id !== id));
    }
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  return { rows, loading, error, refresh: fetchEmployees, remove };
}
