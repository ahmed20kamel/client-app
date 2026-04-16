'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, DollarSign, FileText, Package2,
  AlertCircle, Printer, Filter, Receipt, ChevronRight,
  CheckCircle2, Clock, XCircle, TrendingUp, Banknote,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { fmtAmount, formatDate } from '@/lib/utils';

interface Payment { id: string; amount: number; method: string; paymentDate: string; reference: string | null; }
interface DeliveryNote { id: string; dnNumber: string; status: string; deliveredAt: string | null; }

interface StatementInvoice {
  id: string; invoiceNumber: string; status: string;
  projectName: string | null; lpoNumber: string | null;
  total: number; paidAmount: number; createdAt: string;
  payments: Payment[];
  deliveryNotes: DeliveryNote[];
  quotation: {
    id: string; quotationNumber: string;
    paymentType: string | null; depositPercent: number | null;
    depositAmount: number | null; paymentNotes: string | null;
  } | null;
}

interface StatementQuotation {
  id: string; quotationNumber: string; status: string;
  total: number; createdAt: string; confirmedAt: string | null;
  paymentType: string | null; depositPercent: number | null;
  depositAmount: number | null; paymentNotes: string | null;
  lpoNumber: string | null; projectName: string | null;
  engineer: { id: string; name: string } | null;
  taxInvoices: { id: string; invoiceNumber: string; status: string; total: number; paidAmount: number; createdAt: string }[];
}

interface Client { id: string; companyName: string; trn: string | null; phone: string | null; email: string | null; address: string | null; }
interface Summary {
  totalQuoted: number; totalConfirmed: number;
  totalInvoiced: number; totalPaid: number; totalOutstanding: number;
  quotationCount: number; invoiceCount: number;
}

type Tab = 'overview' | 'quotations' | 'invoices' | 'payments';

