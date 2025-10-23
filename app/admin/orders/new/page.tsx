'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminRoute from '@/components/AdminRoute';
import { useAuth } from '@/components/auth/AuthProvider';
import { createOrder } from '@/lib/orders';
import type { OrderItem } from '@/lib/orderTypes';
import { uploadOrderImage } from '@/lib/storage';

type LocalImg = { file: File; url: string };

export default function NewOrderPage() {
  const { user } = useAuth();
  const router = useRouter();

  // ---- base form ----
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

  const balance = useMemo(() => {
    if (typeof total === 'number' && typeof deposit === 'number') {
      return Math.max(total - deposit, 0);
    }
    return undefined;
  }, [total, deposit]);

  // ---- images (only tiny thumbs) ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<LocalImg[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  // items helpers
  const addItem = () =>
    setItems((arr) => [
      ...arr,
      { qty: 1, description: '', material: '', size: '', color: '', printColor: '' },
    ]);

  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const updateItem = (i: number, key: keyof OrderItem, val: any) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

  // image helpers
  function addImagesFromInput(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const withUrls = list.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...withUrls]);
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      if (removed) {
        if (lightboxUrl === removed.url) setLightboxUrl(null);
        URL.revokeObjectURL(removed.url);
      }
      return next;
    });
  }

  // clear the “Choose Files …” text when none left
  useEffect(() => {
    if (images.length === 0 && fileInputRef.current) fileInputRef.current.value = '';
  }, [images.length]);

  // revoke on unmount
  useEffect(() => {
    return () => {
      images.forEach((it) => URL.revokeObjectURL(it.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // close lightbox with ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxUrl(null);
    }
    if (lightboxUrl) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

  // resize + webp to keep storage/egress cheap
  async function resizeToWebP(
    file: File,
    maxW = 1600,
    maxH = 1200,
    quality = 0.78
  ): Promise<File> {
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
      bitmap = imgEl;
    }

    const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // @ts-ignore
    ctx.drawImage(bitmap, 0, 0, w, h);

    const type = 'image/webp';
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b as Blob), type, quality)
    );
    const base = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.webp`, { type, lastModified: Date.now() });
  }

  // submit
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!customerName.trim()) return;

    setCreating(true);
    try {
      // 1) create order
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
        assignedToUid: null,
        assignedToName: null,
        notes: notes || undefined,
        createdByUid: user.uid,
      });

      // 2) upload images after client-side compression
      for (const it of images) {
        const small = await resizeToWebP(it.file, 1600, 1200, 0.78);
        await uploadOrderImage(orderId, small, user.uid);
      }

      router.push('/admin/orders');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminRoute>
      {/* widen page so fields can breathe */}
      <main className="max-w-7xl mx-auto p-6 text-white">
        <h1 className="text-3xl font-bold mb-6">New Order</h1>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Items */}
          <div>
            <label className="block text-sm mb-2">Items</label>
            <div className="space-y-4">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-3 items-center bg-white/5 p-3 rounded-lg"
                >
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => updateItem(i, 'qty', Number(e.target.value))}
                    className="px-2 py-1 rounded text-black col-span-12 md:col-span-1"
                    placeholder="Qty"
                  />
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    className="px-2 py-1 rounded text-black col-span-12 md:col-span-4"
                    placeholder="Description"
                  />
                  <input
                    value={it.material}
                    onChange={(e) => updateItem(i, 'material', e.target.value)}
                    className="px-2 py-1 rounded text-black col-span-6 md:col-span-2"
                    placeholder="Material"
                  />
                  <input
                    value={it.size}
                    onChange={(e) => updateItem(i, 'size', e.target.value)}
                    className="px-2 py-1 rounded text-black col-span-6 md:col-span-2"
                    placeholder="Size"
                  />
                  <input
                    value={it.color}
                    onChange={(e) => updateItem(i, 'color', e.target.value)}
                    className="px-2 py-1 rounded text-black col-span-6 md:col-span-1"
                    placeholder="Color"
                  />
                  <input
                    value={it.printColor}
                    onChange={(e) => updateItem(i, 'printColor', e.target.value)}
                    className="px-2 py-1 rounded text-black col-span-6 md:col-span-2"
                    placeholder="Print Color"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="col-span-12 justify-self-end text-sm opacity-80 hover:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-4 rounded-md bg-white/10 px-3 py-1 hover:bg-white/20"
            >
              + Add Item
            </button>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          {/* Images: ONLY tiny thumbs + modal */}
          <section>
            <h2 className="text-lg font-semibold mb-2">Images</h2>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-3">
                <input
                  ref={fileInputRef}
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
                <div className="order-image-grid grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {images.map((it, i) => (
                    <div
                      key={it.url}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 flex flex-col items-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={it.url}
                        alt={it.file.name}
                        className="w-24 h-24 object-cover rounded-md cursor-zoom-in"
                        onClick={() => setLightboxUrl(it.url)}
                      />
                      <div className="mt-2 flex items-center justify-between w-full gap-2">
                        <span className="text-[11px] truncate opacity-80 flex-1" title={it.file.name}>
                          {it.file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="text-[11px] rounded-md bg-black/60 hover:bg-black/70 px-2 py-1 whitespace-nowrap"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {lightboxUrl && (
              <div
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setLightboxUrl(null)}
              >
                <div className="max-w-5xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lightboxUrl}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Notes */}
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
