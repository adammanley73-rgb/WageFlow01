/* @ts-nocheck */
export const dynamic = "force-dynamic";
export async function GET() {
  return new Response(JSON.stringify({ ok: true, entitlements: [] }), {
    headers: { "content-type": "application/json" }
  });
}