export default function ClientStatementPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<StatementInvoice[]>([]);
  const [quotations, setQuotations] = useState<StatementQuotation[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalQuoted: 0, totalConfirmed: 0,
    totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0,
    quotationCount: 0, invoiceCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const INV_STATUS_LABELS: Record<string, string> = {
    DRAFT: t('taxInvoices.statusDraft'),
    SENT: t('taxInvoices.statusSent'),
    UNPAID: t('taxInvoices.statusUnpaid'),
    PARTIAL: t('taxInvoices.statusPartial'),
    PAID: t('taxInvoices.statusPaid'),
    CANCELLED: t('taxInvoices.statusCancelled'),
  };

  const Q_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    CLIENT_APPROVED: 'Client Approved',
    CLIENT_REJECTED: 'Client Rejected',
    CONFIRMED: 'Finance Confirmed',
    CONVERTED: 'Converted',
    EXPIRED: 'Expired',
  };

  const PAYMENT_TYPE_LABELS: Record<string, string> = {
    DEPOSIT: 'Deposit',
    PARTIAL: 'Partial',
    FULL_ADVANCE: 'Full Advance',
    FULL_ON_DELIVERY: 'Full on Delivery',
  };

  const fetchStatement = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterFrom) qs.set('from', filterFrom);
    if (filterTo) qs.set('to', filterTo);
    if (filterStatus && filterStatus !== 'all') qs.set('status', filterStatus);

    fetch(`/api/clients/${id}/statement?${qs}`)
      .then(r => r.json())
      .then(({ data }) => {
        setClient(data.client);
        setInvoices(data.invoices);
        setQuotations(data.quotations);
        setSummary(data.summary);
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [id, filterFrom, filterTo, filterStatus, t]);

  useEffect(() => { fetchStatement(); }, [fetchStatement]);

  const fmt = (n: number) => fmtAmount(n, locale);

  // Flatten all payments from all invoices for the payments tab
  const allPayments = invoices.flatMap(inv =>
    inv.payments.map(p => ({ ...p, invoiceNumber: inv.invoiceNumber, invoiceId: inv.id, projectName: inv.projectName }))
  ).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  if (loading && !client) return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm p-16 flex flex-col items-center">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      </div>
    </div>
  );

  if (!client) return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col items-center justify-center py-16">
        <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    </div>
  );

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'quotations', label: 'Quotations', icon: FileText, count: summary.quotationCount },
    { id: 'invoices', label: 'Tax Invoices', icon: Receipt, count: summary.invoiceCount },
    { id: 'payments', label: 'Payments', icon: Banknote, count: allPayments.length },
  ];

  return (
    <div className="p-3 md:p-3.5 space-y-4">

      {/* ── Header ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="size-4 rtl:-scale-x-100" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                <h1 className="text-xl font-bold">{client.companyName}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Account Statement
                {client.trn && <span className="ms-2 text-xs bg-muted px-1.5 py-0.5 rounded">TRN: {client.trn}</span>}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4 me-1" />{t('common.export')}
          </Button>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-border border-t border-border">
          <div className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Total Quoted</p>
            <p className="text-lg font-extrabold">{fmt(summary.totalQuoted)}</p>
            <p className="text-[10px] text-muted-foreground">{summary.quotationCount} quotations</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Invoiced</p>
            <p className="text-lg font-extrabold">{fmt(summary.totalInvoiced)}</p>
            <p className="text-[10px] text-muted-foreground">{summary.invoiceCount} invoices</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Collected</p>
            <p className="text-lg font-extrabold text-emerald-600">{fmt(summary.totalPaid)}</p>
            <p className="text-[10px] text-muted-foreground">{summary.totalInvoiced > 0 ? ((summary.totalPaid / summary.totalInvoiced) * 100).toFixed(0) : 0}% of invoiced</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Outstanding</p>
            <p className={`text-lg font-extrabold ${summary.totalOutstanding > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{fmt(summary.totalOutstanding)}</p>
            <p className="text-[10px] text-muted-foreground">remaining</p>
          </div>
        </div>

        {/* ── Progress bar ── */}
        {summary.totalInvoiced > 0 && (
          <div className="px-5 pb-4">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (summary.totalPaid / summary.totalInvoiced) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="h-9 w-36" />
          <span className="text-muted-foreground text-sm">→</span>
          <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="h-9 w-36" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder={t('common.all') + ' statuses'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIAL">Partially Paid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {(filterFrom || filterTo || filterStatus !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterStatus('all'); }}>
              {t('common.clear')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="p-5 space-y-4">
            {/* Quotation pipeline */}
            {quotations.length === 0 && invoices.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Building2 className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">{t('common.noData')}</p>
              </div>
            ) : (
              quotations.map(q => {
                const inv = q.taxInvoices[0];
                const invPaid = inv?.paidAmount ?? 0;
                const invTotal = inv?.total ?? 0;
                const invRemaining = invTotal - invPaid;
                return (
                  <div key={q.id} className="border border-border rounded-xl overflow-hidden">
                    {/* Quotation row */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/20 gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <div>
                          <Link href={`/${locale}/quotations/${q.id}`} className="font-bold text-sm text-primary hover:underline">
                            {q.quotationNumber}
                          </Link>
                          {q.projectName && <p className="text-xs text-muted-foreground">{q.projectName}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ms-auto">
                        <span className="text-sm font-bold">{fmt(q.total)} AED</span>
                        <StatusBadge status={q.status} label={Q_STATUS_LABELS[q.status] || q.status} size="sm" />
                        <span className="text-xs text-muted-foreground">{formatDate(q.createdAt, locale)}</span>
                      </div>
                    </div>

                    {/* Finance confirmation bar */}
                    {q.confirmedAt && q.paymentType && (
                      <div className="px-4 py-2 bg-amber-50/80 border-t border-amber-200/50 flex items-center gap-4 text-xs flex-wrap">
                        <CheckCircle2 className="size-3.5 text-amber-600 shrink-0" />
                        <span className="font-semibold text-amber-800">Finance Confirmed</span>
                        <span className="text-muted-foreground">{formatDate(q.confirmedAt, locale)}</span>
                        <span className="font-bold text-amber-700">{PAYMENT_TYPE_LABELS[q.paymentType] ?? q.paymentType}</span>
                        {q.depositAmount != null && q.depositAmount > 0 && (
                          <span className="text-amber-700">
                            Deposit: <strong>{fmt(q.depositAmount)} AED</strong>
                            {q.depositPercent && <span className="text-muted-foreground"> ({q.depositPercent}%)</span>}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tax Invoice row */}
                    {inv ? (
                      <div className="px-4 py-3 border-t border-border/60 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <ChevronRight className="size-3.5 text-muted-foreground ms-2" />
                          <Receipt className="size-4 text-primary/70 shrink-0" />
                          <div>
                            <Link href={`/${locale}/tax-invoices/${inv.id}`} className="font-bold text-sm text-primary hover:underline">
                              {inv.invoiceNumber}
                            </Link>
                            <p className="text-[10px] text-muted-foreground">{formatDate(inv.createdAt, locale)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ms-auto text-sm">
                          <div className="text-end">
                            <p className="text-[10px] text-muted-foreground">Total</p>
                            <p className="font-bold">{fmt(invTotal)} AED</p>
                          </div>
                          <div className="text-end">
                            <p className="text-[10px] text-muted-foreground">Paid</p>
                            <p className="font-bold text-emerald-600">{fmt(invPaid)} AED</p>
                          </div>
                          <div className="text-end">
                            <p className="text-[10px] text-muted-foreground">Remaining</p>
                            <p className={`font-bold ${invRemaining > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(invRemaining)} AED</p>
                          </div>
                          <StatusBadge status={inv.status} label={INV_STATUS_LABELS[inv.status] || inv.status} size="sm" />
                        </div>
                      </div>
                    ) : (
                      q.status === 'CONFIRMED' && (
                        <div className="px-4 py-2.5 border-t border-dashed border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="size-3.5" />
                          <span>No tax invoice generated yet</span>
                          <Link href={`/${locale}/tax-invoices/new?quotationId=${q.id}`} className="text-primary font-semibold hover:underline ms-1">
                            Generate →
                          </Link>
                        </div>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── QUOTATIONS TAB ── */}
        {activeTab === 'quotations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Quotation #</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Date</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Project</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Payment</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Total</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Deposit</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Status</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotations.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">{t('common.noData')}</td></tr>
                ) : quotations.map(q => (
                  <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/quotations/${q.id}`} className="font-bold text-primary hover:underline flex items-center gap-1.5">
                        <FileText className="size-3.5" />{q.quotationNumber}
                      </Link>
                      {q.lpoNumber && <p className="text-[11px] text-muted-foreground">LPO: {q.lpoNumber}</p>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(q.createdAt, locale)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{q.projectName || '—'}</td>
                    <td className="px-3 py-3">
                      {q.paymentType ? (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          {PAYMENT_TYPE_LABELS[q.paymentType] ?? q.paymentType}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-end font-medium">{fmt(q.total)} AED</td>
                    <td className="px-3 py-3 text-end">
                      {q.depositAmount != null && q.depositAmount > 0 ? (
                        <span className="font-bold text-amber-700">{fmt(q.depositAmount)} AED</span>
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
              {quotations.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-muted/30 font-bold">
                    <td colSpan={4} className="px-4 py-3 text-sm">{quotations.length} quotations</td>
                    <td className="px-3 py-3 text-end">{fmt(summary.totalQuoted)} AED</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* ── INVOICES TAB ── */}
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Invoice #</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Date</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Project</th>
                  <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">Quotation</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Total</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Paid</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Remaining</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Status</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">{t('common.noData')}</td></tr>
                ) : invoices.map(inv => {
                  const remaining = inv.total - (inv.paidAmount || 0);
                  const dn = inv.deliveryNotes[0];
                  return (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/${locale}/tax-invoices/${inv.id}`} className="font-bold text-primary hover:underline flex items-center gap-1.5">
                          <Receipt className="size-3.5" />{inv.invoiceNumber}
                        </Link>
                        {inv.lpoNumber && <p className="text-[11px] text-muted-foreground">LPO: {inv.lpoNumber}</p>}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(inv.createdAt, locale)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{inv.projectName || '—'}</td>
                      <td className="px-3 py-3">
                        {inv.quotation && (
                          <Link href={`/${locale}/quotations/${inv.quotation.id}`} className="text-xs text-primary hover:underline">
                            {inv.quotation.quotationNumber}
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-3 text-end font-medium">{fmt(inv.total)}</td>
                      <td className="px-3 py-3 text-end font-medium text-emerald-600">{fmt(inv.paidAmount || 0)}</td>
                      <td className={`px-3 py-3 text-end font-bold ${remaining > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {fmt(remaining)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={inv.status} label={INV_STATUS_LABELS[inv.status] || inv.status} size="sm" />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {dn ? (
                          <Link href={`/${locale}/delivery-notes/${dn.id}`}>
                            <StatusBadge status={dn.status} label={dn.status} size="sm" />
                          </Link>
                        ) : <span className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Package2 className="size-3" />—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {invoices.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td colSpan={4} className="px-4 py-3 text-sm">{invoices.length} invoices</td>
                    <td className="px-3 py-3 text-end">{fmt(summary.totalInvoiced)}</td>
                    <td className="px-3 py-3 text-end text-emerald-600">{fmt(summary.totalPaid)}</td>
                    <td className={`px-3 py-3 text-end ${summary.totalOutstanding > 0 ? 'text-red-600' : ''}`}>{fmt(summary.totalOutstanding)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
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
                      <DollarSign className="size-8 mx-auto mb-2 opacity-30" />
                      <p>No payments recorded</p>
                    </td>
                  </tr>
                ) : allPayments.map((p, i) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paymentDate, locale)}</td>
                    <td className="px-3 py-3">
                      <Link href={`/${locale}/tax-invoices/${p.invoiceId}`} className="font-bold text-primary hover:underline flex items-center gap-1.5">
                        <Receipt className="size-3.5" />{p.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{p.projectName || '—'}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs font-semibold">{p.method}</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{p.reference || '—'}</td>
                    <td className="px-3 py-3 text-end font-bold text-emerald-600">{fmt(p.amount)} AED</td>
                  </tr>
                ))}
              </tbody>
              {allPayments.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td colSpan={5} className="px-4 py-3 text-sm">Total Collected ({allPayments.length} payments)</td>
                    <td className="px-3 py-3 text-end text-emerald-600">{fmt(summary.totalPaid)} AED</td>
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
