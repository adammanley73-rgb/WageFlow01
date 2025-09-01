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
    <div style=1176>
      <div style=1177>
        
        {/* Logo Section */}
        <div style=1178>
          <img 
            src="/NEWPAYMELOGO.PNG" 
            alt="PAY-ME Logo"
            style=1179
          />
          <h1 style=1180>
            💼 PAY-ME
          </h1>
          <p style=1181>
            UK Payroll Management System
          </p>
          <p style=1182>
            2025/26 Tax Year Compliant • RTI Submissions • Auto-Enrollment
          </p>
        </div>

        {/* Login Form */}
        <div style=1183>
          <form onSubmit={handleSubmit}>
            <div style= marginBottom: '40px' >
              <label style=1184>
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                style=1185
                placeholder="Enter your username"
                disabled={isThrottled}
                autoComplete="username"
              />
            </div>

            <div style= marginBottom: '40px' >
              <label style=1184>
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                style=1185
                placeholder="Enter your password"
                disabled={isThrottled}
                autoComplete="current-password"
              />
            </div>

            <div style=1186>
              <label style=1187>
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                  style=1188
                  disabled={isThrottled}
                />
                Remember me for 30 days
              </label>
            </div>

            {error && (
              <div style=1189>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isThrottled}
              style=1190
            >
              {loading ? 'Signing In...' : isThrottled ? 'Account Locked' : 'Sign In to PAY-ME'}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div style=1191>
          <p style=1192>
            Demo Access:
          </p>
          <p style=1193>
            Username: <strong>admin</strong><br/>
            Password: <strong>payme2025</strong>
          </p>
        </div>

        {/* Footer */}
        <div style=1194>
          <p style=1195>
            Secure UK Payroll Management • RTI Compliant • GDPR Compliant
          </p>
        </div>
      </div>
    </div>
  );
}