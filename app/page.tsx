'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const THROTTLE_KEY = 'wageflow-login-throttle';
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const LOCK_MS = LOCK_MINUTES * 60 * 1000;

type ThrottleData = {
  attempts: number;
  lockedUntil?: number;
};

// UK helpers
const TAX_YEAR = '2025-26';
const formatDateUK = (d: number | Date) => {
  const date = typeof d === 'number' ? new Date(d) : d;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};
const formatCurrencyUK = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isThrottled, setIsThrottled] = useState(false);
  const [lockedUntilText, setLockedUntilText] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    try {
      const token =
        localStorage.getItem('wageflow-auth') ||
        sessionStorage.getItem('wageflow-auth');
      if (!token) return;
      let authed = false;
      try {
        authed = !!JSON.parse(token)?.authenticated;
      } catch {
        authed = token === 'authenticated';
      }
      if (authed) router.push('/dashboard');
    } catch {
      // ignore
    }
  }, [router]);

  // Throttle management
  useEffect(() => {
    const update = () => {
      try {
        const raw = localStorage.getItem(THROTTLE_KEY);
        if (!raw) {
          setLoginAttempts(0);
          setIsThrottled(false);
          setError('');
          setLockedUntilText(null);
          return;
        }
        const data: ThrottleData = JSON.parse(raw);
        const now = Date.now();
        if (data.lockedUntil && now < data.lockedUntil) {
          setIsThrottled(true);
          setLoginAttempts(data.attempts ?? MAX_ATTEMPTS);
          const mins = Math.ceil((data.lockedUntil - now) / 60000);
          setLockedUntilText(formatDateUK(data.lockedUntil));
          setError(
            `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`
          );
        } else if (data.lockedUntil && now >= data.lockedUntil) {
          localStorage.removeItem(THROTTLE_KEY);
          setIsThrottled(false);
          setLoginAttempts(0);
          setError('');
          setLockedUntilText(null);
        } else {
          setIsThrottled(false);
          setLoginAttempts(data.attempts ?? 0);
          setLockedUntilText(null);
        }
      } catch {
        localStorage.removeItem(THROTTLE_KEY);
        setIsThrottled(false);
        setLoginAttempts(0);
        setError('');
        setLockedUntilText(null);
      }
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isThrottled) return;
    setLoading(true);
    setError('');

    try {
      const validUsername = process.env.NEXT_PUBLIC_WAGEFLOW_USERNAME || 'admin';
      const validPassword =
        process.env.NEXT_PUBLIC_WAGEFLOW_PASSWORD || 'wageflow2025';

      await new Promise((res) => setTimeout(res, 600));

      if (
        formData.username.trim() === validUsername &&
        formData.password === validPassword
      ) {
        localStorage.removeItem(THROTTLE_KEY);
        const authData = {
          authenticated: true,
          timestamp: Date.now(),
          rememberMe: formData.rememberMe,
        };

        if (formData.rememberMe) {
          localStorage.setItem('wageflow-auth', JSON.stringify(authData));
          sessionStorage.removeItem('wageflow-auth');
        } else {
          sessionStorage.setItem('wageflow-auth', JSON.stringify(authData));
          localStorage.removeItem('wageflow-auth');
        }
        router.push('/dashboard');
      } else {
        const raw = localStorage.getItem(THROTTLE_KEY);
        let data: ThrottleData = { attempts: loginAttempts + 1 };
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ThrottleData;
            data.attempts = (parsed.attempts ?? 0) + 1;
            if (parsed.lockedUntil) data.lockedUntil = parsed.lockedUntil;
          } catch {
            // ignore
          }
        }

        if (data.attempts >= MAX_ATTEMPTS) {
          data.attempts = MAX_ATTEMPTS;
          if (!data.lockedUntil) data.lockedUntil = Date.now() + LOCK_MS;
          setIsThrottled(true);
          setLockedUntilText(formatDateUK(data.lockedUntil));
          setError(
            `Too many failed attempts. Account temporarily locked for ${LOCK_MINUTES} minutes.`
          );
        } else {
          const remaining = MAX_ATTEMPTS - data.attempts;
          setError(
            `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lock.`
          );
        }
        localStorage.setItem(THROTTLE_KEY, JSON.stringify(data));
        setLoginAttempts(data.attempts);
      }
    } catch {
      setError('Login failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '48px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {/* Logo Section - Center Aligned */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <img
            src="/WageFlowLogo.png"
            alt="WageFlow Logo"
            style={{
              height: '80px',
              width: 'auto',
              objectFit: 'contain',
              marginBottom: '16px',
              display: 'block',
            }}
          />
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#2563eb',
              margin: '0 0 8px 0',
            }}
          >
            💼 WageFlow
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#6b7280',
              margin: '0 0 4px 0',
            }}
          >
            UK Payroll Management System
          </p>
          <p
            style={{
              fontSize: '14px',
              color: '#9ca3af',
              margin: '0',
            }}
          >
            {TAX_YEAR} Tax Year Compliant • RTI Submissions • Auto-Enrolment
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={formData.username}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, username: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                backgroundColor: isThrottled ? '#f3f4f6' : 'white',
                boxSizing: 'border-box',
              }}
              placeholder="Enter your username"
              disabled={isThrottled}
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                backgroundColor: isThrottled ? '#f3f4f6' : 'white',
                boxSizing: 'border-box',
              }}
              placeholder="Enter your password"
              disabled={isThrottled}
              autoComplete="current-password"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="rememberMe"
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              <input
                id="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    rememberMe: e.target.checked,
                  }))
                }
                style={{
                  marginRight: '8px',
                  height: '16px',
                  width: '16px',
                }}
                disabled={isThrottled}
              />
              Remember me for 30 days
            </label>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '24px',
                color: '#dc2626',
                fontSize: '14px',
              }}
            >
              {error}
              {lockedUntilText ? (
                <div style={{ marginTop: 6, color: '#991b1b' }}>
                  Locked until: {lockedUntilText}
                </div>
              ) : null}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isThrottled}
            style={{
              width: '100%',
              backgroundColor: loading || isThrottled ? '#9ca3af' : '#2563eb',
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading || isThrottled ? 'not-allowed' : 'pointer',
              boxSizing: 'border-box',
            }}
          >
            {loading
              ? 'Signing In...'
              : isThrottled
              ? 'Account Locked'
              : 'Sign In to WageFlow'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1e40af',
              margin: '0 0 4px 0',
            }}
          >
            Demo access
          </p>
          <p
            style={{
              fontSize: '14px',
              color: '#3730a3',
              margin: '0',
            }}
          >
            Username: <strong>admin</strong>
            <br />
            Password: <strong>wageflow2025</strong>
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              margin: 0,
            }}
          >
            Secure UK Payroll • RTI • GDPR • Tax year {TAX_YEAR} • Today{' '}
            {formatDateUK(new Date())}
          </p>
        </div>
      </div>
    </div>
  );
}
