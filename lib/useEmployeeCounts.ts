'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Counts = {
  employees: number;
  runs: number;
  tasks: number;
  notices: number;
};

export default function useEmployeeCounts() {
  const [counts, setCounts] = useState<Counts>({
    employees: 0,
    runs: 0,
    tasks: 0,
    notices: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const companyId = document.cookie
        .split('; ')
        .find((row) => row.startsWith('company_id='))
        ?.split('=')[1];

      if (!companyId) {
        if (isMounted) setCounts({ employees: 0, runs: 0, tasks: 0, notices: 0 });
        return;
      }

      const { count, error } = await sb
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (!isMounted) return;

      if (error) {
        setCounts({ employees: 0, runs: 0, tasks: 0, notices: 0 });
      } else {
        setCounts((prev) => ({ ...prev, employees: count ?? 0 }));
      }
    }

    void load();
    return () => { isMounted = false; };
  }, []);

  return counts;
}