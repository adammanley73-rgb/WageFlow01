'use client';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: ReactNode }) {
const router = useRouter();
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [loading, setLoading] = useState(true);

useEffect(() => {
try {
const token =
localStorage.getItem('wageflow-auth') ??
sessionStorage.getItem('wageflow-auth');

  if (!token) {
    router.push('/login');
    return;
  }

  let authed = false;
  try {
    const parsed = JSON.parse(token as string);
    authed = parsed?.authenticated === true;
  } catch {
    authed = token === 'authenticated';
  }

  if (authed) {
    setIsAuthenticated(true);
  } else {
    router.push('/login');
  }
} finally {
  setLoading(false);
}


}, [router]);

const handleSignOut = () => {
try {
localStorage.removeItem('wageflow-auth');
sessionStorage.removeItem('wageflow-auth');
} finally {
router.push('/');
}
};

if (loading) {
return (
<div className="min-h-screen bg-slate-50 flex items-center justify-center">
<div className="bg-white p-8 rounded-xl shadow-lg text-center">
<h1 className="text-xl font-semibold text-gray-800">Authenticating...</h1>
</div>
</div>
);
}

if (!isAuthenticated) {
return null;
}

return (
<div className="min-h-screen bg-slate-50">
<div className="absolute top-4 right-4 z-50">
<button onClick={handleSignOut} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" >
🚪 Sign Out
</button>
</div>
{children}
</div>
);
}
