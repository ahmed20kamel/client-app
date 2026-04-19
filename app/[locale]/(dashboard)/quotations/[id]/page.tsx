'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Pencil, Trash2, AlertCircle, Send, CheckCircle,
  Receipt, Package, Printer, Upload, Banknote, FileText, Building2, User,
  Phone, MapPin, CalendarDays, Hash, CreditCard, TrendingUp, ChevronRight,
  Clock, CheckCircle2, RotateCcw, ThumbsUp, ThumbsDown, ClipboardList,
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { fmtAmount, formatDate } from '@/lib/utils';
import { AttachmentsPanel } from '@/components/AttachmentsPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  length: number | null;
  linearMeters: number | null;
  size: string | null;
  unit: string | null;
  unitPrice: number;
  discount: number;
  total: number;
  product: { id: string; name: string } | null;
}

interface LinkedDoc {
  id: string;
  invoiceNumber?: string;
  dnNumber?: string;
  status: string;
  createdAt: string;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  engineerName: string | null;
  mobileNumber: string | null;
  projectName: string | null;
  status: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  deliveryCharges: number;
  total: number;
  lpoNumber: string | null;
  paymentTerms: string | null;
  // timeline
  createdAt: string;
  sentAt: string | null;
  clientApprovedAt: string | null;
  clientRejectedAt: string | null;
  confirmedAt: string | null;
  // people
  clientNotes: string | null;
  rejectionReason: string | null;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string; trn: string | null } | null;
  engineer: { id: string; name: string; mobile: string | null } | null;
  createdBy: { id: string; fullName: string } | null;
  confirmedBy: { id: string; fullName: string } | null;
  clientApprovedBy: { id: string; fullName: string } | null;
  items: QuotationItem[];
  taxInvoices?: LinkedDoc[];
  deliveryNotes?: LinkedDoc[];
  workOrders?: LinkedDoc[];
  // finance
  paymentType: string | null;
  depositPercent: number | null;
  depositAmount: number | null;
  paymentProofUrl: string | null;
  paymentNotes: string | null;
}

// ── Workflow steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'DRAFT',           labelKey: 'quotations.statusDraft',          icon: FileText },
  { key: 'SENT',            labelKey: 'quotations.statusSent',           icon: Send },
  { key: 'CLIENT_APPROVED', labelKey: 'quotations.statusClientApproved', icon: ThumbsUp },
  { key: 'CONFIRMED',       labelKey: 'quotations.statusConfirmed',      icon: CheckCircle2 },
  { key: 'WORK_ORDER',      labelKey: 'quotations.stepWorkOrder',        icon: ClipboardList },
  { key: 'INVOICED',        labelKey: 'quotations.stepInvoiced',         icon: Receipt },
  { key: 'CONVERTED',       labelKey: 'quotations.stepDelivered',        icon: TrendingUp },
] as const;

type StepKey = typeof STEPS[number]['key'];

function activeIndex(status: string, hasWorkOrders: boolean, hasTaxInvoices: boolean, hasDeliveryNotes: boolean): number {
  const s = status === 'APPROVED' ? 'CLIENT_APPROVED' : status;
  if (s === 'CONVERTED') return 6;
  if (s === 'CONFIRMED') {
    if (hasDeliveryNotes) return 6;
    if (hasTaxInvoices) return 5;
    if (hasWorkOrders) return 4;
    return 3;
  }
  const idx = STEPS.findIndex((st) => st.key === s);
  return idx === -1 ? 0 : idx;
}

