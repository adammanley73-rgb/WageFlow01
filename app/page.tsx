"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to dashboard after a brief moment
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: 'white',
        textAlign: 'center',
        padding: '40px 20px'
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '60px 40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          maxWidth: '600px',
          width: '100%',
          color: '#1f2937'
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          💼 WageFlow
        </h1>

        <h2
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#374151',
            margin: '0 0 24px 0'
          }}
        >
          Professional UK Payroll Management
        </h2>

        <p
          style={{
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.6',
            margin: '0 0 32px 0'
          }}
        >
          Complete payroll system with employee management, auto-enrollment compliance,
          tax code management, and UK regulatory features. Built for modern businesses.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}
        >
          <a
            href="/dashboard"
            style={{
              backgroundColor: '#10b981',
              color: '#000000',
              fontWeight: 'bold',
              padding: '16px 32px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '16px',
              border: '1px solid #059669',
              transition: 'all 0.2s ease',
              display: 'inline-block'
            }}
          >
            🚀 Enter Dashboard
          </a>

          <a
            href="/login"
            style={{
              backgroundColor: 'transparent',
              color: '#374151',
              fontWeight: 'bold',
              padding: '16px 32px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '16px',
              border: '2px solid #e5e7eb',
              transition: 'all 0.2s ease',
              display: 'inline-block'
            }}
          >
            👤 Login
          </a>
        </div>

        <div
          style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#6b7280'
          }}
        >
          <strong>✨ Features:</strong> Employee Management • Payroll Processing • Auto-Enrollment • Tax Compliance • UK Formatting
        </div>

        <p
          style={{
            fontSize: '14px',
            color: '#9ca3af',
            margin: '24px 0 0 0'
          }}
        >
          Redirecting to dashboard automatically...
        </p>
      </div>
    </div>
  );
}
