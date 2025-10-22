'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listOrders, advanceStatus } from '@/lib/orders';
import { ORDER_FLOW, type Order, type OrderStatus } from '@/lib/orderTypes';
import AdminRoute from '@/components/AdminRoute';

function StatusBadge({ s }: { s: OrderStatus }) {
  const labels: Record<OrderStatus, string> = {
    placed: 'Placed',
    sketch_in_progress: 'Sketching',
    sketch_ready: 'Sketch Ready',
    client_review: 'Client Review',
    changes_requested: 'Changes Req.',
    approved: 'Approved',
    production: 'Production',
    ready_for_pickup: 'Ready',
    closed: 'Closed',
  };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs border border-white/20 bg-white/10">
      {labels[s]}
    </span>
  );
}

function nextStatus(current: OrderStatus): OrderStatus | null {
  const idx = ORDER_FLOW.indexOf(current);
  if (idx === -1 || idx === ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[idx + 1];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => setOrders(await listOrders()))();
  }, []);

  const onAdvance = async (o: Order) => {
    const to = nextStatus(o.status);
    if (!to) return;
    setBusyId(o.id);
    try {
      await advanceStatus(o.id, to);
      setOrders(prev =>
        prev?.map(p => (p.id === o.id ? { ...p, status: to } : p)) ?? prev
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminRoute>
      <main className="max-w-5xl mx-auto p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Orders</h1>
          <Link
            href="/admin/orders/new"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold hover:brightness-110"
          >
            + New Order
          </Link>
        </div>

        {!orders ? (
          <div className="flex h-40 items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <p className="opacity-80">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{o.customerName}</td>
                    <td className="px-4 py-3">{o.company || '-'}</td>
                    <td className="px-4 py-3">{o.items?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      {typeof o.total === 'number' ? `$${o.total.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge s={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      {nextStatus(o.status) && (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => onAdvance(o)}
                          className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-60"
                        >
                          Advance → {nextStatus(o.status)?.replace(/_/g, ' ')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AdminRoute>
  );
}
