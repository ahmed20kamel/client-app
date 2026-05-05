'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Receipt, ArrowLeft, Trash2, AlertCircle, User, Calendar, Hash,
  Phone, Building2, FileText, Package, Printer, Package2, Plus, DollarSign,
  CheckCircle2, Clock, XCircle, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { fmtAmount, formatDate } from '@/lib/utils';
import { AttachmentsPanel } from '@/components/AttachmentsPanel';

interface TaxInvoiceItem {
  id: string; description: string; quantity: number; length: number | null;
  linearMeters: number | null; size: string | null; unit: string | null;
  unitPrice: number; total: number;
}
interface DeliveryNoteRef { id: string; dnNumber: string; status: string; createdAt: string; }
interface Payment {
  id: string; amount: number; method: string; paymentDate: string;
  reference: string | null; notes: string | null; status: string;
  createdBy: { fullName: string };
}
interface TaxInvoice {
  id: string; invoiceNumber: string; status: string;
  engineerName: string | null; mobileNumber: string | null; projectName: string | null;
  customerTrn: string | null; ourVatReg: string | null; dnNumber: string | null;
  lpoNumber: string | null; paymentTerms: string | null;
  subtotal: number; discount: number; taxPercent: number; taxAmount: number; deliveryCharges: number;
  total: number; paidAmount: number;
  notes: string | null; terms: string | null;
  createdAt: string;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string; trn: string | null } | null;
  engineer: { id: string; name: string; mobile: string | null } | null;
  quotation: {
    id: string; quotationNumber: string;
    paymentType: string | null; depositPercent: number | null;
    depositAmount: number | null; paymentNotes: string | null; confirmedAt: string | null;
  } | null;
  items: TaxInvoiceItem[];
  deliveryNotes?: DeliveryNoteRef[];
  payments: Payment[];
}

// Derive the correct status automatically from payment data
function deriveStatus(invoice: TaxInvoice): string {
  const paid = invoice.paidAmount || 0;
  if (invoice.status === 'CANCELLED') return 'CANCELLED';
  if (invoice.status === 'DRAFT') return 'DRAFT';
  if (paid <= 0) return invoice.status === 'SENT' ? 'SENT' : 'UNPAID';
  if (paid >= invoice.total - 0.01) return 'PAID';
  return 'PARTIAL';
}

const STATUS_ICON: Record<string, React.ElementType> = {
  DRAFT: Clock, SENT: TrendingUp, UNPAID: AlertTriangle,
  PARTIAL: Clock, PAID: CheckCircle2, CANCELLED: XCircle,
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SENT: 'Sent', UNPAID: 'Unpaid',
  PARTIAL: 'Partially Paid', PAID: 'Paid', CANCELLED: 'Cancelled',
};

