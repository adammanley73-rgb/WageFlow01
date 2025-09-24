/* @ts-nocheck */
export const supabase = {
  from() {
    const ok = async () => ({ data: null, error: null });
    const okArr = async () => ({ data: [], error: null });
    return { select: okArr, insert: ok, update: ok, delete: ok };
  },
  auth: { getUser: async () => ({ data: { user: null } }) }
};
