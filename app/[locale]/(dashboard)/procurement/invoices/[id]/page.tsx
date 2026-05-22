'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ChevronLeft, CheckCircle, AlertTriangle, XCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'bg-gray-100 text-gray-700',
  MATCHED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-violet-100 text-violet-700',
  PAID: 'bg-green-100 text-green-700',
  DISPUTED: 'bg-red-100 text-red-700',
};

interface MatchDetail {
  description: string;
  invoiceQty: number;
  poQty: number | undefined;
  receivedQty: number;
  invoicePrice: number;
  poPrice: number | undefined;
  qtyMatch: boolean;
  priceMatch: boolean;
  receivedMatch: boolean;
}

interface VendorInvoiceDetail {
  id: string;
  ourRef: string;
  vendorInvoiceNo: string | null;
  status: string;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  notes: string | null;
  matchedAt: string | null;
  approvedAt: string | null;
  supplier: { id: string; name: string; iban: string | null; bankName: string | null };
  purchaseOrder: {
    id: string;
    poNumber: string;
    items: Array<{ id: string; description: string; quantity: number; unitPrice: number }>;
    goodsReceipts: Array<{ id: string; grnNumber: string; status: string }>;
  };
  createdBy: { fullName: string };
  items: Array<{ id: string; description: string; quantity: number; unit: string | null; unitPrice: number; total: number }>;
  payments: Array<{ id: string; amount: number; method: string; paymentDate: string; reference: string | null; status: string }>;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = use(params);
  const [inv, setInv] = useState<VendorInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [matchResult, setMatchResult] = useState<{ matched: boolean; details: MatchDetail[] } | null>(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'Bank Transfer', paymentDate: new Date().toISOString().split('T')[0], reference: '', notes: '' });

  const load = () => {
    fetch(`/api/procurement/invoices/${id}`)
      .then(r => r.json())
      .then(res => {
        setInv(res.data || null);
        setLoading(false);
      });
  };
  useEffect(load, [id]);

  const runMatch = async () => {
    setActing(true);
    const res = await fetch(`/api/procurement/invoices/${id}/match`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setMatchResult(data.data);
      if (data.data.matched) toast.success('3-Way Match passed — invoice marked as MATCHED');
      else toast.warning('Match incomplete — review details below');
      load();
    } else {
      toast.error(data.error || 'Match failed');
    }
    setActing(false);
  };

  const approveInvoice = async () => {
    setActing(true);
    const res = await fetch(`/api/procurement/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    if (res.ok) { toast.success('Invoice approved'); load(); }
    else toast.error('Failed to approve');
    setActing(false);
  };

  const submitPayment = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) return toast.error('Enter a valid amount');
    if (!payForm.paymentDate) return toast.error('Payment date is required');
    setActing(true);
    const res = await fetch('/api/procurement/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payForm,
        vendorInvoiceId: id,
        supplierId: inv?.supplier.id,
      }),
    });
    if (res.ok) {
      toast.success('Payment recorded');
      setShowPayForm(false);
      setPayForm({ amount: '', method: 'Bank Transfer', paymentDate: new Date().toISOString().split('T')[0], reference: '', notes: '' });
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to record payment');
    }
    setActing(false);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const inp = 'w-full h-9 px-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

  if (loading) return <div className="py-16 text-center text-muted-foreground text-[13px]">Loading...</div>;
  if (!inv) return <div className="py-16 text-center text-muted-foreground">Invoice not found</div>;

  const balance = inv.total - inv.paidAmount;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/procurement/invoices`} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono">{inv.ourRef}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                {inv.status}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {inv.supplier.name} — PO:{' '}
              <Link href={`/${locale}/purchase-orders/${inv.purchaseOrder.id}`} className="text-primary hover:underline">
                {inv.purchaseOrder.poNumber}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {['RECEIVED', 'MATCHED'].includes(inv.status) && (
            <Button size="sm" variant="outline" onClick={runMatch} disabled={acting}>
              Run 3-Way Match
            </Button>
          )}
          {inv.status === 'MATCHED' && (
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={approveInvoice} disabled={acting}>
              Approve Invoice
            </Button>
          )}
          {['APPROVED', 'MATCHED'].includes(inv.status) && balance > 0 && (
            <Button size="sm" onClick={() => setShowPayForm(v => !v)} disabled={acting}>
              <CreditCard className="size-4 mr-1.5" /> Add Payment
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: `AED ${fmt(inv.total)}`, color: 'text-foreground' },
          { label: 'Paid', value: `AED ${fmt(inv.paidAmount)}`, color: 'text-green-600' },
          { label: 'Balance', value: `AED ${fmt(balance)}`, color: balance > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Due Date', value: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-AE') : '—', color: 'text-foreground' },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className={`text-[18px] font-bold mt-0.5 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Details</h2>
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Vendor Invoice No</dt><dd className="font-medium">{inv.vendorInvoiceNo || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Invoice Date</dt><dd className="font-medium">{new Date(inv.invoiceDate).toLocaleDateString('en-AE')}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Created by</dt><dd className="font-medium">{inv.createdBy.fullName}</dd></div>
            {inv.matchedAt && <div className="flex justify-between"><dt className="text-muted-foreground">Matched at</dt><dd className="font-medium">{new Date(inv.matchedAt).toLocaleDateString('en-AE')}</dd></div>}
            {inv.approvedAt && <div className="flex justify-between"><dt className="text-muted-foreground">Approved at</dt><dd className="font-medium">{new Date(inv.approvedAt).toLocaleDateString('en-AE')}</dd></div>}
          </dl>
          {inv.supplier.bankName && (
            <div className="pt-2 border-t border-border space-y-1">
              <p className="text-[12px] text-muted-foreground font-medium">Bank Details</p>
              <p className="text-[13px]">{inv.supplier.bankName}</p>
              {inv.supplier.iban && <p className="text-[13px] font-mono">{inv.supplier.iban}</p>}
            </div>
          )}
        </div>

        {/* GRN Links */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Goods Receipts</h2>
          {inv.purchaseOrder.goodsReceipts.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No goods receipts recorded</p>
          ) : (
            <div className="space-y-1.5">
              {inv.purchaseOrder.goodsReceipts.map(grn => (
                <Link key={grn.id} href={`/${locale}/procurement/receipts/${grn.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:border-primary/40 transition-colors text-[13px]">
                  <span className="font-mono font-semibold">{grn.grnNumber}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{grn.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Payment Form */}
      {showPayForm && (
        <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
          <h2 className="text-[13px] font-semibold">Record Payment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Amount (AED) *</label>
              <input
                className={inp}
                type="number"
                value={payForm.amount}
                onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                placeholder={`Max: ${fmt(balance)}`}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Payment Date *</label>
              <input
                type="date"
                className={inp}
                value={payForm.paymentDate}
                onChange={e => setPayForm(p => ({ ...p, paymentDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Method</label>
              <select
                className={`${inp} cursor-pointer`}
                value={payForm.method}
                onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
              >
                {['Bank Transfer', 'Cheque', 'Cash', 'Online'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Reference</label>
              <input
                className={inp}
                value={payForm.reference}
                onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))}
                placeholder="Transaction ref / cheque no."
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowPayForm(false)}>Cancel</Button>
            <Button size="sm" onClick={submitPayment} disabled={acting}>
              {acting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      )}

      {/* Invoice Items */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[14px] font-semibold">Invoice Lines</h2>
        </div>
        <table className="w-full text-[13px]">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              {['#', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {inv.items.map((item, i) => (
              <tr key={item.id} className="hover:bg-muted/10">
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5">{item.description}</td>
                <td className="px-4 py-2.5">{item.quantity}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{item.unit || '—'}</td>
                <td className="px-4 py-2.5">AED {fmt(item.unitPrice)}</td>
                <td className="px-4 py-2.5 font-medium">AED {fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-muted/10">
            <tr>
              <td colSpan={5} className="px-4 py-2.5 text-right text-[12px] text-muted-foreground">Subtotal</td>
              <td className="px-4 py-2.5 font-medium">AED {fmt(inv.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-2.5 text-right text-[12px] text-muted-foreground">VAT ({inv.taxPercent}%)</td>
              <td className="px-4 py-2.5 font-medium">AED {fmt(inv.taxAmount)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-2.5 text-right text-[13px] font-semibold">Total</td>
              <td className="px-4 py-2.5 font-bold">AED {fmt(inv.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 3-Way Match Panel */}
      {matchResult && (
        <div className={`rounded-xl border p-5 space-y-4 ${matchResult.matched ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
          <div className="flex items-center gap-2">
            {matchResult.matched
              ? <CheckCircle className="size-5 text-green-600" />
              : <AlertTriangle className="size-5 text-yellow-600" />}
            <h2 className={`text-[14px] font-semibold ${matchResult.matched ? 'text-green-800' : 'text-yellow-800'}`}>
              3-Way Match: {matchResult.matched ? 'PASSED' : 'FAILED'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['Item', 'PO Qty', 'Invoice Qty', 'Received Qty', 'PO Price', 'Invoice Price', 'Qty', 'Price', 'Receipt'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matchResult.details.map((d, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-3 py-2 max-w-[120px] truncate" title={d.description}>{d.description}</td>
                    <td className="px-3 py-2">{d.poQty ?? '—'}</td>
                    <td className="px-3 py-2">{d.invoiceQty}</td>
                    <td className="px-3 py-2">{d.receivedQty}</td>
                    <td className="px-3 py-2">{d.poPrice != null ? fmt(d.poPrice) : '—'}</td>
                    <td className="px-3 py-2">{fmt(d.invoicePrice)}</td>
                    <td className="px-3 py-2">{d.qtyMatch ? <CheckCircle className="size-4 text-green-600" /> : <XCircle className="size-4 text-red-600" />}</td>
                    <td className="px-3 py-2">{d.priceMatch ? <CheckCircle className="size-4 text-green-600" /> : <XCircle className="size-4 text-red-600" />}</td>
                    <td className="px-3 py-2">{d.receivedMatch ? <CheckCircle className="size-4 text-green-600" /> : <XCircle className="size-4 text-red-600" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History */}
      {inv.payments.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-[14px] font-semibold">Payment History</h2>
          </div>
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {['Date', 'Amount', 'Method', 'Reference', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inv.payments.map(pay => (
                <tr key={pay.id} className="hover:bg-muted/10">
                  <td className="px-4 py-2.5">{new Date(pay.paymentDate).toLocaleDateString('en-AE')}</td>
                  <td className="px-4 py-2.5 font-medium text-green-700">AED {fmt(pay.amount)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{pay.method}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{pay.reference || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                      {pay.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
