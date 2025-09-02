export default function HomePage() {
  return (
    <div style=
      fontFamily: 'system-ui', 
      padding: '40px', 
      textAlign: 'center', 
      backgroundColor: '#f8fafc', 
      minHeight: '100vh'
    >
      <h1 style=
        fontSize: '48px', 
        color: '#2563eb', 
        marginBottom: '32px'
      >WageFlow</h1>
      <div style=
        display: 'flex', 
        gap: '20px', 
        justifyContent: 'center'
      >
        <a href="/login" style=
          padding: '12px 24px', 
          backgroundColor: '#2563eb', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '8px'
        >Login</a>
        <a href="/dashboard" style=
          padding: '12px 24px', 
          backgroundColor: '#059669', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '8px'
        >Dashboard</a>
      </div>
    </div>
  );
}
