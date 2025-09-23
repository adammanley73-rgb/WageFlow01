import { createClient } from '@supabase/supabase-js';
export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ ok:false, error:'env missing' });
    const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { error } = await svc.from('pay_runs').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) return res.status(500).json({ ok:false, service_query_ok:false, error:error.message });
    return res.status(200).json({ ok:true, service_query_ok:true, time:new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e) });
  }
}
