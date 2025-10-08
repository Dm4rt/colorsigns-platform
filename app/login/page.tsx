'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInUser } from '../../lib/auth';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already signed in, skip this page
  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace('/profile');
    });
    return () => unsub();
  }, [router]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!form.email.trim() || !form.password.trim()) {
      return setError('Please enter both email and password.');
    }

    setLoading(true);
    const res = await signInUser(form.email.trim(), form.password);
    setLoading(false);

    if (!res.success) {
      setError(res.error ?? 'Login failed. Please try again.');
      return;
    }

    setSuccessMsg('Login successful! Redirecting to profile…');
    setTimeout(() => router.push('/profile'), 800);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-10">
      <h1 className="text-3xl sm:text-4xl font-bold">Sign in to your account</h1>

      <form
        onSubmit={onSubmit}
        className="mt-6 w-full max-w-md rounded-2xl p-6 shadow-lg bg-white/5 backdrop-blur-md border border-white/10"
      >
        <label className="block text-sm font-medium mb-1" htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          className="w-full rounded-lg border px-3 py-2 mb-4 bg-white/90 text-black"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
        <div className="relative mb-4">
          <input
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            value={form.password}
            onChange={onChange}
            className="w-full rounded-lg border px-3 py-2 bg-white/90 text-black pr-12"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm opacity-80 text-gray-800 hover:text-gray-600 transition"
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {successMsg && <p className="text-green-500 text-sm mb-3">{successMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-2 font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed bg-emerald-600 text-white hover:brightness-110 transition"
        >
          {loading ? 'Logging in…' : 'Log In'}
        </button>

        <p className="text-center text-sm mt-5 opacity-90">
          Don&apos;t have an account?{' '}
          <a href="/signup" className="text-emerald-400 font-medium hover:text-emerald-300 transition">
            Sign up here
          </a>
        </p>
      </form>
    </main>
  );
}
