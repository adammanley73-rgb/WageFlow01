"use client";
import { useRouter } from 'next/navigation';

export default function DemoLoginPage() {
  const router = useRouter();

  const handleDemoLogin = () => {
    // Simulate login success
    localStorage.setItem('demo-user', 'true');
    router.push('/dashboard');
  };

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
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
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
            margin: '0 0 12px 0'
          }}
        >
          UK Payroll Management System
        </h2>

        <p
          style={{
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.6',
            margin: '0 0 32px 0'
          }}
        >
          Professional payroll system with employee management,
          auto-enrollment compliance, and UK tax features.
        </p>

        <div
          style={{
            backgroundColor: '#f0f9ff',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '24px',
            margin: '0 0 32px 0'
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1e40af',
              margin: '0 0 16px 0'
            }}
          >
            🎯 Live Demo Access
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 20px 0'
            }}
          >
            Explore the complete system with demo data including:<br />
            • Employee Management • Payroll Processing<br />
            • Auto-Enrollment Dashboard • Tax Compliance
          </p>
          <button
            onClick={handleDemoLogin}
            style={{
              backgroundColor: '#10b981',
              color: '#000000',
              fontWeight: 'bold',
              padding: '16px 32px',
              borderRadius: '12px',
              border: '1px solid #059669',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            🚀 Enter Demo (No Login Required)
          </button>
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            fontSize: '12px',
            color: '#6b7280'
          }}
        >
          <strong>✨ Features:</strong> Employee CRUD • Payroll Calculations •
          Auto-Enrollment Compliance • Tax Code Management •
          Overtime Rates • Pay Elements • UK Formatting
        </div>
      </div>
    </div>
  );
}
