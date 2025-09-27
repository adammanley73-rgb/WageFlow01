/* RTI dashboard placeholder to avoid build-time Supabase errors during auth hardening. */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function RTIPage() {
  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>RTI</h1>
      <p style={{ opacity: 0.8 }}>
        Temporarily disabled until authentication and environment hardening are complete.
      </p>
    </main>
  )
}
