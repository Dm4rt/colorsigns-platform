'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminRoute from '@/components/AdminRoute';
import { listOrders } from '@/lib/orders';
import { ORDER_FLOW, type Order, type OrderStatus } from '@/lib/orderTypes';

import { app } from '@/lib/firebase';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

type Cmp = '<=' | '=' | '>=';

function shortId(id: string) {
  if (!id) return '';
  return id.length <= 10 ? id : `${id.slice(0, 4)}…${id.slice(-4)}`;
}

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

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [admins, setAdmins] = useState<{ uid: string; username: string }[]>([]);

  // filters
  const [fId, setFId] = useState('');
  const [fCustomer, setFCustomer] = useState('');
  const [fCompany, setFCompany] = useState('');
  const [fAssignee, setFAssignee] = useState<'all' | 'unassigned' | string>('all'); // uid|string
  const [fItemsText, setFItemsText] = useState('');
  const [fTotalCmp, setFTotalCmp] = useState<Cmp>('>=');
  const [fTotalVal, setFTotalVal] = useState('');
  const [fBalCmp, setFBalCmp] = useState<Cmp>('>=');
  const [fBalVal, setFBalVal] = useState('');
  const [fStatus, setFStatus] = useState<'all' | OrderStatus>('all');

  useEffect(() => {
    (async () => setOrders(await listOrders()))();
  }, []);

  useEffect(() => {
    (async () => {
      const db = getFirestore(app);
      const qAdmins = query(collection(db, 'users'), where('role', '==', 'admin'));
      const snap = await getDocs(qAdmins);
      setAdmins(
        snap.docs.map((d) => ({
          uid: d.id,
          username: (d.data().username as string) || 'Admin',
        }))
      );
    })();
  }, []);

  const cmp = (left: number, op: Cmp, raw: string) => {
    if (raw === '') return true;
    const right = Number(raw);
    if (Number.isNaN(right)) return true;
    if (op === '<=') return left <= right;
    if (op === '>=') return left >= right;
    return left === right;
  };

  const filtered = useMemo(() => {
    if (!orders) return null;
    return orders.filter((o) => {
      const idOK = fId.trim() === '' || o.id.toLowerCase().includes(fId.toLowerCase());
      const custOK =
        fCustomer.trim() === '' ||
        o.customerName.toLowerCase().includes(fCustomer.toLowerCase());
      const compOK =
        fCompany.trim() === '' ||
        (o.company ?? '').toLowerCase().includes(fCompany.toLowerCase());

      const itemsJoined = (o.items ?? [])
        .map((it) => (it.description || '').toLowerCase())
        .join(' ');
      const itemsOK =
        fItemsText.trim() === '' || itemsJoined.includes(fItemsText.toLowerCase());

      const total = typeof o.total === 'number' ? o.total : 0;
      const deposit = typeof o.deposit === 'number' ? o.deposit : 0;
      const balance = Math.max(total - deposit, 0);

      const totalOK = cmp(total, fTotalCmp, fTotalVal);
      const balOK = cmp(balance, fBalCmp, fBalVal);
      const statusOK = fStatus === 'all' || o.status === fStatus;

      const assigneeOK =
        fAssignee === 'all'
          ? true
          : fAssignee === 'unassigned'
          ? !o.assignedToUid
          : o.assignedToUid === fAssignee;

      return idOK && custOK && compOK && itemsOK && totalOK && balOK && statusOK && assigneeOK;
    });
  }, [
    orders,
    fId,
    fCustomer,
    fCompany,
    fItemsText,
    fTotalCmp,
    fTotalVal,
    fBalCmp,
    fBalVal,
    fStatus,
    fAssignee,
  ]);

  const clearFilters = () => {
    setFId('');
    setFCustomer('');
    setFCompany('');
    setFAssignee('all');
    setFItemsText('');
    setFTotalCmp('>=');
    setFTotalVal('');
    setFBalCmp('>=');
    setFBalVal('');
    setFStatus('all');
  };

  // headers rendered from an array to avoid stray whitespace nodes inside <tr>
  const headerCells = [
    { key: 'id', label: 'Order ID' },
    { key: 'customer', label: 'Customer' },
    { key: 'company', label: 'Company' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'items', label: 'Items' },
    { key: 'total', label: 'Total' },
    { key: 'balance', label: 'Balance' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <AdminRoute>
      <main className="max-w-7xl mx-auto p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Orders</h1>
          <div className="flex gap-3">
            <button
              onClick={clearFilters}
              className="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            >
              Clear filters
            </button>
            <a
              href="/admin/orders/new"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold hover:brightness-110"
            >
              + New Order
            </a>
          </div>
        </div>

        {!orders ? (
          <div className="flex h-40 items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5">
                <tr>
                  {headerCells.map((h) => (
                    <th key={h.key} className="px-4 py-3">
                      {h.label}
                    </th>
                  ))}
                </tr>

                <tr className="border-t border-white/10">
                  {[
                    // Order ID
                    <th key="f-id" className="px-4 py-2">
                      <input
                        value={fId}
                        onChange={(e) => setFId(e.target.value)}
                        placeholder="ID…"
                        className="w-full rounded-md bg-white/90 text-black px-2 py-1"
                      />
                    </th>,

                    // Customer
                    <th key="f-customer" className="px-4 py-2">
                      <input
                        value={fCustomer}
                        onChange={(e) => setFCustomer(e.target.value)}
                        placeholder="Customer…"
                        className="w-full rounded-md bg-white/90 text-black px-2 py-1"
                      />
                    </th>,

                    // Company
                    <th key="f-company" className="px-4 py-2">
                      <input
                        value={fCompany}
                        onChange={(e) => setFCompany(e.target.value)}
                        placeholder="Company…"
                        className="w-full rounded-md bg-white/90 text-black px-2 py-1"
                      />
                    </th>,

                    // Assignee
                    <th key="f-assignee" className="px-4 py-2">
                      <select
                        value={fAssignee}
                        onChange={(e) =>
                          setFAssignee(e.target.value as 'all' | 'unassigned' | string)
                        }
                        className="w-full rounded-md bg-white/90 text-black px-2 py-1"
                      >
                        <option value="all">All</option>
                        <option value="unassigned">Unassigned</option>
                        {admins.map((a) => (
                          <option key={a.uid} value={a.uid}>
                            {a.username}
                          </option>
                        ))}
                      </select>
                    </th>,

                    // Items text
                    <th key="f-items" className="px-4 py-2">
                      <input
                        value={fItemsText}
                        onChange={(e) => setFItemsText(e.target.value)}
                        placeholder="Item text…"
                        className="w-full rounded-md bg-white/90 text-black px-2 py-1"
                      />
                    </th>,

                    // Total compare + value
                    <th key="f-total" className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={fTotalCmp}
                          onChange={(e) => setFTotalCmp(e.target.value as Cmp)}
                          className="w-16 rounded-md bg-white/90 text-black px-1 py-1"
                          title="Compare"
                        >
                          <option value="<=">{'\u2264'}</option>
                          <option value="=">=</option>
                          <option value=">=">{'\u2265'}</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={fTotalVal}
                          onChange={(e) => setFTotalVal(e.target.value)}
                          placeholder="$"
                          className="w-28 rounded-md bg-white/90 text-black px-2 py-1"
                        />
                      </div>
                    </th>,

                    // Balance compare + value
                    <th key="f-balance" className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={fBalCmp}
                          onChange={(e) => setFBalCmp(e.target.value as Cmp)}
                          className="w-16 rounded-md bg-white/90 text-black px-1 py-1"
                          title="Compare"
                        >
                          <option value="<=">{'\u2264'}</option>
                          <option value="=">=</option>
                          <option value=">=">{'\u2265'}</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={fBalVal}
                          onChange={(e) => setFBalVal(e.target.value)}
                          placeholder="$"
                          className="w-28 rounded-md bg-white/90 text-black px-2 py-1"
                        />
                      </div>
                    </th>,

                    // Status
                    <th key="f-status" className="px-4 py-2">
                      <select
                        value={fStatus}
                        onChange={(e) => setFStatus(e.target.value as any)}
                        className="w-full rounded-md bg-white/90 text-black px-2 py-1"
                      >
                        <option value="all">All</option>
                        {ORDER_FLOW.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </th>,
                  ]}
                </tr>
              </thead>

              <tbody>
                {filtered!.length === 0 ? (
                  <tr className="border-t border-white/10">
                    <td colSpan={8} className="px-4 py-6 text-center opacity-75">
                      No matching orders — adjust filters above.
                    </td>
                  </tr>
                ) : (
                  filtered!.map((o) => {
                    const total = typeof o.total === 'number' ? o.total : 0;
                    const deposit = typeof o.deposit === 'number' ? o.deposit : 0;
                    const balance = Math.max(total - deposit, 0);
                    const firstItem = o.items?.[0]?.description || '-';
                    const more = (o.items?.length ?? 0) - 1;

                    return (
                      <tr
                        key={o.id}
                        className="border-t border-white/10 hover:bg-white/5 cursor-pointer"
                        onClick={() => router.push(`/admin/orders/${o.id}`)}
                        title="Open order"
                      >
                        <td className="px-4 py-3">
                          <span title={o.id} className="font-mono">
                            {shortId(o.id)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="underline decoration-dotted">
                            {o.customerName}
                          </span>
                        </td>
                        <td className="px-4 py-3">{o.company || '-'}</td>
                        <td className="px-4 py-3">{o.assignedToName || '—'}</td>
                        <td className="px-4 py-3">
                          {firstItem}
                          {more > 0 && <span className="opacity-70"> (+{more} more)</span>}
                        </td>
                        <td className="px-4 py-3">{total ? `$${total.toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3">{`$${balance.toFixed(2)}`}</td>
                        <td className="px-4 py-3">
                          <StatusBadge s={o.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AdminRoute>
  );
}