export default function TaxInvoiceDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [invoice, setInvoice] = useState<TaxInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '', method: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '', notes: '',
  });

  const fetchInvoice = () => {
    setLoading(true);
    fetch(`/api/tax-invoices/${id}`)
      .then(r => r.json())
      .then(({ data }) => setInvoice(data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInvoice(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/tax-invoices/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success(t('messages.deleteSuccess', { entity: t('taxInvoices.title') }));
      router.push(`/${locale}/tax-invoices`);
    } else {
      toast.error(t('common.error'));
      setDeleting(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(newPayment.amount);
    if (!amount || amount <= 0) { toast.error(t('payments.amountRequired')); return; }
    const remaining = (invoice?.total ?? 0) - (invoice?.paidAmount ?? 0);
    if (amount > remaining + 0.01) {
      toast.error(`Amount exceeds remaining balance of ${remaining.toFixed(2)} AED`);
      return;
    }
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/tax-invoices/${id}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPayment, amount, status: 'CONFIRMED' }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setShowPaymentModal(false);
      setNewPayment({ amount: '', method: 'Cash', paymentDate: new Date().toISOString().split('T')[0], reference: '', notes: '' });
      fetchInvoice();
      toast.success(t('messages.createSuccess', { entity: t('taxInvoices.payments') }));
    } catch (e) { toast.error(e instanceof Error ? e.message : t('common.error')); }
    finally { setPaymentLoading(false); }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const res = await fetch(`/api/tax-invoices/${id}/payments/${paymentId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchInvoice();
      toast.success(t('messages.deleteSuccess', { entity: t('taxInvoices.payments') }));
    } else toast.error(t('common.error'));
  };

  const fmt = (n: number) => fmtAmount(n, locale);

  if (loading) return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <DetailSkeleton />
      </div>
    </div>
  );

  if (!invoice) return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      </div>
    </div>
  );

  const paid = invoice.paidAmount || 0;
  const remaining = invoice.total - paid;
  const paidPercent = invoice.total > 0 ? Math.min(100, (paid / invoice.total) * 100) : 0;
  const derivedStatus = deriveStatus(invoice);

  const STATUS_STYLE: Record<string, { bg: string; border: string; color: string; label_en: string }> = {
    UNPAID:           { bg: 'bg-red-50',     border: 'border-red-200',    color: 'text-red-600',    label_en: 'Unpaid' },
    PARTIAL:          { bg: 'bg-amber-50',   border: 'border-amber-200',  color: 'text-amber-600',  label_en: 'Partially Paid' },
    PAID:             { bg: 'bg-emerald-50', border: 'border-emerald-200',color: 'text-emerald-600',label_en: 'Paid' },
    OVERPAID:         { bg: 'bg-blue-50',    border: 'border-blue-200',   color: 'text-blue-600',   label_en: 'Overpaid' },
    CANCELLED:        { bg: 'bg-gray-50',    border: 'border-gray-200',   color: 'text-gray-500',   label_en: 'Cancelled' },
  };
  const statusCfg = STATUS_STYLE[derivedStatus] ?? STATUS_STYLE['UNPAID'];


  const PAYMENT_TYPE_LABELS: Record<string, string> = {
    DEPOSIT: 'Deposit',
    PARTIAL: 'Partial Payment',
    FULL_ADVANCE: 'Full Advance',
    FULL_ON_DELIVERY: 'Full on Delivery',
  };

  const DN_STATUS_LABELS: Record<string, string> = {
    DRAFT: t('deliveryNotes.statusDraft'),
    DELIVERED: t('deliveryNotes.statusDelivered'),
    RETURNED: t('deliveryNotes.statusReturned'),
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><Icon className="size-4 text-muted-foreground" /></div>
        <div><p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p><p className="text-sm font-bold">{value}</p></div>
      </div>
    );
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/tax-invoices`)}>
              <ArrowLeft className="size-4 rtl:-scale-x-100" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
                {/* Auto-derived status badge */}
                <StatusBadge status={derivedStatus} label={STATUS_LABEL[derivedStatus] ?? derivedStatus} />
              </div>
              {invoice.projectName && <p className="text-muted-foreground mt-0.5 text-sm">{invoice.projectName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => window.open(`/${locale}/tax-invoices/${id}/print`, '_blank')}>
              <Printer className="size-4 me-1" />{t('common.export')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={deleting}>
                  <Trash2 className="size-4 me-1" />{t('common.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="p-5 space-y-6">

          {/* ── Payment Status Dashboard ─────────────────────────────────── */}
          <div className={`rounded-xl border p-5 ${statusCfg.bg} ${statusCfg.border}`}>
            {/* Top row: 3 numbers */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t('quotations.total')}</p>
                <p className="text-xl font-extrabold">{fmt(invoice.total)}</p>
                <p className="text-[10px] text-muted-foreground">AED</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t('taxInvoices.paidAmount')}</p>
                <p className={`text-xl font-extrabold ${paid > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{fmt(paid)}</p>
                <p className="text-[10px] text-muted-foreground">AED</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t('taxInvoices.remaining')}</p>
                <p className={`text-xl font-extrabold ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(remaining)}</p>
                <p className="text-[10px] text-muted-foreground">AED</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-black/10 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  paidPercent >= 100 ? 'bg-emerald-500' :
                  paidPercent > 0 ? 'bg-amber-500' : 'bg-red-400'
                }`}
                style={{ width: `${paidPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">{paidPercent.toFixed(0)}% {t('taxInvoices.paidAmount')}</span>
              <span className={`text-[10px] font-bold ${statusCfg.color}`}>{statusCfg.label_en}</span>
            </div>
          </div>

          {/* ── Finance Confirmation Banner ──────────────────────────────── */}
          {invoice.quotation?.confirmedAt && invoice.quotation.paymentType && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-500/30 p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="size-4 text-amber-600" />
                <p className="text-sm font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                  {t('quotations.financeConfirmation')}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-white/80 dark:bg-black/20 rounded-lg p-3 border border-amber-200/60">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">{t('quotations.paymentType')}</p>
                  <p className="font-extrabold text-amber-800 dark:text-amber-400">
                    {PAYMENT_TYPE_LABELS[invoice.quotation.paymentType] ?? invoice.quotation.paymentType.replace(/_/g, ' ')}
                  </p>
                </div>
                {invoice.quotation.depositPercent != null && (
                  <div className="bg-white/80 dark:bg-black/20 rounded-lg p-3 border border-amber-200/60">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">{t('quotations.depositDue')}</p>
                    <p className="font-extrabold text-amber-700">{invoice.quotation.depositPercent}%</p>
                  </div>
                )}
                {invoice.quotation.depositAmount != null && (
                  <div className="bg-amber-100/80 dark:bg-amber-900/30 rounded-lg p-3 border border-amber-300/60">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Amount Due Now</p>
                    <p className="font-extrabold text-amber-700">{fmt(invoice.quotation.depositAmount)} AED</p>
                  </div>
                )}
                {invoice.quotation.depositAmount != null && (
                  <div className="bg-white/80 dark:bg-black/20 rounded-lg p-3 border border-amber-200/60">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">{t('quotations.remainingAfterDeposit')}</p>
                    <p className="font-extrabold">{fmt(invoice.total - invoice.quotation.depositAmount)} AED</p>
                  </div>
                )}
              </div>
              {invoice.quotation.paymentNotes && (
                <p className="mt-3 text-xs text-amber-800/80 dark:text-amber-300 italic">{invoice.quotation.paymentNotes}</p>
              )}
            </div>
          )}

          {/* ── Invoice Details ──────────────────────────────────────────── */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold mb-5 flex items-center gap-2">
                <Receipt className="size-4 text-primary" />{t('taxInvoices.details')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <InfoRow icon={Hash} label={t('taxInvoices.invoiceNumber')} value={invoice.invoiceNumber} />
                {invoice.client ? (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><Building2 className="size-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t('clients.companyName')}</p>
                      <p className="text-sm font-bold">{invoice.client.companyName}</p>
                      {invoice.client.trn && <p className="text-xs text-muted-foreground">TRN: {invoice.client.trn}</p>}
                    </div>
                  </div>
                ) : invoice.customer ? (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><User className="size-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t('quotations.customer')}</p>
                      <Link href={`/${locale}/customers/${invoice.customer.id}`} className="text-sm font-bold text-primary hover:underline">{invoice.customer.fullName}</Link>
                    </div>
                  </div>
                ) : null}
                <InfoRow icon={User} label={t('quotations.engineerName')} value={invoice.engineer?.name || invoice.engineerName} />
                <InfoRow icon={Phone} label={t('quotations.mobileNumber')} value={invoice.engineer?.mobile || invoice.mobileNumber} />
                <InfoRow icon={Building2} label={t('quotations.projectName')} value={invoice.projectName} />
                <InfoRow icon={Hash} label={t('taxInvoices.customerTrn')} value={invoice.customerTrn} />
                <InfoRow icon={Hash} label={t('taxInvoices.ourVatReg')} value={invoice.ourVatReg} />
                <InfoRow icon={FileText} label={t('quotations.lpoNumber')} value={invoice.lpoNumber} />
                <InfoRow icon={FileText} label={t('quotations.paymentTerms')} value={invoice.paymentTerms} />
                <InfoRow icon={FileText} label={t('taxInvoices.dnNumber')} value={invoice.dnNumber} />
                <InfoRow icon={Calendar} label={t('common.date')} value={formatDate(invoice.createdAt, locale)} />
                {invoice.quotation && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><FileText className="size-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t('taxInvoices.quotationRef')}</p>
                      <Link href={`/${locale}/quotations/${invoice.quotation.id}`} className="text-sm font-bold text-primary hover:underline">{invoice.quotation.quotationNumber}</Link>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Items ───────────────────────────────────────────────────── */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold mb-5 flex items-center gap-2">
                <Package className="size-4 text-primary" />{t('quotations.items')} ({invoice.items.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.description')}</th>
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.size')}</th>
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.unit')}</th>
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.quantity')}</th>
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.totalLM')}</th>
                      <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.unitPrice')}</th>
                      <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.lineTotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-sm font-medium">{item.description}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.size || '—'}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.unit || '—'}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">
                          {item.unit === 'LM' && item.linearMeters ? item.linearMeters.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-3 text-end text-sm text-muted-foreground">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-3 text-end text-sm font-semibold">{fmt(item.total)} AED</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Totals */}
              <div className="mt-6 border-t pt-4 max-w-xs ms-auto space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('quotations.subtotal')}</span>
                  <span className="font-medium">{fmt(invoice.subtotal)} AED</span>
                </div>
                {invoice.deliveryCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('quotations.deliveryCharges')}</span>
                    <span className="font-medium">+{fmt(invoice.deliveryCharges)} AED</span>
                  </div>
                )}
                {invoice.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-600 font-medium">{t('quotations.discount')}</span>
                    <span className="font-medium text-emerald-600">−{fmt(invoice.discount)} AED</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('quotations.tax')} ({invoice.taxPercent}% VAT)</span>
                  <span className="font-medium text-orange-600">+{fmt(invoice.taxAmount)} AED</span>
                </div>
                <div className="flex justify-between text-base font-extrabold border-t pt-3">
                  <span>{t('quotations.total')}</span>
                  <span>{fmt(invoice.total)} AED</span>
                </div>
                {/* Payment summary under totals */}
                {paid > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-600">
                      <span className="font-medium">{t('taxInvoices.paidAmount')}</span>
                      <span className="font-bold">− {fmt(paid)} AED</span>
                    </div>
                    <div className={`flex justify-between font-extrabold text-base border-t pt-2 ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      <span>{t('taxInvoices.remaining')}</span>
                      <span>{fmt(remaining)} AED</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Notes & Terms ────────────────────────────────────────────── */}
          {(invoice.notes || invoice.terms) && (
            <Card className="shadow-premium">
              <CardContent className="pt-6">
                <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2">
                  <FileText className="size-4 text-primary" />{t('quotations.notesAndTerms')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoice.notes && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">{t('common.notes')}</p>
                      <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.terms && (
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">{t('quotations.terms')}</p>
                      <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Payments ─────────────────────────────────────────────────── */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <DollarSign className="size-4 text-primary" />
                  {t('taxInvoices.payments')}
                  {invoice.payments.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-bold">
                      {invoice.payments.length}
                    </span>
                  )}
                </h3>
                {remaining > 0.01 && (
                  <Button size="sm" className="btn-premium" onClick={() => setShowPaymentModal(true)}>
                    <Plus className="size-4 me-1" />{t('taxInvoices.addPayment')}
                  </Button>
                )}
              </div>

              {invoice.payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <DollarSign className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('taxInvoices.noPayments')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-start text-[11px] font-bold text-muted-foreground uppercase tracking-wider">#</th>
                        <th className="px-3 py-2.5 text-start text-[11px] font-bold text-muted-foreground uppercase">{t('taxInvoices.paymentDate')}</th>
                        <th className="px-3 py-2.5 text-start text-[11px] font-bold text-muted-foreground uppercase">{t('taxInvoices.paymentMethod')}</th>
                        <th className="px-3 py-2.5 text-start text-[11px] font-bold text-muted-foreground uppercase">{t('taxInvoices.paymentReference')}</th>
                        <th className="px-3 py-2.5 text-start text-[11px] font-bold text-muted-foreground uppercase">{t('common.notes')}</th>
                        <th className="px-3 py-2.5 text-end text-[11px] font-bold text-muted-foreground uppercase">{t('taxInvoices.paymentAmount')}</th>
                        <th className="px-3 py-2.5 text-center text-[11px] font-bold text-muted-foreground uppercase">{t('common.status')}</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoice.payments.map((p, i) => {
                        const isAutoDeposit = p.reference?.startsWith('Auto:');
                        return (
                        <tr key={p.id} className={`hover:bg-muted/20 transition-colors ${isAutoDeposit ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="px-3 py-3 text-muted-foreground">{formatDate(p.paymentDate, locale)}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs font-semibold">{p.method}</span>
                          </td>
                          <td className="px-3 py-3 text-xs">
                            {isAutoDeposit ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                {p.reference}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{p.reference || '—'}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs max-w-[120px] truncate">{p.notes || '—'}</td>
                          <td className="px-3 py-3 text-end font-bold text-emerald-600">{fmt(p.amount)} AED</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'CONFIRMED'
                                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-500/10 text-amber-700 border border-amber-200'
                            }`}>
                              {p.status === 'CONFIRMED'
                                ? <><CheckCircle2 className="size-2.5" />{t('taxInvoices.paymentConfirmed')}</>
                                : <><Clock className="size-2.5" />{t('taxInvoices.paymentPending')}</>
                              }
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletePayment(p.id)} className="bg-destructive text-white hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    {/* Payments total footer */}
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td colSpan={5} className="px-4 py-3 text-sm font-bold text-end">{t('taxInvoices.paidAmount')}</td>
                        <td className="px-3 py-3 text-end font-extrabold text-emerald-600">{fmt(paid)} AED</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Linked Delivery Notes ────────────────────────────────────── */}
          {(invoice.deliveryNotes?.length ?? 0) > 0 && (
            <Card className="shadow-premium">
              <CardContent className="pt-6">
                <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2">
                  <Package2 className="size-4 text-primary" />{t('taxInvoices.deliveryNotes')}
                </h3>
                <div className="space-y-2">
                  {invoice.deliveryNotes!.map((dn) => (
                    <Link key={dn.id} href={`/${locale}/delivery-notes/${dn.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/20 transition-colors group">
                      <div className="flex items-center gap-2">
                        <Package2 className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-bold text-primary">{dn.dnNumber}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{formatDate(dn.createdAt, locale)}</span>
                        <StatusBadge status={dn.status} label={DN_STATUS_LABELS[dn.status] || dn.status} size="sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {invoice && (
            <Card className="shadow-premium">
              <CardContent className="p-5">
                <AttachmentsPanel entityType="tax-invoice" entityId={invoice.id} />
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* ── Add Payment Modal ─────────────────────────────────────────────── */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />{t('taxInvoices.addPayment')}
            </DialogTitle>
          </DialogHeader>

          {/* Remaining balance info */}
          <div className="rounded-lg bg-muted/40 border border-border p-3 grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="text-muted-foreground">{t('quotations.total')}</p>
              <p className="font-bold">{fmt(invoice.total)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('taxInvoices.paidAmount')}</p>
              <p className="font-bold text-emerald-600">{fmt(paid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('taxInvoices.remaining')}</p>
              <p className="font-bold text-red-600">{fmt(remaining)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">
                {t('taxInvoices.paymentAmount')} (AED) *
              </label>
              <Input type="number" min="0.01" step="0.01" value={newPayment.amount}
                onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                placeholder={`Max: ${fmt(remaining)}`} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('taxInvoices.paymentMethod')}</label>
              <Select value={newPayment.method} onValueChange={v => setNewPayment(p => ({ ...p, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">{t('taxInvoices.cash')}</SelectItem>
                  <SelectItem value="Cheque">{t('taxInvoices.cheque')}</SelectItem>
                  <SelectItem value="Bank Transfer">{t('taxInvoices.bankTransfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('taxInvoices.paymentDate')}</label>
              <Input type="date" value={newPayment.paymentDate}
                onChange={e => setNewPayment(p => ({ ...p, paymentDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('taxInvoices.paymentReference')}</label>
              <Input value={newPayment.reference}
                onChange={e => setNewPayment(p => ({ ...p, reference: e.target.value }))}
                placeholder="Cheque # / Transfer ref" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('common.notes')}</label>
              <Input value={newPayment.notes}
                onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddPayment} disabled={paymentLoading} className="btn-premium">
              {paymentLoading ? <span className="size-4 me-2 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : <Plus className="size-4 me-1" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
