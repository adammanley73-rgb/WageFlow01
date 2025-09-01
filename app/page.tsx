'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const THROTTLE_KEY = 'payme-login-throttle';
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const LOCK_MS = LOCK_MINUTES * 60 * 1000;

type ThrottleData = {
  attempts: number;
  lockedUntil?: number;
};

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isThrottled, setIsThrottled] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    try {
      const token = localStorage.getItem('payme-auth') || sessionStorage.getItem('payme-auth');
      if (!token) return;
      let authed = false;
      try {
        authed = !!JSON.parse(token)?.authenticated;
      } catch {
        authed = token === 'authenticated';
      }
      if (authed) router.push('/dashboard');
    } catch {}
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
          return;
        }
        const data: ThrottleData = JSON.parse(raw);
        const now = Date.now();
        if (data.lockedUntil && now < data.lockedUntil) {
          setIsThrottled(true);
          setLoginAttempts(data.attempts ?? MAX_ATTEMPTS);
          const mins = Math.ceil((data.lockedUntil - now) / 60000);
          setError(`Too many failed attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
        } else if (data.lockedUntil && now >= data.lockedUntil) {
          localStorage.removeItem(THROTTLE_KEY);
          setIsThrottled(false);
          setLoginAttempts(0);
          setError('');
        } else {
          setIsThrottled(false);
          setLoginAttempts(data.attempts ?? 0);
        }
      } catch {
        localStorage.removeItem(THROTTLE_KEY);
        setIsThrottled(false);
        setLoginAttempts(0);
        setError('');
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
      const validUsername = process.env.NEXT_PUBLIC_PAYME_USERNAME || 'admin';
      const validPassword = process.env.NEXT_PUBLIC_PAYME_PASSWORD || 'payme2025';

      await new Promise(res => setTimeout(res, 600));

      if (formData.username.trim() === validUsername && formData.password === validPassword) {
        localStorage.removeItem(THROTTLE_KEY);
        const authData = { authenticated: true, timestamp: Date.now(), rememberMe: formData.rememberMe };
        if (formData.rememberMe) {
          localStorage.setItem('payme-auth', JSON.stringify(authData));
          sessionStorage.removeItem('payme-auth');
        } else {
          sessionStorage.setItem('payme-auth', JSON.stringify(authData));
          localStorage.removeItem('payme-auth');
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
          } catch {}
        }
        if (data.attempts >= MAX_ATTEMPTS) {
          data.attempts = MAX_ATTEMPTS;
          if (!data.lockedUntil) data.lockedUntil = Date.now() + LOCK_MS;
          setIsThrottled(true);
          setError(`Too many failed attempts. Account temporarily locked for ${LOCK_MINUTES} minutes.`);
        } else {
          const remaining = MAX_ATTEMPTS - data.attempts;
          setError(`Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lock.`);
        }
        localStorage.setItem(THROTTLE_KEY, JSON.stringify(data));
        setLoginAttempts(data.attempts);
      }
    } catch {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style=
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px'
    >
      <div style=
        backgroundColor: 'white',
        padding: '48px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        width: '100%',
        maxWidth: '500px',
        textAlign: 'center' as const
      >
        
        {/* Logo Section */}
        <div style= marginBottom: '40px' >
          <img 
            src="/NEWPAYMELOGO.PNG" 
            alt="PAY-ME Logo"
            style=
              height: '80px',
              width: 'auto',
              margin: '0 auto 16px auto',
              display: 'block'
            
          />
          <h1 style=
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#2563eb',
            margin: '0 0 8px 0'
          >
            💼 PAY-ME
          </h1>
          <p style=
            fontSize: '18px',
            color: '#6b7280',
            margin: '0 0 4px 0'
          >
            UK Payroll Management System
          </p>
          <p style=
            fontSize: '14px',
            color: '#9ca3af',
            margin: '0'
          >
            2025/26 Tax Year Compliant • RTI Submissions • Auto-Enrollment
          </p>
        </div>

        {/* Login Form */}
        <div style= textAlign: 'left' as const >
          <form onSubmit={handleSubmit}>
            <div style= marginBottom: '24px' >
              <label style=
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                style=
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: isThrottled ? '#f3f4f6' : 'white'
                
                placeholder="Enter your username"
                disabled={isThrottled}
                autoComplete="username"
              />
            </div>

            <div style= marginBottom: '24px' >
              <label style=
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                style=
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: isThrottled ? '#f3f4f6' : 'white'
                
                placeholder="Enter your password"
                disabled={isThrottled}
                autoComplete="current-password"
              />
            </div>

            <div style= marginBottom: '24px' >
              <label style=
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                color: '#374151',
                cursor: 'pointer'
              >
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                  style=
                    marginRight: '8px',
                    width: '16px',
                    height: '16px'
                  
                  disabled={isThrottled}
                />
                Remember me for 30 days
              </label>
            </div>

            {error && (
              <div style=
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '24px',
                color: '#dc2626',
                fontSize: '14px'
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isThrottled}
              style=
                width: '100%',
                backgroundColor: loading || isThrottled ? '#9ca3af' : '#2563eb',
                color: 'white',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || isThrottled ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              
            >
              {loading ? 'Signing In...' : isThrottled ? 'Account Locked' : 'Sign In to PAY-ME'}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div style=
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#eff6ff',
          border: '1px solid #dbeafe',
          borderRadius: '8px'
        >
          <p style=
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e40af',
            margin: '0 0 8px 0'
          >
            Demo Access:
          </p>
          <p style=
            fontSize: '14px',
            color: '#1e40af',
            margin: '0'
          >
            Username: <strong>admin</strong><br/>
            Password: <strong>payme2025</strong>
          </p>
        </div>

        {/* Footer */}
        <div style= marginTop: '24px' >
          <p style=
            fontSize: '12px',
            color: '#6b7280',
            margin: '0'
          >
            Secure UK Payroll Management • RTI Compliant • GDPR Compliant
          </p>
        </div>
      </div>
    </div>
  );
}