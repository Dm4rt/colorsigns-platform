'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createOrder } from '@/lib/orders';
import type { OrderItem } from '@/lib/orderTypes';
import AdminRoute from '@/components/AdminRoute';
import { useRouter } from 'next/navigation';

export default function NewOrderPage() {
  const { user } = useAuth();
  const router = useRouter();

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

  const addItem = () =>
    setItems((arr) => [...arr, { qty: 1, description: '', material: '', size: '', color: '', printColor: '' }]);

  const removeItem = (i: number) =>
    setItems((arr) => arr.filter((_, idx) => idx !== i));

  const updateItem = (i: number, key: keyof OrderItem, val: any) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const balance =
      typeof total === 'number' && typeof deposit === 'number'
        ? Math.max(total - deposit, 0)
        : undefined;

    const id = await createOrder({
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
      notes: notes || undefined,
      createdByUid: user.uid,
    });

    router.push('/admin/orders');
  };

  return (
    <AdminRoute>
      <main className="max-w-3xl mx-auto p-6 text-white">
        <h1 className="text-3xl font-bold mb-4">New Order</h1>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Customer Name*</label>
              <input className="w-full rounded-md px-3 py-2 text-black" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Company</label>
              <input className="w-full rounded-md px-3 py-2 text-black" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" className="w-full rounded-md px-3 py-2 text-black" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input className="w-full rounded-md px-3 py-2 text-black" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Items</label>
            <div className="space-y-3">
              {items.map((it, i) => (
                <div key={i} className="grid sm:grid-cols-6 gap-2 items-center bg-white/5 p-3 rounded-lg">
                  <input type="number" min={1} value={it.qty} onChange={(e) => updateItem(i, 'qty', Number(e.target.value))} className="px-2 py-1 rounded text-black" placeholder="Qty" />
                  <input value={it.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="px-2 py-1 rounded text-black sm:col-span-2" placeholder="Description" />
                  <input value={it.material} onChange={(e) => updateItem(i, 'material', e.target.value)} className="px-2 py-1 rounded text-black" placeholder="Material" />
                  <input value={it.size} onChange={(e) => updateItem(i, 'size', e.target.value)} className="px-2 py-1 rounded text-black" placeholder="Size" />
                  <input value={it.color} onChange={(e) => updateItem(i, 'color', e.target.value)} className="px-2 py-1 rounded text-black" placeholder="Color" />
                  <input value={it.printColor} onChange={(e) => updateItem(i, 'printColor', e.target.value)} className="px-2 py-1 rounded text-black" placeholder="Print Color" />
                  <button type="button" onClick={() => removeItem(i)} className="sm:col-span-6 justify-self-end text-sm opacity-80 hover:opacity-100">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-3 rounded-md bg-white/10 px-3 py-1 hover:bg-white/20">
              + Add Item
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Total</label>
              <input type="number" step="0.01" className="w-full rounded-md px-3 py-2 text-black" value={total ?? ''} onChange={(e) => setTotal(e.target.value === '' ? undefined : Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Deposit</label>
              <input type="number" step="0.01" className="w-full rounded-md px-3 py-2 text-black" value={deposit ?? ''} onChange={(e) => setDeposit(e.target.value === '' ? undefined : Number(e.target.value))} />
            </div>
            <div className="self-end">
              <p className="text-sm opacity-80">
                Balance auto-calculated on save.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Notes</label>
            <textarea className="w-full rounded-md px-3 py-2 text-black" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 font-semibold hover:brightness-110">
              Create Order
            </button>
            <button type="button" onClick={() => history.back()} className="rounded-md bg-white/10 px-4 py-2 hover:bg-white/20">
              Cancel
            </button>
          </div>
        </form>
      </main>
    </AdminRoute>
  );
}
