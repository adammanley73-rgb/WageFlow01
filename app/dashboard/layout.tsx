'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('payme-auth') || sessionStorage.getItem('payme-auth');
        if (!token) {
          router.push('/');
          return;
        }
        
        let authed = false;
        try {
          const authData = JSON.parse(token);
          authed = authData.authenticated === true;
        } catch {
          authed = token === 'authenticated';
        }
        
        if (authed) {
          setIsAuthenticated(true);
        } else {
          router.push('/');
        }
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    try {
      // Clear authentication tokens
      localStorage.removeItem('payme-auth');
      sessionStorage.removeItem('payme-auth');
      
      // Optional: Call sign-out API
      await fetch('/api/auth/signout', { method: 'POST' });
      
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect even if API call fails
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
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sign Out Button - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleSignOut}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          🚪 Sign Out
        </button>
      </div>
      
      {children}
    </div>
  );
}