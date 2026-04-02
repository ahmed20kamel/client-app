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
  AlertCircle, Printer, Filter,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

interface Payment { id: string; amount: number; method: string; paymentDate: string; reference: string | null; }
interface DeliveryNote { id: string; dnNumber: string; status: string; deliveredAt: string | null; }
interface StatementInvoice {
  id: string; invoiceNumber: string; status: string;
  projectName: string | null; lpoNumber: string | null;
  total: number; paidAmount: number;
  createdAt: string;
  payments: Payment[];
  deliveryNotes: DeliveryNote[];
}
interface Client { id: string; companyName: string; trn: string | null; phone: string | null; email: string | null; address: string | null; }
interface Summary { totalInvoiced: number; totalPaid: number; totalOutstanding: number; }

export default function ClientStatementPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<StatementInvoice[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0 });
  const [loading, setLoading] = useState(true);

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('taxInvoices.statusDraft'),
    SENT: t('taxInvoices.statusSent'),
    UNPAID: t('taxInvoices.statusUnpaid'),
    PARTIAL: t('taxInvoices.statusPartial'),
    PAID: t('taxInvoices.statusPaid'),
    CANCELLED: t('taxInvoices.statusCancelled'),
  };

  const fetchStatement = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterFrom) qs.set('from', filterFrom);
    if (filterTo) qs.set('to', filterTo);
    if (filterStatus) qs.set('status', filterStatus);

    fetch(`/api/clients/${id}/statement?${qs}`)
      .then(r => r.json())
      .then(({ data }) => {
        setClient(data.client);
        setInvoices(data.invoices);
        setSummary(data.summary);
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [id, filterFrom, filterTo, filterStatus, t]);

  useEffect(() => { fetchStatement(); }, [fetchStatement]);

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-AE') : '—';

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

  return (
    <div className="p-3 md:p-3.5 space-y-4">

      {/* Header */}
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
                {t('clients.statement')}
                {client.trn && <span className="ms-2 text-xs">TRN: {client.trn}</span>}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4 me-1" />{t('common.export')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 p-5">
          <div className="bg-muted/40 rounded-xl p-4 text-center border border-border/50">
            <p className="text-xs text-muted-foreground font-medium mb-1">{t('clients.totalInvoiced')}</p>
            <p className="text-xl font-bold">{fmt(summary.totalInvoiced)}</p>
            <p className="text-[10px] text-muted-foreground">AED</p>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-4 text-center border border-emerald-500/20">
            <p className="text-xs text-muted-foreground font-medium mb-1">{t('clients.totalPaid')}</p>
            <p className="text-xl font-bold text-emerald-600">{fmt(summary.totalPaid)}</p>
            <p className="text-[10px] text-muted-foreground">AED</p>
          </div>
          <div className={`rounded-xl p-4 text-center border ${summary.totalOutstanding > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/40 border-border/50'}`}>
            <p className="text-xs text-muted-foreground font-medium mb-1">{t('clients.totalOutstanding')}</p>
            <p className={`text-xl font-bold ${summary.totalOutstanding > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{fmt(summary.totalOutstanding)}</p>
            <p className="text-[10px] text-muted-foreground">AED</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="h-9 w-36" placeholder={t('clients.filterFrom')} />
          <span className="text-muted-foreground text-sm">→</span>
          <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="h-9 w-36" placeholder={t('clients.filterTo')} />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder={t('common.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('common.all')}</SelectItem>
              <SelectItem value="DRAFT">{STATUS_LABELS.DRAFT}</SelectItem>
              <SelectItem value="UNPAID">{STATUS_LABELS.UNPAID}</SelectItem>
              <SelectItem value="PARTIAL">{STATUS_LABELS.PARTIAL}</SelectItem>
              <SelectItem value="PAID">{STATUS_LABELS.PAID}</SelectItem>
              <SelectItem value="CANCELLED">{STATUS_LABELS.CANCELLED}</SelectItem>
            </SelectContent>
          </Select>
          {(filterFrom || filterTo || filterStatus) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterStatus(''); }}>
              {t('common.clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('taxInvoices.invoiceNumber')}</th>
                <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">{t('clients.invoiceDate')}</th>
                <th className="px-3 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.projectName')}</th>
                <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.total')}</th>
                <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">{t('taxInvoices.paidAmount')}</th>
                <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">{t('taxInvoices.remaining')}</th>
                <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('clients.paymentStatus')}</th>
                <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('clients.deliveryStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <DollarSign className="size-8 mx-auto mb-2 opacity-30" />
                    <p>{t('common.noData')}</p>
                  </td>
                </tr>
              ) : invoices.map((inv) => {
                const remaining = inv.total - (inv.paidAmount || 0);
                const dn = inv.deliveryNotes[0];
                return (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/tax-invoices/${inv.id}`} className="font-bold text-primary hover:underline flex items-center gap-1.5">
                        <FileText className="size-3.5" />{inv.invoiceNumber}
                      </Link>
                      {inv.lpoNumber && <p className="text-[11px] text-muted-foreground mt-0.5">LPO: {inv.lpoNumber}</p>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{fmtDate(inv.createdAt)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{inv.projectName || '—'}</td>
                    <td className="px-3 py-3 text-end font-medium">{fmt(inv.total)}</td>
                    <td className="px-3 py-3 text-end font-medium text-emerald-600">{fmt(inv.paidAmount || 0)}</td>
                    <td className={`px-3 py-3 text-end font-bold ${remaining > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {fmt(remaining)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={inv.status} label={STATUS_LABELS[inv.status] || inv.status} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-center">
                      {dn ? (
                        <Link href={`/${locale}/delivery-notes/${dn.id}`} className="flex flex-col items-center gap-0.5">
                          <StatusBadge status={dn.status} label={dn.status} size="sm" />
                          {dn.deliveredAt && <span className="text-[10px] text-muted-foreground">{fmtDate(dn.deliveredAt)}</span>}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <Package2 className="size-3" />—
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {invoices.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/30 font-bold">
                  <td colSpan={3} className="px-4 py-3 text-sm">{t('common.all')} ({invoices.length})</td>
                  <td className="px-3 py-3 text-end">{fmt(summary.totalInvoiced)}</td>
                  <td className="px-3 py-3 text-end text-emerald-600">{fmt(summary.totalPaid)}</td>
                  <td className={`px-3 py-3 text-end ${summary.totalOutstanding > 0 ? 'text-red-600' : ''}`}>{fmt(summary.totalOutstanding)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
