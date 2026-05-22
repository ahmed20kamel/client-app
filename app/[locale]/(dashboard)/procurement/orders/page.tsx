'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Search, ChevronRight } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-violet-100 text-violet-700',
  PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface LPO {
  id: string;
  poNumber: string;
  subject: string | null;
  status: string;
  total: number;
  createdAt: string;
  supplier: { id: string; name: string };
  purchaseRequest?: { id: string; prNumber: string } | null;
  _count?: { items: number };
}

export default function ProcurementOrdersPage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const [orders, setOrders] = useState<LPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ limit: '100' });
    if (search) q.set('search', search);
    if (statusFilter) q.set('status', statusFilter);
    fetch(`/api/purchase-orders?${q}`)
      .then(r => r.json())
      .then(res => { setOrders(res.data || []); setLoading(false); });
  }, [search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">LPO / Purchase Orders</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Local Purchase Orders issued to suppliers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            className="w-full h-9 pl-9 pr-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Search LPO number or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 px-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="RECEIVED">Fully Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[13px] text-muted-foreground">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="size-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-[13px] text-muted-foreground">No orders yet. Accept a quotation to generate a LPO.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">LPO No.</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Supplier</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Subject</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Total (AED)</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Date</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(o => (
                <tr
                  key={o.id}
                  className="hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => router.push(`/${locale}/procurement/orders/${o.id}`)}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{o.poNumber}</td>
                  <td className="px-4 py-3 font-medium">{o.supplier.name}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-48">{o.subject || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(o.total)}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
