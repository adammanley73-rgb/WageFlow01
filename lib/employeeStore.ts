/* @ts-nocheck */
export async function getAll(){ return []; }
export async function removeEmployee(id:any){ return { ok: true, id }; }
export function subscribe(fn:Function){ return () => {}; }
export default { getAll, removeEmployee, subscribe };
