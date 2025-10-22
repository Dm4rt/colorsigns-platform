export type OrderStatus =
  | 'placed'
  | 'sketch_in_progress'
  | 'sketch_ready'
  | 'client_review'
  | 'changes_requested'
  | 'approved'
  | 'production'
  | 'ready_for_pickup'
  | 'closed';

export const ORDER_FLOW: OrderStatus[] = [
  'placed',
  'sketch_in_progress',
  'sketch_ready',
  'client_review',
  'changes_requested',
  'approved',
  'production',
  'ready_for_pickup',
  'closed',
];

export type OrderItem = {
  qty: number;
  description: string;
  material?: string;
  size?: string;
  color?: string;
  printColor?: string;
  unitPrice?: number; // optional per-item pricing
};

export type Order = {
  id: string;
  customerName: string;
  phone?: string;
  email?: string;
  company?: string;

  items: OrderItem[];
  // simple money fields for now (we can normalize later)
  total?: number;
  deposit?: number;
  balance?: number;

  status: OrderStatus;
  assignedToUid?: string | null;

  notes?: string;

  createdAt: any; // serverTimestamp
  updatedAt: any; // serverTimestamp
  createdByUid: string;
};
