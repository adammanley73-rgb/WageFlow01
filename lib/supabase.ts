/* @ts-nocheck */
function qbuilder() {
  const b = {
    select: async () => ({ data: [], error: null }),
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    upsert: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    eq: () => b, neq: () => b, in: () => b, like: () => b, order: () => b, range: () => b,
  };
  return b;
}
export const supabase = { from: (_table) => qbuilder() };