function WorkflowStepper({ status, hasWorkOrders, hasTaxInvoices, hasDeliveryNotes }: {
  status: string; hasWorkOrders: boolean; hasTaxInvoices: boolean; hasDeliveryNotes: boolean;
}) {
  const t = useTranslations();
  const isRejected = status === 'CLIENT_REJECTED';
  const current = activeIndex(status, hasWorkOrders, hasTaxInvoices, hasDeliveryNotes);

  return (
    <div className={`px-6 py-4 border-b border-border ${isRejected ? 'bg-destructive/5' : 'bg-muted/20'}`}>
      {isRejected ? (
        <div className="flex items-center gap-2 text-destructive">
          <ThumbsDown className="size-4" />
          <span className="text-sm font-semibold">{t('quotations.clientDeclinedRevise')}</span>
        </div>
      ) : (
        <div className="flex items-center">
          {STEPS.map((step, idx) => {
            const done   = idx < current;
            const active = idx === current;
            const Icon   = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={[
                    'size-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0',
                    done   ? 'bg-emerald-600 border-emerald-600 text-white' : '',
                    active ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30' : '',
                    !done && !active ? 'bg-background border-border text-muted-foreground' : '',
                  ].join(' ')}>
                    {done ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
                  </div>
                  <span className={[
                    'text-[10px] font-semibold whitespace-nowrap hidden sm:block',
                    active ? 'text-primary' : done ? 'text-emerald-600' : 'text-muted-foreground/60',
                  ].join(' ')}>
                    {t(step.labelKey as Parameters<typeof t>[0])}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 mb-5 rounded-full ${done ? 'bg-emerald-500' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function QuotationDetailsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ── Dialog: Client Approve ────────────────────────────────────────────────
  const [showClientApproveDialog, setShowClientApproveDialog] = useState(false);
  const [caLpoNumber, setCaLpoNumber] = useState('');
  const [caClientNotes, setCaClientNotes] = useState('');

  // ── Dialog: Client Reject ─────────────────────────────────────────────────
  const [showClientRejectDialog, setShowClientRejectDialog] = useState(false);
  const [crClientNotes, setCrClientNotes] = useState('');

  // ── Dialog: Finance Confirm ───────────────────────────────────────────────
  const [showFinanceDialog, setShowFinanceDialog] = useState(false);
  const [fcPaymentTerms, setFcPaymentTerms] = useState<'Cash' | 'Cheque' | 'Bank Transfer' | 'Cash / Cheque / Bank Transfer'>('Cash');
  const [fcPaymentType, setFcPaymentType] = useState<'DEPOSIT' | 'PARTIAL' | 'FULL_ADVANCE' | 'FULL_ON_DELIVERY'>('FULL_ON_DELIVERY');
  const [fcDepositPercent, setFcDepositPercent] = useState('');
  const [fcDepositAmount, setFcDepositAmount] = useState('');
  const [fcPaymentProofUrl, setFcPaymentProofUrl] = useState('');
  const [fcPaymentNotes, setFcPaymentNotes] = useState('');
  const [fcUploading, setFcUploading] = useState(false);

  const PAYMENT_TYPE_LABELS: Record<string, string> = {
    DEPOSIT: t('quotations.paymentTypeDeposit'),
    PARTIAL: t('quotations.paymentTypePartial'),
    FULL_ADVANCE: t('quotations.paymentTypeFullAdvance'),
    FULL_ON_DELIVERY: t('quotations.paymentTypeFullOnDelivery'),
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then(() => setIsAdmin(true)) // all authenticated users can perform actions
      .catch(() => {});

    fetch(`/api/quotations/${id}`)
      .then(async (res) => {
        if (!res.ok) { toast.error(t('common.error')); router.push(`/${locale}/quotations`); return; }
        const { data } = await res.json();
        setQuotation(data);
      })
      .catch(() => { toast.error(t('common.error')); router.push(`/${locale}/quotations`); })
      .finally(() => setLoading(false));
  }, [id, t, router, locale]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const patch = async (body: Record<string, unknown>): Promise<boolean> => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setQuotation((await res.json()).data);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const fmt = (n: number) => fmtAmount(n, locale);

  const cleanDesc = (desc: string, size: string | null) => {
    if (!size) return desc;
    const suffix = ` ${size}`;
    return desc.endsWith(suffix) ? desc.slice(0, -suffix.length) : desc;
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const ok = await patch({ action: 'send' });
    if (ok) toast.success(t('quotations.sentToClient'));
  };

  const handleClientApprove = async () => {
    if (!caLpoNumber.trim()) { toast.error(t('quotations.lpoRequired')); return; }
    const ok = await patch({ action: 'client_approve', lpoNumber: caLpoNumber.trim(), clientNotes: caClientNotes || null });
    if (ok) {
      toast.success(t('quotations.clientApprovalRecorded'));
      setShowClientApproveDialog(false);
      setCaLpoNumber(''); setCaClientNotes('');
    }
  };

  const handleClientReject = async () => {
    const ok = await patch({ action: 'client_reject', clientNotes: crClientNotes || null });
    if (ok) {
      toast.success(t('quotations.clientRejectionRecorded'));
      setShowClientRejectDialog(false);
      setCrClientNotes('');
    }
  };

  const handleRevertToDraft = async () => {
    const ok = await patch({ action: 'revert_to_draft' });
    if (ok) toast.success(t('quotations.revertedToDraft'));
  };

  const handleFinanceConfirm = async () => {
    if (!fcPaymentTerms) { toast.error(t('quotations.paymentTermsRequired')); return; }
    if (!fcPaymentType) { toast.error(t('quotations.paymentTypeRequired')); return; }

    const pct = fcDepositPercent ? parseFloat(fcDepositPercent) : null;
    const calcAmt = pct && quotation
      ? Math.round(quotation.total * pct / 100 * 100) / 100
      : (fcDepositAmount ? parseFloat(fcDepositAmount) : null);

    if ((fcPaymentType === 'DEPOSIT' || fcPaymentType === 'PARTIAL')) {
      if (!pct && !calcAmt) { toast.error(t('quotations.depositRequired')); return; }
      if (pct !== null && (pct <= 0 || pct > 100)) { toast.error(t('quotations.depositPercentRange')); return; }
      if (calcAmt !== null && quotation && calcAmt >= quotation.total) {
        toast.error(t('quotations.depositLessThanTotal')); return;
      }
    }

    const body: Record<string, unknown> = {
      action: 'finance_confirm',
      paymentTerms: fcPaymentTerms,
      paymentType: fcPaymentType,
      paymentProofUrl: fcPaymentProofUrl || null,
      paymentNotes: fcPaymentNotes || null,
    };

    if (fcPaymentType === 'DEPOSIT' || fcPaymentType === 'PARTIAL') {
      body.depositPercent = pct;
      body.depositAmount = calcAmt;
    } else if (fcPaymentType === 'FULL_ADVANCE' && quotation) {
      // Full advance = entire invoice total is due upfront
      body.depositPercent = 100;
      body.depositAmount = quotation.total;
    }

    const ok = await patch(body);
    if (ok) {
      toast.success(t('quotations.financeConfirmationSaved'));
      setShowFinanceDialog(false);
      setFcDepositPercent(''); setFcDepositAmount('');
      setFcPaymentProofUrl(''); setFcPaymentNotes('');
    }
  };

  const handleUploadProof = async (file: File) => {
    setFcUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      setFcPaymentProofUrl((await res.json()).url);
      toast.success('File uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setFcUploading(false); }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success(t('messages.deleteSuccess', { entity: t('quotations.title') }));
      router.push(`/${locale}/quotations`);
    } else {
      toast.error((await res.json().catch(() => ({}))).error || t('common.error'));
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <DetailSkeleton />
      </div>
    </div>
  );

  if (!quotation) return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      </div>
    </div>
  );

  const STATUS_LABELS: Record<string, string> = {
    DRAFT:            t('quotations.statusDraft'),
    SENT:             t('quotations.statusSent'),
    CLIENT_APPROVED:  t('quotations.statusClientApproved'),
    CLIENT_REJECTED:  t('quotations.statusClientRejected'),
    APPROVED:         t('quotations.statusClientApproved'),
    CONFIRMED:        t('quotations.statusConfirmed'),
    EXPIRED:          t('quotations.statusExpired'),
    CONVERTED:        t('quotations.statusConverted'),
  };

  const hasTaxInvoices  = (quotation.taxInvoices?.length ?? 0) > 0;
  const hasDeliveryNotes = (quotation.deliveryNotes?.length ?? 0) > 0;
  const hasWorkOrders   = (quotation.workOrders?.length ?? 0) > 0;

  // ── Timeline events ───────────────────────────────────────────────────────
  const timelineEvents = [
    { label: t('quotations.timelineCreated'), date: quotation.createdAt, by: quotation.createdBy?.fullName, color: 'bg-muted-foreground' },
    quotation.sentAt      && { label: t('quotations.timelineSentToClient'), date: quotation.sentAt, color: 'bg-blue-500' },
    quotation.clientApprovedAt && { label: t('quotations.timelineClientApproved'), date: quotation.clientApprovedAt, by: quotation.clientApprovedBy?.fullName, color: 'bg-emerald-500' },
    quotation.clientRejectedAt && { label: t('quotations.timelineClientRejected'), date: quotation.clientRejectedAt, color: 'bg-destructive' },
    quotation.confirmedAt && { label: t('quotations.timelineFinanceConfirmed'), date: quotation.confirmedAt, by: quotation.confirmedBy?.fullName, color: 'bg-amber-500' },
  ].filter(Boolean) as { label: string; date: string; by?: string; color: string }[];

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="size-9 shrink-0"
              onClick={() => router.push(`/${locale}/quotations`)}>
              <ArrowLeft className="size-4 rtl:-scale-x-100" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">{quotation.quotationNumber}</h1>
                <StatusBadge status={quotation.status} label={STATUS_LABELS[quotation.status] || quotation.status} />
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><CalendarDays className="size-3" />{formatDate(quotation.createdAt, locale)}</span>
                {quotation.client?.companyName || quotation.customer?.fullName
                  ? <><span className="text-border">·</span><span className="font-medium text-foreground/70 truncate max-w-[160px]">{quotation.client?.companyName || quotation.customer?.fullName}</span></>
                  : null}
                {quotation.createdBy && <><span className="text-border">·</span><span className="flex items-center gap-1"><User className="size-3" />{quotation.createdBy.fullName}</span></>}
              </div>
            </div>
          </div>

          {/* ── Action Buttons ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Export — always */}
            <Button variant="outline" size="sm" onClick={() => window.open(`/${locale}/quotations/${id}/print`, '_blank')}>
              <Printer className="size-3.5 me-1.5" />{t('common.export')}
            </Button>

            {/* DRAFT: Edit + Send + Delete(admin) */}
            {quotation.status === 'DRAFT' && (
              <>
                <Link href={`/${locale}/quotations/${id}/edit`}>
                  <Button variant="outline" size="sm"><Pencil className="size-3.5 me-1.5" />{t('common.edit')}</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleSend} disabled={actionLoading}>
                  <Send className="size-3.5 me-1.5" />{t('quotations.sendToClient')}
                </Button>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/30">
                        <Trash2 className="size-3.5 me-1.5" />{t('common.delete')}
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
                )}
              </>
            )}

            {/* SENT: Client Approved / Client Rejected — admin only */}
            {quotation.status === 'SENT' && isAdmin && (
              <>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => { setCaLpoNumber(quotation.lpoNumber || `LPO-${quotation.quotationNumber.replace(/^SC-/, '')}`); setShowClientApproveDialog(true); }}
                  disabled={actionLoading}>
                  <ThumbsUp className="size-3.5 me-1.5" />{t('quotations.clientApprovedBtn')}
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/30"
                  onClick={() => setShowClientRejectDialog(true)} disabled={actionLoading}>
                  <ThumbsDown className="size-3.5 me-1.5" />{t('quotations.clientRejectedBtn')}
                </Button>
              </>
            )}

            {/* CLIENT_REJECTED: Revise & Re-send — admin only */}
            {quotation.status === 'CLIENT_REJECTED' && isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={actionLoading}>
                    <RotateCcw className="size-3.5 me-1.5" />{t('quotations.reviseAndResend')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('quotations.revertToDraftTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('quotations.revertToDraftDesc')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevertToDraft}>{t('quotations.revertToDraftBtn')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* CLIENT_APPROVED: Finance Confirm — admin only */}
            {(quotation.status === 'CLIENT_APPROVED' || quotation.status === 'APPROVED') && isAdmin && (
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setShowFinanceDialog(true)} disabled={actionLoading}>
                <Banknote className="size-3.5 me-1.5" />{t('quotations.financeConfirmBtn')}
              </Button>
            )}

            {/* Step 1: CONFIRMED → Create Work Order */}
            {quotation.status === 'CONFIRMED' && !hasWorkOrders && isAdmin && (
              <Button size="sm" variant="outline"
                onClick={() => router.push(`/${locale}/work-orders/new?quotationId=${quotation.id}`)}>
                <ClipboardList className="size-3.5 me-1.5" />{t('quotations.createWorkOrder')}
              </Button>
            )}

            {/* Step 2: has Work Order → Create Tax Invoice */}
            {quotation.status === 'CONFIRMED' && hasWorkOrders && !hasTaxInvoices && isAdmin && (
              <Button size="sm" variant="outline"
                onClick={() => router.push(`/${locale}/tax-invoices/new?quotationId=${quotation.id}`)}>
                <Receipt className="size-3.5 me-1.5" />{t('quotations.createTaxInvoice')}
              </Button>
            )}

            {/* Step 3: has Tax Invoice → Create Delivery Note (last step) */}
            {quotation.status === 'CONFIRMED' && hasTaxInvoices && !hasDeliveryNotes && isAdmin && (
              <Button size="sm" className="btn-premium"
                onClick={() => router.push(`/${locale}/delivery-notes/new?quotationId=${quotation.id}`)}>
                <Package className="size-3.5 me-1.5" />{t('quotations.createDeliveryNote')}
              </Button>
            )}
          </div>
        </div>

        {/* ── Workflow Stepper ────────────────────────────────────────────── */}
        <WorkflowStepper
          status={quotation.status}
          hasWorkOrders={hasWorkOrders}
          hasTaxInvoices={hasTaxInvoices}
          hasDeliveryNotes={hasDeliveryNotes}
        />

        {/* ── Status Banners ──────────────────────────────────────────────── */}
        <div className="px-6 pt-4 space-y-3">

          {/* SENT — waiting */}
          {quotation.status === 'SENT' && (
            <div className="rounded-xl border border-blue-300/50 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-500/30 p-3.5 flex items-center gap-3">
              <Clock className="size-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">{t('quotations.awaitingClientResponse')}</p>
                <p className="text-xs text-blue-600/80">{t('quotations.awaitingClientResponseDesc', { date: quotation.sentAt ? formatDate(quotation.sentAt, locale) : '' })}</p>
              </div>
            </div>
          )}

          {/* CLIENT_REJECTED — reason */}
          {quotation.status === 'CLIENT_REJECTED' && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
              <ThumbsDown className="size-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-destructive">{t('quotations.clientDeclined')}</p>
                {(quotation.clientNotes || quotation.rejectionReason) && (
                  <p className="text-sm text-muted-foreground mt-1">{quotation.clientNotes || quotation.rejectionReason}</p>
                )}
                {quotation.clientRejectedAt && (
                  <p className="text-xs text-muted-foreground/70 mt-1">{formatDate(quotation.clientRejectedAt, locale)}</p>
                )}
              </div>
            </div>
          )}

          {/* CLIENT_APPROVED — waiting for finance */}
          {(quotation.status === 'CLIENT_APPROVED' || quotation.status === 'APPROVED') && !quotation.confirmedAt && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-500/30 p-3.5 flex items-center gap-3">
              <ThumbsUp className="size-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t('quotations.clientApprovedAwaitingFinance')}</p>
                <p className="text-xs text-emerald-600/80">{t('quotations.clientApprovedAwaitingFinanceDesc', { lpo: quotation.lpoNumber ?? '' })}</p>
              </div>
            </div>
          )}

        </div>

        {/* ── Main Layout ─────────────────────────────────────────────────── */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — 2/3 */}
          <div className="lg:col-span-2 space-y-5">

            {/* Items Table */}
            <Card className="shadow-sm border-border/60 overflow-hidden">
              {/* Header row with summary pills */}
              <div className="px-5 py-3.5 border-b border-border/60 flex items-center gap-2 bg-muted/10">
                <Package className="size-4 text-muted-foreground" />
                <span className="text-sm font-bold">{t('quotations.items')}</span>
                <span className="ms-auto flex items-center gap-2">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {quotation.items.length} {t('quotations.items')}
                  </span>
                  {(() => {
                    const totalPcs = quotation.items.reduce((s, it) => s + it.quantity, 0);
                    const totalLM  = quotation.items.reduce((s, it) => s + (it.linearMeters ?? 0), 0);
                    return (
                      <>
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold tabular-nums">
                          {totalPcs} pcs
                        </span>
                        {totalLM > 0 && (
                          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold tabular-nums">
                            {totalLM.toFixed(2)} m
                          </span>
                        )}
                      </>
                    );
                  })()}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/40">
                      {[
                        { label: t('quotations.description'), align: 'text-start ps-4' },
                        { label: 'L/PC (m)',                  align: 'text-center' },
                        { label: t('quotations.unit'),        align: 'text-center' },
                        { label: t('quotations.qty'),         align: 'text-center' },
                        { label: t('quotations.tableLM'),     align: 'text-center' },
                        { label: t('quotations.unitPrice'),   align: 'text-center' },
                        { label: t('quotations.total'),       align: 'text-end pe-4' },
                      ].map(({ label, align }) => (
                        <th key={label} className={`px-3 py-2.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider ${align}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {quotation.items.map((item, i) => (
                      <tr key={item.id} className={i % 2 === 1 ? 'bg-muted/5' : ''}>
                        <td className="ps-4 pe-3 py-2.5 font-medium">{cleanDesc(item.description, item.size)}</td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground">
                          {item.unit === 'LM' && item.length != null ? item.length.toFixed(2) : (item.size || '—')}
                        </td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground">{item.unit || 'LM'}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-emerald-600">
                          {item.linearMeters ? item.linearMeters.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{fmt(item.unitPrice)}</td>
                        <td className="ps-3 pe-4 py-2.5 text-end tabular-nums font-bold">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Summary totals row */}
                  {(() => {
                    const totalPcs = quotation.items.reduce((s, it) => s + it.quantity, 0);
                    const totalLM  = quotation.items.reduce((s, it) => s + (it.linearMeters ?? 0), 0);
                    return (
                      <tfoot>
                        <tr className="bg-blue-50/60 border-t-2 border-blue-200">
                          <td className="ps-4 pe-3 py-2 text-xs font-bold text-blue-800 uppercase tracking-wide">Total Summary</td>
                          <td className="px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                          <td className="px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                          <td className="px-3 py-2 text-center tabular-nums font-extrabold text-blue-700">{totalPcs}</td>
                          <td className="px-3 py-2 text-center tabular-nums font-extrabold text-emerald-700">{totalLM > 0 ? totalLM.toFixed(2) : '—'}</td>
                          <td className="px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                          <td className="ps-3 pe-4 py-2 text-end text-xs text-muted-foreground">—</td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
              {/* Totals */}
              <div className="px-5 py-4 border-t border-border/50 bg-muted/10">
                <div className="max-w-xs ms-auto space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('quotations.subtotal')}</span>
                    <span className="tabular-nums">{fmt(quotation.subtotal)} AED</span>
                  </div>
                  {quotation.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('quotations.discountLabel', { percent: quotation.discountPercent })}</span>
                      <span className="tabular-nums text-destructive">−{fmt(quotation.discountAmount)} AED</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('quotations.vatLabel', { percent: quotation.taxPercent })}</span>
                    <span className="tabular-nums">+{fmt(quotation.taxAmount)} AED</span>
                  </div>
                  {quotation.deliveryCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('quotations.delivery')}</span>
                      <span className="tabular-nums">+{fmt(quotation.deliveryCharges)} AED</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-base border-t border-border/50 pt-2">
                    <span>{t('quotations.total')}</span>
                    <span className="tabular-nums text-primary">{fmt(quotation.total)} AED</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Linked Tax Invoices */}
            {hasTaxInvoices && (
              <Card className="shadow-sm border-border/60 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/60 flex items-center gap-2 bg-muted/10">
                  <Receipt className="size-4 text-muted-foreground" />
                  <span className="text-sm font-bold">{t('quotations.taxInvoices')}</span>
                  <span className="ms-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{quotation.taxInvoices!.length}</span>
                </div>
                <div className="divide-y divide-border/40">
                  {quotation.taxInvoices!.map((inv) => (
                    <Link key={inv.id} href={`/${locale}/tax-invoices/${inv.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Receipt className="size-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(inv.createdAt, locale)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={inv.status} label={inv.status} size="sm" />
                        <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground rtl:-scale-x-100" />
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Linked Delivery Notes */}
            {hasDeliveryNotes && (
              <Card className="shadow-sm border-border/60 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/60 flex items-center gap-2 bg-muted/10">
                  <Package className="size-4 text-muted-foreground" />
                  <span className="text-sm font-bold">{t('quotations.deliveryNotes')}</span>
                  <span className="ms-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{quotation.deliveryNotes!.length}</span>
                </div>
                <div className="divide-y divide-border/40">
                  {quotation.deliveryNotes!.map((dn) => (
                    <Link key={dn.id} href={`/${locale}/delivery-notes/${dn.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-muted/60 flex items-center justify-center">
                          <Package className="size-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{dn.dnNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(dn.createdAt, locale)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={dn.status} label={dn.status} size="sm" />
                        <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground rtl:-scale-x-100" />
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Notes & Terms */}
            {(quotation.notes || quotation.terms) && (
              <Card className="shadow-sm border-border/60">
                <CardContent className="p-5 space-y-4">
                  {quotation.notes && (
                    <div>
                      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2">{t('common.notes')}</p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{quotation.notes}</p>
                    </div>
                  )}
                  {quotation.notes && quotation.terms && <div className="border-t border-border/40" />}
                  {quotation.terms && (
                    <div>
                      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2">{t('quotations.terms')}</p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{quotation.terms}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right — 1/3 */}
          <div className="space-y-4">

            {/* Bill To */}
            <Card className="shadow-sm border-border/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-muted/10">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">{t('quotations.billTo')}</p>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {quotation.client ? <Building2 className="size-4 text-primary" /> : <User className="size-4 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-snug">{quotation.client?.companyName || quotation.customer?.fullName || '—'}</p>
                    {quotation.client?.trn && <p className="text-xs text-muted-foreground mt-0.5">TRN: {quotation.client.trn}</p>}
                  </div>
                </div>
                {(quotation.engineerName || quotation.engineer?.name) && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground/80">{quotation.engineerName || quotation.engineer?.name}</span>
                  </div>
                )}
                {quotation.mobileNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground/80">{quotation.mobileNumber}</span>
                  </div>
                )}
                {quotation.projectName && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground/80">{quotation.projectName}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quotation Details */}
            <Card className="shadow-sm border-border/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-muted/10">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">{t('quotations.detailsPanel')}</p>
              </div>
              <CardContent className="p-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Hash className="size-3.5" />{t('quotations.numberLabel')}</span>
                  <span className="font-bold text-primary">{quotation.quotationNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><CalendarDays className="size-3.5" />{t('quotations.createdLabel')}</span>
                  <span className="font-medium">{formatDate(quotation.createdAt, locale)}</span>
                </div>
                {quotation.validUntil && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><CalendarDays className="size-3.5" />{t('quotations.validUntil')}</span>
                    <span className="font-medium">{formatDate(quotation.validUntil, locale)}</span>
                  </div>
                )}
                <div className="border-t border-border/40 pt-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">{t('quotations.total')}</span>
                  <span className="font-extrabold text-base text-primary">{fmt(quotation.total)} AED</span>
                </div>
              </CardContent>
            </Card>

            {/* Client Approval Info */}
            {(quotation.clientApprovedAt || quotation.lpoNumber) && quotation.status !== 'DRAFT' && quotation.status !== 'SENT' && (
              <Card className="shadow-sm border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-emerald-500/20 flex items-center gap-2">
                  <ThumbsUp className="size-3.5 text-emerald-600" />
                  <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest">{t('quotations.clientApprovalPanel')}</p>
                </div>
                <CardContent className="p-4 space-y-2 text-sm">
                  {quotation.lpoNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('quotations.lpoNumber')}</span>
                      <span className="font-bold">{quotation.lpoNumber}</span>
                    </div>
                  )}
                  {quotation.clientApprovedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('quotations.approvedOn')}</span>
                      <span className="font-medium text-xs">{formatDate(quotation.clientApprovedAt, locale)}</span>
                    </div>
                  )}
                  {quotation.clientApprovedBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('quotations.recordedBy')}</span>
                      <span className="font-medium text-xs">{quotation.clientApprovedBy.fullName}</span>
                    </div>
                  )}
                  {quotation.clientNotes && (
                    <p className="text-xs text-muted-foreground pt-1 border-t border-emerald-500/20 italic">{quotation.clientNotes}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Finance Confirmation */}
            {quotation.confirmedAt && quotation.paymentType && (
              <Card className="shadow-sm border-amber-500/30 bg-amber-500/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-amber-500/20 flex items-center gap-2">
                  <CreditCard className="size-3.5 text-amber-600" />
                  <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest">{t('quotations.financeConfirmation')}</p>
                </div>
                <CardContent className="p-4 space-y-2 text-sm">
                  {quotation.paymentTerms && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('quotations.methodLabel')}</span>
                      <span className="font-medium">{quotation.paymentTerms}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('quotations.arrangementLabel')}</span>
                    <span className="font-bold">{PAYMENT_TYPE_LABELS[quotation.paymentType] || quotation.paymentType}</span>
                  </div>
                  {quotation.depositPercent != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('quotations.depositPercentLabel')}</span>
                      <span className="font-bold">{quotation.depositPercent}%</span>
                    </div>
                  )}
                  {quotation.depositAmount != null && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('quotations.dueNow')}</span>
                        <span className="font-bold text-amber-700">{fmt(quotation.depositAmount)} AED</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('quotations.remaining')}</span>
                        <span className="font-bold">{fmt(quotation.total - quotation.depositAmount)} AED</span>
                      </div>
                    </>
                  )}
                  {quotation.confirmedBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('quotations.confirmedBy')}</span>
                      <span className="font-medium text-xs">{quotation.confirmedBy.fullName}</span>
                    </div>
                  )}
                  {quotation.paymentProofUrl && (
                    <div className="pt-1 border-t border-amber-500/20">
                      <a href={quotation.paymentProofUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <FileText className="size-3" />{t('quotations.viewPaymentProof')}
                      </a>
                    </div>
                  )}
                  {quotation.paymentNotes && (
                    <p className="text-xs text-muted-foreground pt-1 border-t border-amber-500/20 italic">{quotation.paymentNotes}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card className="shadow-sm border-border/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-muted/10">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">{t('quotations.timelinePanel')}</p>
              </div>
              <CardContent className="p-4">
                <div className="space-y-0">
                  {timelineEvents.map((ev, idx) => (
                    <div key={ev.label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`size-2 rounded-full mt-1.5 shrink-0 ${ev.color}`} />
                        {idx < timelineEvents.length - 1 && <div className="w-px flex-1 min-h-[20px] bg-border/50 my-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-xs font-semibold">{ev.label}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDate(ev.date, locale)}{ev.by ? ` · ${ev.by}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            {quotation && (
              <Card className="shadow-premium">
                <CardContent className="p-5">
                  <AttachmentsPanel entityType="quotation" entityId={quotation.id} />
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Dialog: Client Approved ─────────────────────────────────────── */}
      <AlertDialog open={showClientApproveDialog} onOpenChange={setShowClientApproveDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ThumbsUp className="size-5 text-emerald-600" />{t('quotations.recordClientApprovalTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('quotations.recordClientApprovalDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('quotations.lpoNumber')} *</label>
              <Input placeholder="e.g. LPO-2026-001" value={caLpoNumber}
                onChange={(e) => setCaLpoNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">
                {t('quotations.clientNotesLabel')} <span className="text-muted-foreground font-normal text-xs">{t('quotations.clientNotesOptionalHint')}</span>
              </label>
              <textarea value={caClientNotes} onChange={(e) => setCaClientNotes(e.target.value)} rows={2}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. Minor spec clarification agreed..." />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClientApprove} disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <ThumbsUp className="size-4 me-1" />{t('quotations.recordApprovalBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: Client Rejected ─────────────────────────────────────── */}
      <AlertDialog open={showClientRejectDialog} onOpenChange={setShowClientRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ThumbsDown className="size-5 text-destructive" />{t('quotations.recordClientRejectionTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('quotations.recordClientRejectionDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-semibold block mb-2">
              {t('quotations.reasonRequestedChanges')} <span className="text-muted-foreground font-normal text-xs">({t('common.optional')})</span>
            </label>
            <textarea value={crClientNotes} onChange={(e) => setCrClientNotes(e.target.value)} rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="e.g. Price too high, requested 10% discount..." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClientReject} disabled={actionLoading}
              className="bg-destructive text-white hover:bg-destructive/90">
              <ThumbsDown className="size-4 me-1" />{t('quotations.recordRejectionBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: Finance Confirm ─────────────────────────────────────── */}
      <AlertDialog open={showFinanceDialog} onOpenChange={setShowFinanceDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Banknote className="size-5 text-amber-600" />{t('quotations.financeConfirmation')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('quotations.financeConfirmDesc')} LPO: <strong>{quotation.lpoNumber}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">

            {/* Payment Method */}
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('quotations.paymentMethodLabel')} *</label>
              <Select value={fcPaymentTerms} onValueChange={(v) => setFcPaymentTerms(v as typeof fcPaymentTerms)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash / Cheque / Bank Transfer">Cash / Cheque / Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Arrangement */}
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('quotations.paymentArrangementLabel')} *</label>
              <Select value={fcPaymentType}
                onValueChange={(v) => { setFcPaymentType(v as typeof fcPaymentType); setFcDepositPercent(''); setFcDepositAmount(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_ON_DELIVERY">{t('quotations.fullOnDelivery')}</SelectItem>
                  <SelectItem value="FULL_ADVANCE">{t('quotations.fullAdvancePayment')}</SelectItem>
                  <SelectItem value="DEPOSIT">{t('quotations.depositPartialUpfront')}</SelectItem>
                  <SelectItem value="PARTIAL">{t('quotations.partialPayment')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Full Advance note */}
            {fcPaymentType === 'FULL_ADVANCE' && quotation && (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40">
                <span className="text-xs text-amber-700 font-medium">{t('quotations.fullAmountDueUpfront')}</span>
                <span className="text-sm font-extrabold text-amber-700">{fmt(quotation.total)} AED</span>
              </div>
            )}

            {/* Deposit % — only for DEPOSIT or PARTIAL */}
            {(fcPaymentType === 'DEPOSIT' || fcPaymentType === 'PARTIAL') && (
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">
                    {fcPaymentType === 'DEPOSIT' ? t('quotations.paymentTypeDeposit') : t('quotations.paymentTypePartial')} % *
                  </label>
                  <Input type="number" min={1} max={99} placeholder="e.g. 30"
                    value={fcDepositPercent}
                    onChange={(e) => {
                      setFcDepositPercent(e.target.value);
                      const pct = parseFloat(e.target.value);
                      if (!isNaN(pct) && quotation) {
                        setFcDepositAmount((Math.round(quotation.total * pct / 100 * 100) / 100).toFixed(2));
                      } else { setFcDepositAmount(''); }
                    }}
                  />
                </div>
                {fcDepositAmount && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40">
                      <span className="text-xs text-amber-700 font-medium">{t('quotations.dueNow')}</span>
                      <span className="text-sm font-extrabold text-amber-700">{fmt(parseFloat(fcDepositAmount))} AED</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/60">
                      <span className="text-xs text-muted-foreground font-medium">{t('quotations.remaining')}</span>
                      <span className="text-sm font-bold">{fmt(quotation.total - parseFloat(fcDepositAmount))} AED</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Proof */}
            <div>
              <label className="text-sm font-semibold block mb-1.5">
                {t('quotations.paymentProofLabel')} <span className="text-muted-foreground font-normal text-xs">({t('common.optional')})</span>
              </label>
              {fcPaymentProofUrl ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-muted/30">
                  <CheckCircle className="size-4 text-emerald-600" />
                  <a href={fcPaymentProofUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary underline flex-1 truncate">{t('quotations.viewUploadedFile')}</a>
                  <button onClick={() => setFcPaymentProofUrl('')}
                    className="text-xs text-muted-foreground hover:text-destructive">{t('quotations.removeFile')}</button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/20 transition-colors">
                  <Upload className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{fcUploading ? t('quotations.uploadingFile') : t('quotations.uploadReceipt')}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" disabled={fcUploading}
                    onChange={(e) => { if (e.target.files?.[0]) handleUploadProof(e.target.files[0]); }} />
                </label>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-semibold block mb-1.5">
                {t('common.notes')} <span className="text-muted-foreground font-normal text-xs">({t('common.optional')})</span>
              </label>
              <textarea value={fcPaymentNotes} onChange={(e) => setFcPaymentNotes(e.target.value)} rows={2}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t('quotations.financeNotesPlaceholder')} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinanceConfirm} disabled={actionLoading || fcUploading}
              className="bg-amber-600 hover:bg-amber-700 text-white">
              {actionLoading
                ? <span className="size-4 me-2 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                : <Banknote className="size-4 me-1" />}
              {t('quotations.confirmAndRelease')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
