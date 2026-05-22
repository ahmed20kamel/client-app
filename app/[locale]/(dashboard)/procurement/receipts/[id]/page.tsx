'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  FULLY_RECEIVED: 'bg-green-100 text-green-700',
};

interface GRNDetail {
  id: string;
  grnNumber: string;
  status: string;
  receivedAt: string | null;
  notes: string | null;
  purchaseOrder: {
    id: string;
    poNumber: string;
    supplier: { name: string };
    items: Array<{ id: string; description: string; quantity: number; unitPrice: number; unit: string | null }>;
  };
  receivedBy: { fullName: string };
  items: Array<{
    id: string;
    description: string;
    orderedQty: number;
    receivedQty: number;
    unit: string | null;
    notes: string | null;
  }>;
}

export default function GRNDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = use(params);
  const [grn, setGRN] = useState<GRNDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/procurement/receipts/${id}`)
      .then(r => r.json())
      .then(res => {
        setGRN(res.data || null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="py-16 text-center text-muted-foreground text-[13px]">Loading...</div>;
  if (!grn) return <div className="py-16 text-center text-muted-foreground">Receipt not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/procurement/receipts`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono">{grn.grnNumber}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[grn.status] || 'bg-gray-100 text-gray-600'}`}>
              {grn.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            PO: <Link href={`/${locale}/purchase-orders/${grn.purchaseOrder.id}`} className="text-primary hover:underline">{grn.purchaseOrder.poNumber}</Link>
            {' '}— {grn.purchaseOrder.supplier.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Details</h2>
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Received by</dt><dd className="font-medium">{grn.receivedBy?.fullName}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Received at</dt><dd className="font-medium">{grn.receivedAt ? new Date(grn.receivedAt).toLocaleDateString('en-AE') : '—'}</dd></div>
          </dl>
          {grn.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-[12px] text-muted-foreground font-medium mb-1">Notes</p>
              <p className="text-[13px]">{grn.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[14px] font-semibold">Received Items</h2>
        </div>
        <table className="w-full text-[13px]">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              {['#', 'Description', 'Ordered Qty', 'Received Qty', 'Unit', 'Variance'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grn.items.map((item, i) => {
              const variance = item.receivedQty - item.orderedQty;
              return (
                <tr key={item.id} className="hover:bg-muted/10">
                  <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2.5">{item.description}</td>
                  <td className="px-4 py-2.5">{item.orderedQty}</td>
                  <td className="px-4 py-2.5 font-medium">{item.receivedQty}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.unit || '—'}</td>
                  <td className={`px-4 py-2.5 font-medium ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                    {variance > 0 ? '+' : ''}{variance}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
