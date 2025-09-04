"use client";
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function PremiumLoginPage() {
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const callbackUrl = search.get('callbackUrl') || '/dashboard';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl: rememberMe ? `${callbackUrl}?remember=30` : callbackUrl,
    });

    if (res?.error) {
      setError('Invalid credentials. Please check your username and password.');
      return;
    }

    if (rememberMe) {
      document.cookie = `remember-me=true; max-age=${30 * 24 * 60 * 60}; path=/`;
    }

    window.location.href = callbackUrl;
  }

  // Premium Enterprise Styles - SOLID WHITE CARD
  const pageWrapper: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  };

  const loginCard: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    background: 'white',
    borderRadius: 24,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
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

  const logoImage: React.CSSProperties = {
    display: 'block',
    objectFit: 'contain',
  };

  const formContainer: React.CSSProperties = {
    padding: '32px',
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

  const fieldOptionsRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    marginBottom: '32px',
  };

  const rememberMeContainer: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const checkbox: React.CSSProperties = {
    width: '18px',
    height: '18px',
    accentColor: '#3b82f6',
    cursor: 'pointer',
  };

  const checkboxLabel: React.CSSProperties = {
    fontSize: 14,
    color: '#6b7280',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const forgotLink: React.CSSProperties = {
    fontSize: 14,
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.2s ease',
  };

  const errorMessage: React.CSSProperties = {
    background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: '20px',
    border: '1px solid #fca5a5',
  };

  const loginButton: React.CSSProperties = {
    width: '100%',
    padding: '18px',
    background: '#10b981',
    color: '#000000',
    border: '1px solid #059669',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '0.025em',
  };

  const supportButton: React.CSSProperties = {
    background: '#10b981',
    border: '1px solid #059669',
    borderRadius: 16,
    padding: '14px 28px',
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div style={pageWrapper}>
      <div style={loginCard}>
        <div style={header}>
          <div style={logoContainer}>
            <Image
              src="/WageFlowLogo.png"
              alt="WageFlow"
              width={120}
              height={120}
              priority
              style={logoImage}
            />
          </div>
        </div>

        <div style={formContainer}>
          {error && (
            <div style={errorMessage} role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <div style={fieldGroup}>
              <label htmlFor="email" style={label}>Username / Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                style={input}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
                onBlur={(e) => Object.assign(e.currentTarget.style, input)}
              />
            </div>

            <div style={fieldGroup}>
              <label htmlFor="password" style={label}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                style={input}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
                onBlur={(e) => Object.assign(e.currentTarget.style, input)}
              />
            </div>

            <div style={fieldOptionsRow}>
              <div style={rememberMeContainer}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={checkbox}
                />
                <label style={checkboxLabel}>
                  Remember me for 30 days
                </label>
              </div>
              <a href="/forgot-password" style={forgotLink}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" style={loginButton}>
              Sign In to WageFlow
            </button>
          </form>
        </div>
      </div>

      <a href="/support" style={supportButton}>
        💬 Need Help? Contact Support
      </a>
    </div>
  );
}
