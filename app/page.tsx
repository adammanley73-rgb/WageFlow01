'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const THROTTLE_KEY = 'payme-login-throttle';
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const LOCK_MS = LOCK_MINUTES * 60 * 1000;

type ThrottleData = {
  attempts: number;
  lockedUntil?: number; // epoch ms
};

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isThrottled, setIsThrottled] = useState(false);

  // Redirect if already authenticated (supports JSON token and legacy string)
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
    } catch {
      /* ignore */
    }
  }, [router]);

  // Throttle loader + live countdown
  useEffect(() => {
    const loadThrottle = () => {
      try {
        const raw = localStorage.getItem(THROTTLE_KEY);
        if (!raw) {
          setLoginAttempts(0);
          setIsThrottled(false);
          return;
        }
        const data: ThrottleData = JSON.parse(raw);
        const now = Date.now();

        if (data.lockedUntil && now < data.lockedUntil) {
          setIsThrottled(true);
          setLoginAttempts(data.attempts ?? MAX_ATTEMPTS);
          const remaining = Math.max(0, data.lockedUntil - now);
          const mins = Math.ceil(remaining / 60000);
          setError(`Too many failed attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
        } else if (data.lockedUntil && now >= data.lockedUntil) {
          localStorage.removeItem(THROTTLE_KEY);
          setIsThrottled(false);
          setLoginAttempts(0);
          setError('');
        } else {
          setLoginAttempts(data.attempts ?? 0);
          setIsThrottled(false);
        }
      } catch {
        // Corrupt throttle data
        localStorage.removeItem(THROTTLE_KEY);
        setIsThrottled(false);
        setLoginAttempts(0);
        setError('');
      }
    };

    loadThrottle();
    // Update remaining time every 30s while throttled
    const id = setInterval(loadThrottle, 30000);
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

      // Simulate network delay for UX parity
      await new Promise(res => setTimeout(res, 800));

      if (formData.username.trim() === validUsername && formData.password === validPassword) {
        // Clear throttle on success
        localStorage.removeItem(THROTTLE_KEY);

        const authData = {
          authenticated: true,
          timestamp: Date.now(),
          rememberMe: formData.rememberMe,
        };

        if (formData.rememberMe) {
          localStorage.setItem('payme-auth', JSON.stringify(authData));
          sessionStorage.removeItem('payme-auth');
        } else {
          sessionStorage.setItem('payme-auth', JSON.stringify(authData));
          localStorage.removeItem('payme-auth');
        }

        router.push('/dashboard');
      } else {
        // Failed attempt
        const raw = localStorage.getItem(THROTTLE_KEY);
        let data: ThrottleData = { attempts: loginAttempts + 1 };

        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ThrottleData;
            data.attempts = (parsed.attempts ?? 0) + 1;
            // preserve existing lockedUntil if present
            if (parsed.lockedUntil) data.lockedUntil = parsed.lockedUntil;
          } catch {
            // ignore, fall back to new data
          }
        }

        if (data.attempts >= MAX_ATTEMPTS) {
          // Set lock window once when threshold reached
          data.attempts = MAX_ATTEMPTS;
          if (!data.lockedUntil) data.lockedUntil = Date.now() + LOCK_MS;
          setIsThrottled(true);
          setError(`Too many failed attempts. Account temporarily locked for ${LOCK_MINUTES} minutes.`);
        } else {
          const remaining = MAX_ATTEMPTS - data.attempts;
          setError(`Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before account lock.`);
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
    <div className="font-sans bg-slate-50 min-h-screen flex items-center justify-center p-10">
      <div className="bg-white p-12 rounded-2xl shadow-xl border border-gray-200 w-full max-w-md">
        {/* PAY-ME Logo - Centered Above Login */}
        <div className="text-center mb-10">
          <img
            src="/NEWPAYMELOGO.PNG"
            alt="PAY-ME Logo"
            className="mx-auto mb-4 h-20 w-auto object-contain"
          />
          <div className="text-2xl font-bold text-gray-800 mb-2">
            UK Payroll Management System
          </div>
          <p className="text-sm text-gray-500">
            2025/26 Tax Year Compliant • RTI Submissions • Auto-Enrollment
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors disabled:bg-gray-100"
              placeholder="Enter your username"
              disabled={isThrottled}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors disabled:bg-gray-100"
              placeholder="Enter your password"
              disabled={isThrottled}
              autoComplete="current-password"
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <label className="flex items-center text-sm text-gray-600 cursor-pointer" htmlFor="rememberMe">
              <input
                id="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isThrottled}
              />
              Remember me for 30 days
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isThrottled}
            className={`w-full py-4 px-4 rounded-lg text-base font-semibold transition-colors ${
              loading || isThrottled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            } text-white`}
          >
            {loading ? 'Signing In...' : isThrottled ? 'Account Locked' : 'Sign In to PAY-ME'}
          </button>
        </form>

        {/* Demo Access Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-1">Demo Access:</p>
          <p className="text-sm text-blue-700">
            Username: <strong>admin</strong>
            <br />
            Password: <strong>payme2025</strong>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure UK Payroll Management • RTI Compliant • GDPR Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
