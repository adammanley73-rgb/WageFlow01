/* @ts-nocheck */
export const supabase = { auth:{ getUser: async () => ({ data:{ user: null } }) } };
export function createClient(){ return supabase as any; }
