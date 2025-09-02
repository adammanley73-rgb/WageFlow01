'use client';

export default function DashboardPage() {
return (
<div
style={{
fontFamily: 'system-ui',
padding: '40px',
textAlign: 'center',
backgroundColor: '#f8fafc',
minHeight: '100vh'
}}
>
<h1
style={{
fontSize: '48px',
color: '#2563eb',
marginBottom: '32px'
}}
>
WageFlow Dashboard
</h1>
<p>Dashboard is working! Authentication temporarily disabled for testing.</p>
<div
style={{
display: 'flex',
gap: '20px',
justifyContent: 'center',
marginTop: '32px'
}}
>
<a
href="/"
style={{
padding: '12px 24px',
backgroundColor: '#6b7280',
color: 'white',
textDecoration: 'none',
borderRadius: '8px'
}}
>
← Home
</a>
<a
href="/login"
style={{
padding: '12px 24px',
backgroundColor: '#2563eb',
color: 'white',
textDecoration: 'none',
borderRadius: '8px'
}}
>
Login
</a>
</div>
</div>
);
}
