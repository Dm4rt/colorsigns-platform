import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { Order, OrderStatus } from './orderTypes';

const db = getFirestore(app);
export const ORDERS_COL = 'orders';

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, ORDERS_COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listOrders() {
  const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Order[];
}

export async function advanceStatus(orderId: string, next: OrderStatus) {
  await updateDoc(doc(db, ORDERS_COL, orderId), {
    status: next,
    updatedAt: serverTimestamp(),
  });
}
