'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, FileText, Receipt,
  Package2, Users, ChevronRight, TrendingUp, DollarSign,
  AlertCircle, Loader2, Hash, CheckCircle2, Clock, XCircle,
  Banknote, BarChart3,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { fmtAmount, formatDate } from '@/lib/utils';

interface Engineer { id: string; name: string; mobile: string | null; email: string | null; }

interface TaxInvoice {
  id: string; invoiceNumber: string; status: string;
  total: number; paidAmount: number; createdAt: string;
  projectName: string | null; lpoNumber: string | null;
  payments: { id: string; amount: number; method: string; paymentDate: string; reference: string | null }[];
  deliveryNotes: { id: string; dnNumber: string; status: string; deliveredAt: string | null }[];
  quotation: { id: string; quotationNumber: string; paymentType: string | null; depositAmount: number | null } | null;
}

interface Quotation {
  id: string; quotationNumber: string; status: string;
  total: number; createdAt: string; confirmedAt: string | null;
  lpoNumber: string | null; projectName: string | null;
  paymentType: string | null; depositAmount: number | null;
  engineer: { id: string; name: string } | null;
  taxInvoices: { id: string; invoiceNumber: string; status: string; paidAmount: number; total: number }[];
}

interface Client {
  id: string; companyName: string; trn: string | null;
  phone: string | null; email: string | null; address: string | null; notes: string | null;
  engineers: Engineer[];
  _count: { quotations: number; taxInvoices: number; deliveryNotes: number };
  invoices: TaxInvoice[];
  quotations: Quotation[];
  financial: { totalInvoiced: number; totalPaid: number; totalOutstanding: number };
}

type Tab = 'overview' | 'invoices' | 'quotations' | 'payments';

const Q_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SENT: 'Sent',
  CLIENT_APPROVED: 'Client Approved', CLIENT_REJECTED: 'Client Rejected',
  CONFIRMED: 'Finance Confirmed', CONVERTED: 'Converted', EXPIRED: 'Expired',
};
const INV_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Draft',           color: 'text-slate-500' },
  SENT:      { label: 'Sent',            color: 'text-blue-600' },
  UNPAID:    { label: 'Unpaid',          color: 'text-red-600' },
  PARTIAL:   { label: 'Partially Paid',  color: 'text-amber-600' },
  PAID:      { label: 'Paid',            color: 'text-emerald-600' },
  CANCELLED: { label: 'Cancelled',       color: 'text-slate-400' },
};
const PT_LABELS: Record<string, string> = {
  DEPOSIT: 'Deposit', PARTIAL: 'Partial',
  FULL_ADVANCE: 'Full Advance', FULL_ON_DELIVERY: 'Full on Delivery',
};

function deriveInvStatus(inv: TaxInvoice) {
  if (inv.status === 'CANCELLED') return 'CANCELLED';
  const paid = inv.paidAmount || 0;
  if (paid <= 0) return 'UNPAID';
  if (paid >= inv.total - 0.01) return 'PAID';
  return 'PARTIAL';
}

