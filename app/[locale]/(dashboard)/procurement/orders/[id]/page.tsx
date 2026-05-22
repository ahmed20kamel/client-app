'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-violet-100 text-violet-700',
  PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const NEXT_STATUS: Record<string, { label: string; status: string; variant: 'default' | 'outline' | 'destructive' }[]> = {
  DRAFT: [
    { label: 'Send to Supplier', status: 'SENT', variant: 'default' },
    { label: 'Cancel', status: 'CANCELLED', variant: 'destructive' },
  ],
  SENT: [
    { label: 'Mark Confirmed', status: 'CONFIRMED', variant: 'default' },
    { label: 'Cancel', status: 'CANCELLED', variant: 'destructive' },
  ],
  CONFIRMED: [
    { label: 'Mark Received', status: 'RECEIVED', variant: 'default' },
    { label: 'Cancel', status: 'CANCELLED', variant: 'destructive' },
  ],
  PARTIALLY_RECEIVED: [
    { label: 'Mark Fully Received', status: 'RECEIVED', variant: 'default' },
  ],
  RECEIVED: [],
  CANCELLED: [],
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface POItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string | null;
}

interface LPO {
  id: string;
  poNumber: string;
  subject: string | null;
  notes: string | null;
  terms: string | null;
  status: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  expectedDate: string | null;
  supplier: { id: string; name: string; phone: string | null; email: string | null };
  createdBy: { fullName: string };
  items: POItem[];
}

export default function LPODetailPage() {
  const { locale, id } = useParams() as { locale: string; id: string };
  const router = useRouter();
  const [lpo, setLpo] = useState<LPO | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/purchase-orders/${id}`)
      .then(r => r.json())
      .then(res => { setLpo(res.data); setLoading(false); });
  }, [id]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    const res = await fetch(`/api/purchase-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setLpo(data);
      toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
    } else {
      toast.error('Failed to update status');
    }
    setUpdating(false);
  };

  if (loading) return <div className="p-8 text-center text-[13px] text-muted-foreground">Loading...</div>;
  if (!lpo) return <div className="p-8 text-center text-[13px] text-muted-foreground">LPO not found.</div>;

  const actions = NEXT_STATUS[lpo.status] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/procurement/orders`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{lpo.poNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_COLOR[lpo.status] || 'bg-gray-100 text-gray-600'}`}>
              {lpo.status.replace(/_/g, ' ')}
            </span>
          </div>
          {lpo.subject && <p className="text-[13px] text-muted-foreground mt-0.5">{lpo.subject}</p>}
        </div>
        <div className="flex gap-2">
          {actions.map(a => (
            <Button key={a.status} size="sm" variant={a.variant} onClick={() => updateStatus(a.status)} disabled={updating}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Supplier</p>
          <p className="text-[14px] font-bold">{lpo.supplier.name}</p>
          {lpo.supplier.phone && <p className="text-[12px] text-muted-foreground mt-1">{lpo.supplier.phone}</p>}
          {lpo.supplier.email && <p className="text-[12px] text-muted-foreground">{lpo.supplier.email}</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Order Info</p>
          <p className="text-[12px] text-muted-foreground">Date: <span className="text-foreground font-medium">{new Date(lpo.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
          {lpo.expectedDate && <p className="text-[12px] text-muted-foreground mt-1">Expected: <span className="text-foreground font-medium">{new Date(lpo.expectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>}
          <p className="text-[12px] text-muted-foreground mt-1">By: <span className="text-foreground font-medium">{lpo.createdBy.fullName}</span></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total</p>
          <p className="text-[22px] font-bold tabular-nums">AED {fmt(lpo.total)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Subtotal: AED {fmt(lpo.subtotal)} + VAT {lpo.taxPercent}%</p>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold">Line Items</h2>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">#</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Unit Price</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lpo.items.map((item, i) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{item.description}</td>
                <td className="px-4 py-3 text-right tabular-nums">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(item.unitPrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-muted/20">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-[12px] text-muted-foreground">Subtotal</td>
              <td className="px-4 py-2 text-right tabular-nums text-[12px]">AED {fmt(lpo.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-[12px] text-muted-foreground">VAT ({lpo.taxPercent}%)</td>
              <td className="px-4 py-2 text-right tabular-nums text-[12px]">AED {fmt(lpo.taxAmount)}</td>
            </tr>
            <tr className="font-bold">
              <td colSpan={4} className="px-4 py-3 text-right text-[14px]">Total</td>
              <td className="px-4 py-3 text-right tabular-nums text-[14px] text-primary">AED {fmt(lpo.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes / Terms */}
      {(lpo.notes || lpo.terms) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lpo.notes && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
              <p className="text-[13px] whitespace-pre-wrap">{lpo.notes}</p>
            </div>
          )}
          {lpo.terms && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Terms & Conditions</p>
              <p className="text-[13px] whitespace-pre-wrap">{lpo.terms}</p>
            </div>
          )}
        </div>
      )}

      {/* GRN action */}
      {['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(lpo.status) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-center justify-between">
          <p className="text-[13px] text-amber-800 font-medium">Ready to receive goods for this LPO?</p>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/${locale}/procurement/receipts/new?poId=${lpo.id}`}>Create GRN</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
