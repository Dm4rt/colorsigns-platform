'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminRoute from '@/components/AdminRoute';
import { useAuth } from '@/components/auth/AuthProvider';
import { app } from '@/lib/firebase';
import {
  getFirestore,
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

type Role = 'admin' | 'user';
type UserRow = {
  id: string;           // uid
  username?: string;
  email?: string;
  photoURL?: string | null;
  role?: Role;
  createdAt?: any;      // Firestore Timestamp
};

/** UI helpers */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-white/10 text-white">
      {children}
    </span>
  );
}

export default function ManageUsersPage() {
  return (
    <AdminRoute>
      <UsersInner />
    </AdminRoute>
  );
}

function UsersInner() {
  const db = useMemo(() => getFirestore(app), []);
  const functions = useMemo(() => getFunctions(app, 'us-central1'), []);
  const { user: me } = useAuth();

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Role>('all');
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);

  // subscribe to all users
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: UserRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setRows(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [db]);

  const visible = rows.filter((r) => {
    if (filter !== 'all' && r.role !== filter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.username ?? '').toLowerCase().includes(s) ||
      (r.email ?? '').toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s)
    );
  });

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  /** ----- Firestore role & profile actions ----- */
  async function setRole(uid: string, next: Role) {
    const ref = doc(db, 'users', uid);
    const prev = rows.find((r) => r.id === uid)?.role;
    // optimistic
    setRows((rs) => rs.map((r) => (r.id === uid ? { ...r, role: next } : r)));
    try {
      await updateDoc(ref, { role: next });
      notify(`Updated role → ${next}`);
    } catch (e) {
      // rollback
      setRows((rs) => rs.map((r) => (r.id === uid ? { ...r, role: prev } : r)));
      notify('Failed to update role.');
    }
  }

  async function deleteProfile(uid: string) {
    if (!confirm(`Delete Firestore profile for ${uid}? (Auth user not affected)`)) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      notify('Profile document deleted.');
    } catch {
      notify('Failed to delete profile.');
    }
  }

  /** ----- Callable functions (adminSetDisabled / adminDeleteUser / adminCreateUser) ----- */
  async function adminDisableAuth(uid: string, disabled: boolean) {
    try {
      const call = httpsCallable(functions, 'adminSetDisabled');
      await call({ uid, disabled });
      notify(`${disabled ? 'Disabled' : 'Enabled'} account.`);
    } catch (e: any) {
      notify(e?.message ?? 'Failed to toggle account.');
    }
  }

  async function adminDeleteAuth(uid: string) {
    if (!confirm(`Permanently delete AUTH user ${uid}? This cannot be undone.`)) return;
    try {
      const call = httpsCallable(functions, 'adminDeleteUser');
      await call({ uid });
      notify('Auth user deleted.');
    } catch (e: any) {
      notify(e?.message ?? 'Failed to delete Auth user.');
    }
  }

  return (
    <main className="min-h-screen p-6 sm:p-10 bg-emerald-900/40">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Users</h1>
          <p className="text-emerald-100">View users, change roles, disable/delete accounts.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2"
        >
          + Create user
        </button>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl px-3 py-2 bg-white text-black w-full sm:w-80"
          placeholder="Search username / email / uid"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="rounded-xl px-3 py-2 bg-white text-black w-full sm:w-40"
        >
          <option value="all">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </select>
        {toast && <span className="text-emerald-200 self-center">{toast}</span>}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <table className="w-full text-left">
          <thead>
            <tr className="text-emerald-100/90">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">UID</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="text-emerald-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8">Loading…</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8">No users found.</td>
              </tr>
            ) : (
              visible.map((u) => (
                <tr key={u.id} className="border-t border-white/10">
                  <td className="px-4 py-3 flex items-center gap-3">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-white/20" />
                    )}
                    <div>
                      <div className="font-semibold">{u.username ?? '—'}</div>
                      <div className="text-xs opacity-75">
                        {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleString() : '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{u.email ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{u.id}</td>
                  <td className="px-4 py-3">
                    <Badge>{u.role ?? 'user'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {u.role !== 'admin' ? (
                        <button
                          onClick={() => setRole(u.id, 'admin')}
                          className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20"
                        >
                          Make admin
                        </button>
                      ) : (
                        <button
                          onClick={() => setRole(u.id, 'user')}
                          className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20"
                        >
                          Make user
                        </button>
                      )}

                      <button
                        onClick={() => deleteProfile(u.id)}
                        className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20"
                      >
                        Delete profile
                      </button>

                      {/* Auth controls via Cloud Functions */}
                      <button
                        onClick={() => adminDisableAuth(u.id, true)}
                        className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20"
                      >
                        Disable
                      </button>
                      <button
                        onClick={() => adminDisableAuth(u.id, false)}
                        className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20"
                      >
                        Enable
                      </button>
                      <button
                        onClick={() => adminDeleteAuth(u.id)}
                        className="px-3 py-1 rounded-xl bg-red-600/80 hover:bg-red-600 text-white"
                      >
                        Delete Auth
                      </button>

                      {me?.uid === u.id && (
                        <span className="text-xs opacity-70">(that’s you)</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onToast={notify}
          functions={functions}
        />
      )}
    </main>
  );
}

/** ---------------- Create User Modal (adminCreateUser callable) ---------------- */

function CreateUserModal({
  onClose,
  onToast,
  functions,
}: {
  onClose: () => void;
  onToast: (m: string) => void;
  functions: ReturnType<typeof getFunctions>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!email || !password) {
      onToast('Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      const call = httpsCallable(functions, 'adminCreateUser');
      // {email, password, username, role}
      await call({ email, password, username, role });
      onToast('User created.');
      onClose();
    } catch (e: any) {
      // If the callable isn't deployed, Functions returns 404
      const msg =
        e?.message?.includes('NOT_FOUND') || e?.code === 'functions/not-found'
          ? 'adminCreateUser function not deployed yet.'
          : e?.message ?? 'Failed to create user.';
      onToast(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl text-gray-900">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Create new user</h2>
        <div className="flex flex-col gap-3 text-gray-900">
          <input
            className="border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <input
            className="border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
          <input
            className="border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Username (optional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="rounded-xl px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={busy}
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-3">
          Tip: if you haven’t deployed <code>adminCreateUser</code> yet, this will say it’s not
          found. See below for the function to add.
        </p>
      </div>

    </div>
  );
}
