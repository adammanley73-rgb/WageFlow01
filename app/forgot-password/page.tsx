'use client';
import Image from 'next/image';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add your password reset logic here
    setSent(true);
  };

  // Premium Enterprise Styles (matching login page)
  const pageWrapper: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'linear-gradient(180deg, #3b82f6 0%, #1e40af 35%, #059669 65%, #10b981 100%)',
    padding: '20px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  };

  const resetCard: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    boxShadow:
      '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    marginBottom: '40px',
  };

  const header: React.CSSProperties = {
    padding: '40px 32px 20px',
    textAlign: 'center',
    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
  };

  const logoContainer: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  };

  const formContainer: React.CSSProperties = {
    padding: '32px',
  };

  const title: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '8px',
    textAlign: 'center',
    letterSpacing: '-0.5px',
  };

  const subtitle: React.CSSProperties = {
    fontSize: 16,
    color: '#64748b',
    marginBottom: '32px',
    textAlign: 'center',
    fontWeight: 400,
  };

  const fieldGroup: React.CSSProperties = {
    marginBottom: '24px',
  };

  const label: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
    letterSpacing: '0.025em',
  };

  const input: React.CSSProperties = {
    width: '100%',
    padding: '16px 18px',
    fontSize: 16,
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    backgroundColor: '#fff',
  };

  const inputFocus: React.CSSProperties = {
    ...input,
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)',
  };

  const button: React.CSSProperties = {
    width: '100%',
    padding: '18px',
    background:
      'linear-gradient(180deg, #3b82f6 0%, #1e40af 35%, #059669 65%, #10b981 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
    letterSpacing: '0.025em',
  };

  const backLink: React.CSSProperties = {
    display: 'block',
    textAlign: 'center',
    marginTop: '20px',
    fontSize: 14,
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.2s ease',
  };

  const successIcon: React.CSSProperties = {
    fontSize: 48,
    color: '#10b981',
    textAlign: 'center',
    marginBottom: '20px',
  };

  const successTitle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '8px',
    textAlign: 'center',
    letterSpacing: '-0.5px',
  };

  const successMessage: React.CSSProperties = {
    fontSize: 16,
    color: '#64748b',
    marginBottom: '32px',
    textAlign: 'center',
    fontWeight: 400,
  };

  const successContainer: React.CSSProperties = {
    textAlign: 'center',
  };

  const supportButton: React.CSSProperties = {
    background: '#3b82f6',
    border: '2px solid #1e40af',
    borderRadius: 16,
    padding: '14px 28px',
    color: 'white',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
  };

  return (
    <div style={pageWrapper}>
      <div style={resetCard}>
        <div style={header}>
          <div style={logoContainer}>
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow"
              width={120}
              height={120}
              priority
              style={{
                borderRadius: 24,
                boxShadow: '0 12px 30px rgba(59, 130, 246, 0.4)',
              }}
            />
          </div>
        </div>

        <div style={formContainer}>
          {!sent ? (
            <>
              <h1 style={title}>Reset Password</h1>
              <p style={subtitle}>
                Enter your email to receive reset instructions
              </p>

              <form onSubmit={handleSubmit}>
                <div style={fieldGroup}>
                  <label htmlFor="email" style={label}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={input}
                    onFocus={(e) =>
                      Object.assign(
                        (e.target as HTMLInputElement).style,
                        inputFocus
                      )
                    }
                    onBlur={(e) =>
                      Object.assign((e.target as HTMLInputElement).style, input)
                    }
                    placeholder="Enter your email address"
                  />
                </div>

                <button type="submit" style={button}>
                  Send Reset Instructions
                </button>
              </form>

              <a href="/login" style={backLink}>
                ← Back to Login
              </a>
            </>
          ) : (
            <div style={successContainer}>
              <div style={successIcon}>✓</div>
              <h1 style={successTitle}>Email Sent!</h1>
              <p style={successMessage}>
                Check your email for password reset instructions.
              </p>
              <a href="/login" style={backLink}>
                ← Back to Login
              </a>
            </div>
          )}
        </div>
      </div>

      <a href="/support" style={supportButton}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
        </svg>
        SUPPORT
      </a>
    </div>
  );
}

