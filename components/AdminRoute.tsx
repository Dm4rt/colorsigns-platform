'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  // Redirects must run AFTER render → inside useEffect
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userDoc?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, userDoc, loading, router]);

  // While we don't yet know role, block rendering with a spinner
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Only render children for confirmed admins
  if (!user || userDoc?.role !== 'admin') return null;

  return <>{children}</>;
}
