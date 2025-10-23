'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminRoute from '@/components/AdminRoute';
import { getOrder, advanceStatus, updateOrder } from '@/lib/orders';
import type { Order, OrderItem, OrderStatus } from '@/lib/orderTypes';
import { ORDER_FLOW } from '@/lib/orderTypes';
import { uploadOrderImage } from '@/lib/storage';
import { useAuth } from '@/components/auth/AuthProvider';

// Admin lookup (from /users where role == 'admin') + files subscription
import { app } from '@/lib/firebase';
import {
  getFirestore,
  collection,
  query as fbQuery,
  where,
  getDocs,
  Timestamp,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';

function nextStatus(current: Order['status']) {
  const i = ORDER_FLOW.indexOf(current);
  if (i === -1 || i === ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[i + 1];
}

type OrderFile = {
  id: string;
  name: string;
  url: string;
  size?: number;
  path?: string;
  uploadedByUid?: string;
  createdAt?: any;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // admins to assign to
  const [admins, setAdmins] = useState<{ uid: string; username: string }[]>([]);

  // order files (images)
  const [files, setFiles] = useState<OrderFile[]>([]);

  // form state (only used in editing mode)
  const [form, setForm] = useState<{
    customerName: string;
    company?: string;
    email?: string;
    phone?: string;
    items: OrderItem[];
    total?: number;
    deposit?: number;
    notes?: string;
    status: OrderStatus;
    assignedToUid: string | null;
    assignedToName: string | null;
  } | null>(null);

  // Load order
  useEffect(() => {
    (async () => {
      const o = await getOrder(id);
      setOrder(o);
      setLoading(false);
    })();
  }, [id]);

  // Load admins (users.role == 'admin')
  useEffect(() => {
    (async () => {
      const db = getFirestore(app);
      const qAdmins = fbQuery(collection(db, 'users'), where('role', '==', 'admin'));
      const snap = await getDocs(qAdmins);
      setAdmins(
        snap.docs.map((d) => ({
          uid: d.id,
          username: (d.data().username as string) || 'Admin',
        }))
      );
    })();
  }, []);

  // Live subscribe to files subcollection for this order
  useEffect(() => {
    const db = getFirestore(app);
    const colRef = collection(db, 'orders', id, 'files');
    const q = fbQuery(colRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setFiles(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderFile[]
      );
    });
    return () => unsub();
  }, [id]);

  // compute payment view
  const total = order?.total ?? 0;
  const deposit = order?.deposit ?? 0;
  const balance = Math.max(total - deposit, 0);
  const paymentLabel = useMemo(() => {
    if (total <= 0) return '—';
    if (balance === 0) return 'Paid';
    if (deposit > 0 && deposit < total) return 'Partial';
    return 'Unpaid';
  }, [total, balance, deposit]);

  const startEdit = () => {
    if (!order) return;
    setForm({
      customerName: order.customerName,
      company: order.company,
      email: order.email,
      phone: order.phone,
      items: order.items ?? [],
      total: order.total,
      deposit: order.deposit,
      notes: order.notes,
      status: order.status,
      assignedToUid: order.assignedToUid ?? null,
      assignedToName: order.assignedToName ?? null,
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
  };

  const onAdvance = async () => {
    if (!order) return;
    const to = nextStatus(order.status);
    if (!to) return;
    setSaving(true);
    await advanceStatus(order.id, to);
    setOrder({ ...order, status: to });
    setSaving(false);
  };

  const updateField = (key: keyof NonNullable<typeof form>, value: any) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const updateItem = (i: number, key: keyof OrderItem, value: any) =>
    setForm((f) =>
      f
        ? { ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)) }
        : f
    );

  const addItem = () =>
    setForm((f) => (f ? { ...f, items: [...f.items, { qty: 1, description: '' }] } : f));

  const removeItem = (i: number) =>
    setForm((f) => (f ? { ...f, items: f.items.filter((_, idx) => idx !== i) } : f));

  const save = async () => {
    if (!order || !form) return;
    setSaving(true);

    // If assignment changed, stamp assignedAt
    const assignmentChanged =
      (order.assignedToUid ?? null) !== (form.assignedToUid ?? null);

    await updateOrder(order.id, {
      customerName: form.customerName,
      company: form.company || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      items: form.items,
      total: form.total,
      deposit: form.deposit,
      notes: form.notes || undefined,
      status: form.status,
      assignedToUid: form.assignedToUid ?? null,
      assignedToName: form.assignedToName ?? null,
      assignedAt: assignmentChanged
        ? (Timestamp.now() as any)
        : ((order as any).assignedAt ?? null),
    });

    // reflect locally
    setOrder({
      ...order,
      customerName: form.customerName,
      company: form.company || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      items: form.items,
      total: form.total,
      deposit: form.deposit,
      notes: form.notes || undefined,
      status: form.status,
      assignedToUid: form.assignedToUid ?? null,
      assignedToName: form.assignedToName ?? null,
      assignedAt: assignmentChanged
        ? (Timestamp.now() as any)
        : ((order as any).assignedAt ?? null),
    });

    setSaving(false);
    setEditing(false);
  };

  // ---- Images panel helpers ----

  // Resize + compress to WebP ~1600px max dimension
  async function resizeToWebP(file: File, maxW = 1600, maxH = 1600, quality = 0.78) {
    // createImageBitmap is fast and memory-friendly; fallback to HTMLImageElement if needed
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      // fallback
      const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      // @ts-ignore - cast HTMLElement to bitmap-like for drawing
      bitmap = imgEl as any;
    }

    const { width, height } = bitmap;
    const scale = Math.min(maxW / width, maxH / height, 1);
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap as any, 0, 0, w, h);

    const type = 'image/webp';
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), type, quality));
    const nameBase = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${nameBase}.webp`, { type, lastModified: Date.now() });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !order || !user) return;
    setSaving(true);
    try {
      const small = await resizeToWebP(f, 1600, 1200, 0.78);
      await uploadOrderImage(order.id, small, user.uid);
      // files list will auto-refresh via onSnapshot
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      e.currentTarget.value = '';
    }
  }

  return (
    <AdminRoute>
      <main className="max-w-5xl mx-auto p-6 text-white">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Order Details</h1>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <button
                  onClick={startEdit}
                  className="rounded-md bg-white/10 px-4 py-2 hover:bg-white/20"
                >
                  Edit
                </button>
                <button
                  onClick={() => router.back()}
                  className="rounded-md bg-white/10 px-4 py-2 hover:bg-white/20"
                >
                  ← Back
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-md bg-emerald-600 px-4 py-2 font-semibold hover:brightness-110 disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-md bg-white/10 px-4 py-2 hover:bg-white/20"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {loading || !order ? (
          <div className="flex h-40 items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : !editing ? (
          <>
            {/* SUMMARY (read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm opacity-80">Order ID</div>
                <div className="font-mono break-all">{order.id}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm opacity-80">Workflow Status</div>
                <div className="font-semibold capitalize">
                  {order.status.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm opacity-80">Assigned To</div>
                <div className="font-semibold">
                  {order.assignedToName || '— Unassigned —'}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm opacity-80">Payment</div>
                <div
                  className={`font-semibold ${
                    balance === 0
                      ? 'text-emerald-400'
                      : deposit > 0
                      ? 'text-yellow-300'
                      : 'text-red-300'
                  }`}
                >
                  {paymentLabel}
                </div>
              </div>
            </div>

            {/* Customer */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Customer</h2>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 grid sm:grid-cols-2 gap-3">
                <div><span className="opacity-80 text-sm">Name</span><div>{order.customerName}</div></div>
                <div><span className="opacity-80 text-sm">Company</span><div>{order.company || '-'}</div></div>
                <div><span className="opacity-80 text-sm">Email</span><div>{order.email || '-'}</div></div>
                <div><span className="opacity-80 text-sm">Phone</span><div>{order.phone || '-'}</div></div>
              </div>
            </section>

            {/* Totals */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Totals</h2>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 grid sm:grid-cols-3 gap-3">
                <div><span className="opacity-80 text-sm">Total</span><div>{total ? `$${total.toFixed(2)}` : '-'}</div></div>
                <div><span className="opacity-80 text-sm">Deposit</span><div>{deposit ? `$${deposit.toFixed(2)}` : '-'}</div></div>
                <div><span className="opacity-80 text-sm">Remaining</span><div>{`$${balance.toFixed(2)}`}</div></div>
              </div>
            </section>

            {/* Items */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Items ({order.items?.length ?? 0})</h2>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2">Material</th>
                      <th className="px-4 py-2">Size</th>
                      <th className="px-4 py-2">Color</th>
                      <th className="px-4 py-2">Print Color</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map((it, i) => (
                      <tr key={i} className="border-t border-white/10">
                        <td className="px-4 py-2">{it.qty}</td>
                        <td className="px-4 py-2">{it.description}</td>
                        <td className="px-4 py-2">{it.material || '-'}</td>
                        <td className="px-4 py-2">{it.size || '-'}</td>
                        <td className="px-4 py-2">{it.color || '-'}</td>
                        <td className="px-4 py-2">{it.printColor || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Images (read-only view also shows) */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Images</h2>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                {files.length === 0 ? (
                  <div className="opacity-70 text-sm">No images yet.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {files.map((f) => (
                      <a
                        key={f.id}
                        href={f.url}
                        target="_blank"
                        className="block group"
                        rel="noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.url}
                          alt={f.name}
                          className="aspect-video object-cover rounded-lg border border-white/10 group-hover:opacity-90"
                        />
                        <div className="mt-1 text-xs truncate opacity-80">{f.name}</div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Notes */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-3">Notes</h2>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 min-h-[80px]">
                {order.notes || <span className="opacity-60">—</span>}
              </div>
            </section>

            <div className="flex gap-3">
              {nextStatus(order.status) && (
                <button
                  onClick={onAdvance}
                  disabled={saving}
                  className="rounded-md bg-emerald-600 px-4 py-2 font-semibold hover:brightness-110 disabled:opacity-60"
                >
                  Advance → {nextStatus(order.status)?.replace(/_/g, ' ')}
                </button>
              )}
            </div>
          </>
        ) : (
          // EDIT MODE
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm opacity-80">Order ID</div>
                <div className="font-mono break-all">{order.id}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm opacity-80">Workflow Status</div>
                <select
                  value={form!.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="mt-1 w-full rounded-md bg-white/90 text-black px-2 py-1"
                >
                  {ORDER_FLOW.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment control */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm opacity-80">Assigned Admin</div>
                <select
                  value={form!.assignedToUid ?? ''}
                  onChange={(e) => {
                    const uid = e.target.value || null;
                    const name = admins.find((a) => a.uid === uid)?.username ?? null;
                    updateField('assignedToUid', uid);
                    updateField('assignedToName', name);
                  }}
                  className="mt-1 w-full rounded-md bg-white/90 text-black px-2 py-1"
                >
                  <option value="">— Unassigned —</option>
                  {admins.map((a) => (
                    <option key={a.uid} value={a.uid}>
                      {a.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm opacity-80">Payment</div>
                <div className="opacity-80 text-sm">(auto from Total & Deposit)</div>
              </div>
            </div>

            {/* Customer */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Customer</h2>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm opacity-80">Name</label>
                  <input
                    className="w-full rounded-md bg-white/90 text-black px-3 py-2"
                    value={form!.customerName}
                    onChange={(e) => updateField('customerName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm opacity-80">Company</label>
                  <input
                    className="w-full rounded-md bg-white/90 text-black px-3 py-2"
                    value={form!.company ?? ''}
                    onChange={(e) => updateField('company', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm opacity-80">Email</label>
                  <input
                    className="w-full rounded-md bg-white/90 text-black px-3 py-2"
                    value={form!.email ?? ''}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm opacity-80">Phone</label>
                  <input
                    className="w-full rounded-md bg-white/90 text-black px-3 py-2"
                    value={form!.phone ?? ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Totals */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Totals</h2>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm opacity-80">Total</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-md bg-white/90 text-black px-3 py-2"
                    value={form!.total ?? ''}
                    onChange={(e) =>
                      updateField(
                        'total',
                        e.target.value === '' ? undefined : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm opacity-80">Deposit</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-md bg-white/90 text-black px-3 py-2"
                    value={form!.deposit ?? ''}
                    onChange={(e) =>
                      updateField(
                        'deposit',
                        e.target.value === '' ? undefined : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm opacity-80">Remaining</label>
                  <div className="mt-2">
                    {(() => {
                      const t = form!.total ?? 0;
                      const d = form!.deposit ?? 0;
                      const b = Math.max(t - d, 0);
                      return `$${b.toFixed(2)}`;
                    })()}
                  </div>
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Items ({form!.items.length})</h2>
              <div className="space-y-3">
                {form!.items.map((it, i) => (
                  <div
                    key={i}
                    className="grid sm:grid-cols-6 gap-2 items-center bg-white/5 p-3 rounded-lg"
                  >
                    <input
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) => updateItem(i, 'qty', Number(e.target.value))}
                      className="px-2 py-1 rounded text-black bg-white/90"
                      placeholder="Qty"
                    />
                    <input
                      value={it.description}
                      onChange={(e) => updateItem(i, 'description', e.target.value)}
                      className="px-2 py-1 rounded text-black bg-white/90 sm:col-span-2"
                      placeholder="Description"
                    />
                    <input
                      value={it.material ?? ''}
                      onChange={(e) => updateItem(i, 'material', e.target.value)}
                      className="px-2 py-1 rounded text-black bg-white/90"
                      placeholder="Material"
                    />
                    <input
                      value={it.size ?? ''}
                      onChange={(e) => updateItem(i, 'size', e.target.value)}
                      className="px-2 py-1 rounded text-black bg-white/90"
                      placeholder="Size"
                    />
                    <input
                      value={it.color ?? ''}
                      onChange={(e) => updateItem(i, 'color', e.target.value)}
                      className="px-2 py-1 rounded text-black bg-white/90"
                      placeholder="Color"
                    />
                    <input
                      value={it.printColor ?? ''}
                      onChange={(e) => updateItem(i, 'printColor', e.target.value)}
                      className="px-2 py-1 rounded text-black bg-white/90"
                      placeholder="Print Color"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="sm:col-span-6 justify-self-end text-sm opacity-80 hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-3 rounded-md bg-white/10 px-3 py-1 hover:bg-white/20"
              >
                + Add Item
              </button>
            </section>

            {/* Images (edit mode includes uploader) */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Images</h2>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full max-w-xs text-sm"
                  />
                  <span className="text-xs opacity-70">
                    Uploads are resized to ~1600px and saved as WebP to reduce costs.
                  </span>
                </div>

                {files.length === 0 ? (
                  <div className="opacity-70 text-sm">No images yet.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {files.map((f) => (
                      <a
                        key={f.id}
                        href={f.url}
                        target="_blank"
                        className="block group"
                        rel="noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.url}
                          alt={f.name}
                          className="aspect-video object-cover rounded-lg border border-white/10 group-hover:opacity-90"
                        />
                        <div className="mt-1 text-xs truncate opacity-80">{f.name}</div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Notes */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-3">Notes</h2>
              <textarea
                className="w-full rounded-md bg-white/90 text-black px-3 py-2 min-h-[100px]"
                value={form!.notes ?? ''}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </section>
          </>
        )}
      </main>
    </AdminRoute>
  );
}
