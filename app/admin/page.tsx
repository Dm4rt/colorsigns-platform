'use client';

import Link from 'next/link';
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

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 w-full max-w-md text-center mb-8">
          <p>This is a protected admin-only page.</p>
          <p className="text-sm mt-2 text-emerald-400">
            If you can see this, your role system works!
          </p>
        </div>

        {/* Admin Navigation Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/admin/orders"
            className="rounded-md bg-emerald-600 px-5 py-2 font-semibold hover:brightness-110"
          >
            Manage Orders
          </Link>
          <Link
            href="/admin/inventory"
            className="rounded-md bg-white/10 px-5 py-2 font-semibold hover:bg-white/20"
          >
            Check Inventory
          </Link>
          <Link
            href="/admin/users"
            className="rounded-md bg-white/10 px-5 py-2 font-semibold hover:bg-white/20"
          >
            Manage Users
          </Link>

          <Link
            href="/admin/settings"
            className="rounded-md bg-white/10 px-5 py-2 font-semibold hover:bg-white/20"
          >
            Settings (future)
          </Link>
        </div>
      </main>
    </AdminRoute>
  );
}
