'use client';

export default function SupportPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(180deg, #3b82f6 0%, #1e40af 35%, #059669 65%, #10b981 100%)',
        padding: '20px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          boxShadow:
            '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#3b82f6',
            marginBottom: '20px',
            letterSpacing: '-0.5px',
          }}
        >
          WageFlow Support
        </h1>
        <p
          style={{
            fontSize: 18,
            color: '#64748b',
            marginBottom: '30px',
            fontWeight: 400,
          }}
        >
          Need help? Our support team is here for you.
        </p>

        <div
          style={{
            padding: '20px',
            borderRadius: 12,
            border: '2px solid #e5e7eb',
            backgroundColor: '#f8fafc',
            marginBottom: '20px',
          }}
        >
          <p
            style={{
              fontSize: 16,
              color: '#374151',
              marginBottom: '12px',
              fontWeight: 600,
            }}
          >
            Email Support:
          </p>
          <a
            href="mailto:support@thebusinessconsortiumltd.co.uk"
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: 16,
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            support@thebusinessconsortiumltd.co.uk
          </a>
        </div>
      </div>
    </div>
  );
}

