/* @ts-nocheck */
export function supabaseServer(){ return { auth:{ getUser: async ()=>({ data:{ user:null } }) } }; }
export async function getCompanyId(){ return null; }
export async function getAdmin(){ return { id: "admin-placeholder" }; }
export default { supabaseServer, getCompanyId, getAdmin };
