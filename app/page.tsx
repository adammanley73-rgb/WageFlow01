"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DemoPage() {
  const router = useRouter();

  const handleDemoAccess = () => {
    // Direct navigation to dashboard
    window.location.href = '/dashboard';
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
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: '40px 20px',
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
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <img
            src="/WageFlowLogo.png"
            alt="WageFlow"
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'contain',
              margin: '0 auto 16px auto',
              display: 'block',
            }}
            onError={(e) => {
              // Hide image if it doesn't exist
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        <h1
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          💼 WageFlow
        </h1>

        <h2
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#374151',
            margin: '0 0 12px 0',
          }}
        >
          UK Payroll Management Demo
        </h2>

        <p
          style={{
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.6',
            margin: '0 0 32px 0',
          }}
        >
          Professional payroll system with employee management, auto-enrollment compliance, and UK tax
          features.
        </p>

        <button
          onClick={handleDemoAccess}
          style={{
            backgroundColor: '#10b981',
            color: '#000000',
            fontWeight: 'bold',
            padding: '20px 40px',
            borderRadius: '12px',
            border: '1px solid #059669',
            fontSize: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%',
            marginBottom: '16px',
          }}
        >
          🚀 View Live Demo System
        </button>

        <div
          style={{
            fontSize: '12px',
            color: '#9ca3af',
          }}
        >
          Click above to explore the complete WageFlow system
        </div>
      </div>
    </div>
  );
}
