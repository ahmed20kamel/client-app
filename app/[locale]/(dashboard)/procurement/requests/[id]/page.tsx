'use client';
import { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, CheckCircle, XCircle, ShoppingCart, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const SQ_STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'bg-gray-100 text-gray-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

interface PRDetail {
  id: string;
  prNumber: string;
  title: string;
  description: string | null;
  requiredDate: string | null;
  projectRef: string | null;
  notes: string | null;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  requestedBy: { fullName: string };
  approvedBy: { fullName: string } | null;
  items: Array<{ id: string; description: string; quantity: number; unit: string | null; estimatedPrice: number | null }>;
  supplierQuotes: Array<{
    id: string;
    sqNumber: string;
    status: string;
    supplier: { id: string; name: string };
    subtotal: number;
    taxAmount: number;
    total: number;
    deliveryDays: number | null;
    paymentTerms: string | null;
    validUntil: string | null;
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number; unit: string | null }>;
  }>;
  purchaseOrders: Array<{ id: string; poNumber: string; status: string; total: number }>;
}

export default function PRDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = use(params);
  const router = useRouter();
  const [pr, setPR] = useState<PRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = () => {
    fetch(`/api/procurement/requests/${id}`)
      .then(r => r.json())
      .then(res => {
        setPR(res.data || null);
        setLoading(false);
      });
  };
  useEffect(load, [id]);

  const submit = async () => {
    setActing(true);
    const res = await fetch(`/api/procurement/requests/${id}/submit`, { method: 'POST' });
    if (res.ok) { toast.success('Submitted for approval'); load(); }
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    setActing(false);
  };

  const approve = async (action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt('Rejection reason (optional):') : undefined;
    setActing(true);
    const res = await fetch(`/api/procurement/requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    if (res.ok) { toast.success(action === 'approve' ? 'Request approved' : 'Request rejected'); load(); }
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    setActing(false);
  };

  const acceptQuote = async (sqId: string) => {
    setActing(true);
    const res = await fetch(`/api/procurement/supplier-quotations/${sqId}/accept`, { method: 'POST' });
    if (res.ok) {
      const { data } = await res.json();
      toast.success(`PO ${data.poNumber} created`);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to accept quotation');
    }
    setActing(false);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  if (loading) return <div className="py-16 text-center text-muted-foreground text-[13px]">Loading...</div>;
  if (!pr) return <div className="py-16 text-center text-muted-foreground">Request not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/procurement/requests`} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono">{pr.prNumber}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[pr.status] || 'bg-gray-100 text-gray-600'}`}>
                {pr.status}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">{pr.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {pr.status === 'DRAFT' && (
            <Button size="sm" onClick={submit} disabled={acting}>Submit for Approval</Button>
          )}
          {pr.status === 'REJECTED' && (
            <Button size="sm" variant="outline" onClick={submit} disabled={acting}>
              Resubmit for Approval
            </Button>
          )}
          {pr.status === 'SUBMITTED' && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approve('approve')} disabled={acting}>
                <CheckCircle className="size-4 mr-1.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => approve('reject')} disabled={acting}>
                <XCircle className="size-4 mr-1.5" /> Reject
              </Button>
            </>
          )}
          {pr.status === 'APPROVED' && (
            <Button size="sm" onClick={() => router.push(`/${locale}/procurement/requests/${id}/quotations/new`)}>
              <Plus className="size-4 mr-1.5" /> Add Quotation
            </Button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Details</h2>
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Requested by</dt><dd className="font-medium">{pr.requestedBy.fullName}</dd></div>
            {pr.approvedBy && <div className="flex justify-between"><dt className="text-muted-foreground">Approved by</dt><dd className="font-medium">{pr.approvedBy.fullName}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Required by</dt><dd className="font-medium">{pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString('en-AE') : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Project ref</dt><dd className="font-medium">{pr.projectRef || '—'}</dd></div>
            {pr.submittedAt && <div className="flex justify-between"><dt className="text-muted-foreground">Submitted</dt><dd className="font-medium">{new Date(pr.submittedAt).toLocaleDateString('en-AE')}</dd></div>}
            {pr.approvedAt && <div className="flex justify-between"><dt className="text-muted-foreground">Approved</dt><dd className="font-medium">{new Date(pr.approvedAt).toLocaleDateString('en-AE')}</dd></div>}
          </dl>
          {pr.description && (
            <div className="pt-2 border-t border-border">
              <p className="text-[12px] text-muted-foreground font-medium mb-1">Description</p>
              <p className="text-[13px]">{pr.description}</p>
            </div>
          )}
          {pr.rejectionReason && (
            <div className="pt-2 border-t border-border">
              <p className="text-[12px] text-red-600 font-medium mb-1">Rejection Reason</p>
              <p className="text-[13px] text-red-700">{pr.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Linked POs */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Purchase Orders</h2>
          {pr.purchaseOrders.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No POs created yet</p>
          ) : (
            <div className="space-y-2">
              {pr.purchaseOrders.map(po => (
                <Link
                  key={po.id}
                  href={`/${locale}/procurement/orders/${po.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="size-4 text-muted-foreground" />
                    <span className="font-mono font-semibold text-[13px]">{po.poNumber}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{po.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium">AED {fmt(po.total)}</span>
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[14px] font-semibold">Requested Items</h2>
        </div>
        <table className="w-full text-[13px]">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              {['#', 'Description', 'Qty', 'Unit', 'Est. Price'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pr.items.map((item, i) => (
              <tr key={item.id} className="hover:bg-muted/10">
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5">{item.description}</td>
                <td className="px-4 py-2.5">{item.quantity}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{item.unit || '—'}</td>
                <td className="px-4 py-2.5">{item.estimatedPrice != null ? `AED ${fmt(item.estimatedPrice)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Supplier Quotations Comparison */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">Supplier Quotations</h2>
          {pr.status === 'APPROVED' && (
            <Button size="sm" variant="outline" onClick={() => router.push(`/${locale}/procurement/requests/${id}/quotations/new`)}>
              <Plus className="size-3.5 mr-1" /> Add Quotation
            </Button>
          )}
        </div>
        {pr.supplierQuotes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-[13px] text-muted-foreground">No quotations received yet</p>
            {pr.status === 'APPROVED' && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => router.push(`/${locale}/procurement/requests/${id}/quotations/new`)}>
                Add first quotation
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pr.supplierQuotes.map(sq => (
              <div
                key={sq.id}
                className={`rounded-xl border bg-card p-5 space-y-4 ${sq.status === 'ACCEPTED' ? 'border-green-400 ring-2 ring-green-200' : 'border-border'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono font-semibold text-[13px]">{sq.sqNumber}</p>
                    <p className="font-semibold">{sq.supplier.name}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${SQ_STATUS_COLOR[sq.status] || 'bg-gray-100 text-gray-600'}`}>
                    {sq.status}
                  </span>
                </div>

                <div className="space-y-1 text-[12px]">
                  {sq.deliveryDays != null && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{sq.deliveryDays} days</span></div>
                  )}
                  {sq.paymentTerms && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{sq.paymentTerms}</span></div>
                  )}
                  {sq.validUntil && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Valid until</span><span>{new Date(sq.validUntil).toLocaleDateString('en-AE')}</span></div>
                  )}
                </div>

                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1 text-left text-muted-foreground">Item</th>
                      <th className="py-1 text-right text-muted-foreground">Qty</th>
                      <th className="py-1 text-right text-muted-foreground">Unit Price</th>
                      <th className="py-1 text-right text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sq.items.map((item, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1 max-w-[100px] truncate" title={item.description}>{item.description}</td>
                        <td className="py-1 text-right">{item.quantity}</td>
                        <td className="py-1 text-right">{fmt(item.unitPrice)}</td>
                        <td className="py-1 text-right">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="space-y-1 text-[12px] pt-1 border-t border-border">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>AED {fmt(sq.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">VAT (5%)</span><span>AED {fmt(sq.taxAmount)}</span></div>
                  <div className="flex justify-between font-semibold text-[13px]"><span>Total</span><span>AED {fmt(sq.total)}</span></div>
                </div>

                {sq.status === 'RECEIVED' && pr.status === 'APPROVED' && (
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => acceptQuote(sq.id)}
                    disabled={acting}
                  >
                    Accept &amp; Create PO
                  </Button>
                )}
                {sq.status === 'ACCEPTED' && (
                  <div className="text-center text-[12px] text-green-700 font-medium flex items-center justify-center gap-1">
                    <CheckCircle className="size-3.5" /> Accepted — PO Created
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
