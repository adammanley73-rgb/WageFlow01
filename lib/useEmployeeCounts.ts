'use client';

import { useEffect, useState } from 'react';
import { supabaseServer, getCompanyId } from '@/lib/supabaseServer';

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
      const sb = supabaseServer();
      const companyId = getCompanyId();

      if (!sb || !companyId) {
        if (isMounted) {
          setCounts({ employees: 0, runs: 0, tasks: 0, notices: 0 });
        }
        return;
      }

      const { data, error } = await sb
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (!isMounted) return;

      if (error) {
        setCounts({ employees: 0, runs: 0, tasks: 0, notices: 0 });
      } else {
        setCounts((prev) => ({
          ...prev,
          employees: data ? data.length : 0,
        }));
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return counts;
}