export default function ClientDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(({ data }) => setClient(data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const fmt = (n: number) => fmtAmount(n, locale);

  if (loading) return (
    <div className="p-3 md:p-3.5 flex items-center justify-center min-h-[300px]">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );

  if (!client) return (
    <div className="p-3 md:p-3.5 flex flex-col items-center justify-center min-h-[300px]">
      <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
      <p className="text-muted-foreground">{t('common.noData')}</p>
    </div>
  );

  const fin = client.financial;
  const collectRate = fin.totalInvoiced > 0 ? (fin.totalPaid / fin.totalInvoiced) * 100 : 0;

  // All payments flattened
  const allPayments = client.invoices
    .flatMap(inv => inv.payments.map(p => ({
      ...p,
      invoiceNumber: inv.invoiceNumber,
      invoiceId: inv.id,
      projectName: inv.projectName,
    })))
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview',   label: 'Overview',     icon: BarChart3 },
    { id: 'invoices',   label: 'Tax Invoices', icon: Receipt,   count: client.invoices.length },
    { id: 'quotations', label: 'Quotations',   icon: FileText,  count: client.quotations.length },
    { id: 'payments',   label: 'Payments',     icon: Banknote,  count: allPayments.length },
  ];

  return (
    <div className="p-3 md:p-3.5 space-y-4">

      {/* ── Header Card ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => router.back()}>
              <ArrowLeft className="size-4 rtl:-scale-x-100" />
            </Button>
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="size-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-tight truncate">{client.companyName}</h1>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {client.trn && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">TRN: {client.trn}</span>
                )}
                {client.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="size-3" />{client.phone}
                  </span>
                )}
                {client.email && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="size-3" />{client.email}
                  </span>
                )}
                {client.address && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" />{client.address}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/clients/${id}/statement`)}>
            <FileText className="size-4 me-1.5" />Full Statement
          </Button>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-b border-border">
          <div className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Total Invoiced</p>
            <p className="text-xl font-extrabold">{fmt(fin.totalInvoiced)}</p>
            <p className="text-[10px] text-muted-foreground">{client.invoices.length} invoices</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Collected</p>
            <p className="text-xl font-extrabold text-emerald-600">{fmt(fin.totalPaid)}</p>
            <p className="text-[10px] text-muted-foreground">{collectRate.toFixed(0)}%</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Outstanding</p>
            <p className={`text-xl font-extrabold ${fin.totalOutstanding > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {fmt(fin.totalOutstanding)}
            </p>
            <p className="text-[10px] text-muted-foreground">remaining</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Quotations</p>
            <p className="text-xl font-extrabold">{client.quotations.length}</p>
            <p className="text-[10px] text-muted-foreground">
              {client.quotations.filter(q => q.status === 'CONVERTED').length} converted
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {fin.totalInvoiced > 0 && (
          <div className="px-6 py-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Collection progress</span>
              <span className="font-semibold">{collectRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${collectRate >= 100 ? 'bg-emerald-500' : collectRate > 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                style={{ width: `${Math.min(100, collectRate)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Engineers ── */}
      {client.engineers.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-4">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users className="size-3.5" />Engineers / Contacts ({client.engineers.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {client.engineers.map(eng => (
              <div key={eng.id} className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border/50">
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {eng.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">{eng.name}</p>
                  {eng.mobile && <p className="text-[11px] text-muted-foreground mt-0.5">{eng.mobile}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Tabs Card ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                <Icon className="size-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─────────────── OVERVIEW ─────────────── */}
        {activeTab === 'overview' && (
          <div className="p-5 space-y-3">
            {client.quotations.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <TrendingUp className="size-10 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">No activity yet</p>
              </div>
            ) : client.quotations.map(q => {
              const inv = q.taxInvoices[0];
              const invPaid = inv?.paidAmount ?? 0;
              const invTotal = inv?.total ?? 0;
              const invRemaining = invTotal - invPaid;
              const invStatus = inv ? (invPaid <= 0 ? 'UNPAID' : invPaid >= invTotal - 0.01 ? 'PAID' : 'PARTIAL') : null;
              return (
                <div key={q.id} className="border border-border/70 rounded-xl overflow-hidden">
                  {/* Quotation row */}
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <Link href={`/${locale}/quotations/${q.id}`}
                          className="font-bold text-sm text-primary hover:underline">
                          {q.quotationNumber}
                        </Link>
                        {q.projectName && <p className="text-[11px] text-muted-foreground">{q.projectName}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ms-auto flex-wrap">
                      {q.lpoNumber && (
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">LPO: {q.lpoNumber}</span>
                      )}
                      <span className="text-sm font-bold tabular-nums">{fmt(q.total)} AED</span>
                      <StatusBadge status={q.status} label={Q_STATUS_LABELS[q.status] || q.status} size="sm" />
                      <span className="text-[11px] text-muted-foreground">{formatDate(q.createdAt, locale)}</span>
                    </div>
                  </div>

                  {/* Finance info */}
                  {q.confirmedAt && q.paymentType && (
                    <div className="px-4 py-2 bg-amber-50/70 border-t border-amber-200/40 flex items-center gap-3 text-xs flex-wrap">
                      <CheckCircle2 className="size-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold text-amber-800">Finance Confirmed</span>
                      <span className="text-amber-700 font-bold">{PT_LABELS[q.paymentType] ?? q.paymentType}</span>
                      {q.depositAmount && q.depositAmount > 0 && (
                        <span className="text-amber-700">
                          Deposit: <strong>{fmt(q.depositAmount)} AED</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Invoice row */}
                  {inv ? (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 flex-wrap gap-3">
                      <div className="flex items-center gap-2.5">
                        <ChevronRight className="size-3.5 text-muted-foreground ms-2" />
                        <Receipt className="size-4 text-primary/70 shrink-0" />
                        <div>
                          <Link href={`/${locale}/tax-invoices/${inv.id}`}
                            className="font-bold text-sm text-primary hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ms-auto text-sm flex-wrap">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Total</p>
                          <p className="font-bold tabular-nums">{fmt(invTotal)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Paid</p>
                          <p className="font-bold text-emerald-600 tabular-nums">{fmt(invPaid)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Remaining</p>
                          <p className={`font-bold tabular-nums ${invRemaining > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {fmt(invRemaining)}
                          </p>
                        </div>
                        {invStatus && (
                          <StatusBadge status={invStatus} label={INV_STATUS[invStatus]?.label ?? invStatus} size="sm" />
                        )}
                      </div>
                    </div>
                  ) : q.status === 'CONFIRMED' && (
                    <div className="px-4 py-2.5 border-t border-dashed border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>No tax invoice yet</span>
                      <Link href={`/${locale}/tax-invoices/new?quotationId=${q.id}`}
                        className="text-primary font-semibold hover:underline ms-1">Generate →</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─────────────── INVOICES ─────────────── */}
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Invoice</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Date</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Project / LPO</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Total</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Paid</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Remaining</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Status</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {client.invoices.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No invoices</td></tr>
                ) : client.invoices.map(inv => {
                  const remaining = inv.total - (inv.paidAmount || 0);
                  const status = deriveInvStatus(inv);
                  const dn = inv.deliveryNotes[0];
                  return (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/${locale}/tax-invoices/${inv.id}`}
                          className="font-bold text-primary hover:underline flex items-center gap-1.5">
                          <Receipt className="size-3.5" />{inv.invoiceNumber}
                        </Link>
                        {inv.quotation && (
                          <Link href={`/${locale}/quotations/${inv.quotation.id}`}
                            className="text-[11px] text-muted-foreground hover:text-primary">
                            {inv.quotation.quotationNumber}
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{formatDate(inv.createdAt, locale)}</td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-medium">{inv.projectName || '—'}</p>
                        {inv.lpoNumber && <p className="text-[10px] text-muted-foreground">LPO: {inv.lpoNumber}</p>}
                      </td>
                      <td className="px-3 py-3 text-end font-medium tabular-nums">{fmt(inv.total)}</td>
                      <td className="px-3 py-3 text-end font-bold text-emerald-600 tabular-nums">{fmt(inv.paidAmount || 0)}</td>
                      <td className={`px-3 py-3 text-end font-bold tabular-nums ${remaining > 0.01 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {fmt(remaining)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={status} label={INV_STATUS[status]?.label ?? status} size="sm" />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {dn ? (
                          <Link href={`/${locale}/delivery-notes/${dn.id}`}>
                            <StatusBadge status={dn.status} label={dn.status} size="sm" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {client.invoices.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-bold">
                    <td colSpan={3} className="px-4 py-3 text-sm">{client.invoices.length} invoices</td>
                    <td className="px-3 py-3 text-end tabular-nums">{fmt(fin.totalInvoiced)}</td>
                    <td className="px-3 py-3 text-end text-emerald-600 tabular-nums">{fmt(fin.totalPaid)}</td>
                    <td className={`px-3 py-3 text-end tabular-nums ${fin.totalOutstanding > 0 ? 'text-red-600' : ''}`}>{fmt(fin.totalOutstanding)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* ─────────────── QUOTATIONS ─────────────── */}
        {activeTab === 'quotations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Quotation</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Date</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Project</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Engineer</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Total</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Payment</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Status</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {client.quotations.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No quotations</td></tr>
                ) : client.quotations.map(q => (
                  <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/quotations/${q.id}`}
                        className="font-bold text-primary hover:underline flex items-center gap-1.5">
                        <FileText className="size-3.5" />{q.quotationNumber}
                      </Link>
                      {q.lpoNumber && <p className="text-[10px] text-muted-foreground">LPO: {q.lpoNumber}</p>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{formatDate(q.createdAt, locale)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{q.projectName || '—'}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{q.engineer?.name || '—'}</td>
                    <td className="px-3 py-3 text-end font-medium tabular-nums">{fmt(q.total)} AED</td>
                    <td className="px-3 py-3 text-center">
                      {q.paymentType ? (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          {PT_LABELS[q.paymentType]}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={q.status} label={Q_STATUS_LABELS[q.status] || q.status} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-center">
                      {q.taxInvoices[0] ? (
                        <Link href={`/${locale}/tax-invoices/${q.taxInvoices[0].id}`}
                          className="text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1">
                          <Receipt className="size-3" />{q.taxInvoices[0].invoiceNumber}
                        </Link>
                      ) : q.status === 'CONFIRMED' ? (
                        <Link href={`/${locale}/tax-invoices/new?quotationId=${q.id}`}
                          className="text-xs text-primary/70 hover:text-primary hover:underline">
                          + Generate
                        </Link>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─────────────── PAYMENTS ─────────────── */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Invoice</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Project</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Method</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Reference</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      <DollarSign className="size-8 mx-auto mb-2 opacity-20" />
                      <p>No payments recorded</p>
                    </td>
                  </tr>
                ) : allPayments.map(p => (
                  <tr key={p.id} className={`hover:bg-muted/20 transition-colors ${p.reference?.startsWith('Auto:') ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paymentDate, locale)}</td>
                    <td className="px-3 py-3">
                      <Link href={`/${locale}/tax-invoices/${p.invoiceId}`}
                        className="font-bold text-primary hover:underline flex items-center gap-1">
                        <Receipt className="size-3.5" />{p.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{p.projectName || '—'}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded">{p.method}</span>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {p.reference?.startsWith('Auto:') ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full">
                          {p.reference}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{p.reference || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-end font-bold text-emerald-600 tabular-nums">{fmt(p.amount)} AED</td>
                  </tr>
                ))}
              </tbody>
              {allPayments.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-bold">
                    <td colSpan={5} className="px-4 py-3 text-sm">Total Collected ({allPayments.length} payments)</td>
                    <td className="px-3 py-3 text-end text-emerald-600 tabular-nums">{fmt(fin.totalPaid)} AED</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
