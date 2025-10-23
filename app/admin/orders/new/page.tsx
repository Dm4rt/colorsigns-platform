'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createOrder } from '@/lib/orders';
import type { OrderItem } from '@/lib/orderTypes';
import AdminRoute from '@/components/AdminRoute';
import { useRouter } from 'next/navigation';
import { uploadOrderImage } from '@/lib/storage';

export default function NewOrderPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [assignedToUid, setAssignedToUid] = useState<string | null>(null); // optional, keep if you added admin list here
  const [assignedToName, setAssignedToName] = useState<string | null>(null); // optional

  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<OrderItem[]>([
    { qty: 1, description: '', material: '', size: '', color: '', printColor: '' },
  ]);

  const [total, setTotal] = useState<number | undefined>(undefined);
  const [deposit, setDeposit] = useState<number | undefined>(undefined);

  // images chosen before submit
  const [images, setImages] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  const balance = useMemo(() => {
    if (typeof total === 'number' && typeof deposit === 'number') {
      return Math.max(total - deposit, 0);
    }
    return undefined;
  }, [total, deposit]);

  const addItem = () =>
    setItems((arr) => [
      ...arr,
      { qty: 1, description: '', material: '', size: '', color: '', printColor: '' },
    ]);

  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const updateItem = (i: number, key: keyof OrderItem, val: any) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

  // --- image helpers ---

  function addImagesFromInput(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    // basic client-side type check
    setImages((prev) => [...prev, ...list.filter((f) => f.type.startsWith('image/'))]);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function resizeToWebP(file: File, maxW = 1600, maxH = 1200, quality = 0.78) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      // @ts-ignore
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

  // --- submit ---

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!customerName.trim()) return; // quick guard

    setCreating(true);
    try {
      const orderId = await createOrder({
        customerName,
        company: company || undefined,
        email: email || undefined,
        phone: phone || undefined,
        items,
        total,
        deposit,
        balance,
        status: 'placed',
        assignedToUid: assignedToUid ?? null,
        assignedToName: assignedToName ?? null,
        notes: notes || undefined,
        createdByUid: user.uid,
      });

      // upload images (resize+compress first)
      for (const f of images) {
        const small = await resizeToWebP(f, 1600, 1200, 0.78);
        await uploadOrderImage(orderId, small, user.uid);
      }

      router.push('/admin/orders');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminRoute>
      <main className="max-w-3xl mx-auto p-6 text-white">
        <h1 className="text-3xl font-bold mb-4">New Order</h1>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* --- Customer --- */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Customer Name*</label>
              <input
                className="w-full rounded-md px-3 py-2 text-black"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Company</label>
              <input
                className="w-full rounded-md px-3 py-2 text-black"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-md px-3 py-2 text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                className="w-full rounded-md px-3 py-2 text-black"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* --- Items --- */}
          <div>
            <label className="block text-sm mb-2">Items</label>
            <div className="space-y-3">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="grid sm:grid-cols-6 gap-2 items-center bg-white/5 p-3 rounded-lg"
                >
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => updateItem(i, 'qty', Number(e.target.value))}
                    className="px-2 py-1 rounded text-black"
                    placeholder="Qty"
                  />
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    className="px-2 py-1 rounded text-black sm:col-span-2"
                    placeholder="Description"
                  />
                  <input
                    value={it.material}
                    onChange={(e) => updateItem(i, 'material', e.target.value)}
                    className="px-2 py-1 rounded text-black"
                    placeholder="Material"
                  />
                  <input
                    value={it.size}
                    onChange={(e) => updateItem(i, 'size', e.target.value)}
                    className="px-2 py-1 rounded text-black"
                    placeholder="Size"
                  />
                  <input
                    value={it.color}
                    onChange={(e) => updateItem(i, 'color', e.target.value)}
                    className="px-2 py-1 rounded text-black"
                    placeholder="Color"
                  />
                  <input
                    value={it.printColor}
                    onChange={(e) => updateItem(i, 'printColor', e.target.value)}
                    className="px-2 py-1 rounded text-black"
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
          </div>

          {/* --- Totals --- */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Total</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md px-3 py-2 text-black"
                value={total ?? ''}
                onChange={(e) =>
                  setTotal(e.target.value === '' ? undefined : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Deposit</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md px-3 py-2 text-black"
                value={deposit ?? ''}
                onChange={(e) =>
                  setDeposit(e.target.value === '' ? undefined : Number(e.target.value))
                }
              />
            </div>
            <div className="self-end">
              <p className="text-sm opacity-80">Balance auto-calculated on save.</p>
            </div>
          </div>

          {/* --- Images (before create) --- */}
          <section>
            <h2 className="text-lg font-semibold mb-2">Images</h2>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => addImagesFromInput(e.target.files)}
                  className="block w-full max-w-xs text-sm"
                />
                <span className="text-xs opacity-70">
                  Images will be resized to ~1600px and saved as WebP on upload.
                </span>
              </div>

              {images.length === 0 ? (
                <div className="opacity-70 text-sm">No images selected.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((f, i) => {
                    const url = URL.createObjectURL(f);
                    return (
                      <div key={i} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={f.name}
                          className="aspect-video object-cover rounded-lg border border-white/10"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 text-xs rounded bg-black/60 px-2 py-0.5 opacity-80 hover:opacity-100"
                        >
                          Remove
                        </button>
                        <div className="mt-1 text-xs truncate opacity-80">{f.name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* --- Notes --- */}
          <div>
            <label className="block text-sm mb-1">Notes</label>
            <textarea
              className="w-full rounded-md px-3 py-2 text-black"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-emerald-600 px-4 py-2 font-semibold hover:brightness-110 disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Order'}
            </button>
            <button
              type="button"
              onClick={() => history.back()}
              className="rounded-md bg-white/10 px-4 py-2 hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </AdminRoute>
  );
}
