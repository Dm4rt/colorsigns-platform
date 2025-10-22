'use client';

import AdminRoute from '@/components/AdminRoute';
import { useAuth } from '@/components/auth/AuthProvider';

export default function AdminPage() {
  const { user, userDoc } = useAuth();

  return (
    <AdminRoute>
      <main className="flex flex-col items-center justify-center min-h-screen p-6 text-white">
        <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-lg mb-2">
          Welcome back, <span className="font-semibold">{userDoc?.username ?? 'User'}</span>!
        </p>
        <p className="text-sm opacity-80 mb-6">
          Role: <span className="font-mono text-emerald-400">{userDoc?.role ?? 'unknown'}</span>
        </p>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 w-full max-w-md text-center">
          <p>This is a protected admin-only page.</p>
          <p className="text-sm mt-2 text-emerald-400">
            If you can see this, your role system works!
          </p>
        </div>
      </main>
    </AdminRoute>
  );
}
