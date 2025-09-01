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

  // redirect if already authed (supports legacy string token)
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

  // throttle loader + refresh remaining time
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Logo above card */}
        <div className="text-center mb-6">
          <img
            src="/NEWPAYMELOGO.PNG"
            alt="PAY-ME Logo"
            className="mx-auto h-20 w-20 rounded-2xl object-contain"
          />
        </div>

        <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-8">
          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">UK Payroll Management System</h1>
            <p className="mt-1 text-sm text-gray-500">
              2025/26 Tax Year Compliant • RTI Submissions • Auto-Enrollment
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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

            <div className="flex items-center">
              <label htmlFor="rememberMe" className="flex items-center text-sm text-gray-700 cursor-pointer">
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
              className={`w-full py-3.5 rounded-lg text-base font-semibold text-white transition-colors ${
                loading || isThrottled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Signing In...' : isThrottled ? 'Account Locked' : 'Sign In to PAY-ME'}
            </button>
          </form>

          {/* Demo Access */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">Demo Access:</p>
            <p className="text-sm text-blue-800">
              Username: <strong>admin</strong>
              <br />
              Password: <strong>payme2025</strong>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-500">
            Secure UK Payroll Management • RTI Compliant • GDPR Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
