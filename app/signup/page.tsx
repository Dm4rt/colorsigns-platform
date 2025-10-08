'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpUser } from '../../lib/auth';

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // basic client-side checks
    if (!form.username.trim()) return setError('Please enter a username.');
    if (!form.email.trim()) return setError('Please enter an email.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');

    setLoading(true);
    const res = await signUpUser(form.username.trim(), form.email.trim(), form.password);
    setLoading(false);

    if (!res.success) {
      setError(res.error ?? 'Sign up failed. Please try again.');
      return;
    }

    setSuccessMsg('Account created! Redirecting…');
    // optional: redirect after a short pause
    setTimeout(() => router.push('/'), 800);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-10">
      <h1 className="text-3xl sm:text-4xl font-bold">Create your account</h1>

      <form
        onSubmit={onSubmit}
        className="mt-6 w-full max-w-md rounded-2xl p-6 shadow-lg bg-white/5 backdrop-blur-md border border-white/10"
      >
        <label className="block text-sm font-medium mb-1" htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          value={form.username}
          onChange={onChange}
          className="w-full rounded-lg border px-3 py-2 mb-4 bg-white/90 text-black"
          placeholder="e.g. colorwizard"
          autoComplete="username"
        />

        <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          className="w-full rounded-lg border px-3 py-2 mb-4 bg-white/90 text-black"
          placeholder="you@example.com"
          autoComplete="email"
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
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm opacity-80"
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>

        <label className="block text-sm font-medium mb-1" htmlFor="confirm">Confirm password</label>
        <input
          id="confirm"
          name="confirm"
          type={showPw ? 'text' : 'password'}
          value={form.confirm}
          onChange={onChange}
          className="w-full rounded-lg border px-3 py-2 mb-4 bg-white/90 text-black"
          placeholder="••••••••"
          autoComplete="new-password"
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {successMsg && <p className="text-green-500 text-sm mb-3">{successMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-2 font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed bg-emerald-600 text-white hover:brightness-110 transition"
        >
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>
    </main>
  );
}
