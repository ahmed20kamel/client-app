'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Wallet, Search, Building2, Receipt, FileText,
  TrendingUp, DollarSign, AlertCircle, ChevronRight, X, Download,
} from 'lucide-react';
import { fmtAmount } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';

interface AccountRow {
  id: string; companyName: string; trn: string | null; phone: string | null;
  invoiceCount: number; quotationCount: number;
  totalInvoiced: number; totalPaid: number; totalOutstanding: number;
  lastInvoiceDate: string | null;
}
interface Summary {
  grandTotal: number; grandPaid: number; grandOutstanding: number; clientCount: number;
}

type Filter = 'all' | 'outstanding' | 'paid' | 'noInvoice';

export default function AccountsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ grandTotal: 0, grandPaid: 0, grandOutstanding: 0, clientCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const fetch_ = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    qs.set('filter', filter);
    fetch(`/api/accounts?${qs}`)
      .then(r => r.json())
      .then(({ data, summary: s }) => { setRows(data || []); setSummary(s); })
      .catch(() => toast.error('Error loading accounts'))
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    const t = setTimeout(fetch_, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fmt = (n: number) => fmtAmount(n, locale);

  const FILTERS: { id: Filter; label: string; color: string }[] = [
    { id: 'all',        label: 'All Clients',    color: 'bg-muted text-foreground' },
    { id: 'outstanding',label: 'Outstanding',    color: 'bg-red-50 text-red-700 border-red-200' },
    { id: 'paid',       label: 'Fully Paid',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'noInvoice',  label: 'No Invoice Yet', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="p-3 md:p-3.5 space-y-4">

      {/* ── Header ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <PageHeader
          title="Accounts Receivable"
          subtitle={`${summary.clientCount} clients`}
          icon={Wallet}
          actions={
            <Button variant="outline" size="sm" onClick={() => window.open('/api/export?type=accounts', '_blank')}>
              <Download className="size-3.5 me-1.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          }
        />

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-t border-border">
          <div className="p-5 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Total Invoiced</p>
            <p className="text-2xl font-extrabold tabular-nums">{fmt(summary.grandTotal)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">AED</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Collected</p>
            <p className="text-2xl font-extrabold text-emerald-600 tabular-nums">{fmt(summary.grandPaid)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {summary.grandTotal > 0 ? ((summary.grandPaid / summary.grandTotal) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="p-5 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Outstanding</p>
            <p className={`text-2xl font-extrabold tabular-nums ${summary.grandOutstanding > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {fmt(summary.grandOutstanding)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">AED</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">With Balance</p>
            <p className="text-2xl font-extrabold text-red-600 tabular-nums">
              {rows.filter(r => r.totalOutstanding > 0.01).length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">clients</p>
          </div>
        </div>

        {/* Overall progress bar */}
        {summary.grandTotal > 0 && (
          <div className="px-6 pb-5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Overall collection rate</span>
              <span className="font-semibold">{((summary.grandPaid / summary.grandTotal) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(100, (summary.grandPaid / summary.grandTotal) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Filters & Search ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..." className="ps-9 h-9" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filter === f.id
                  ? f.color + ' border-current shadow-sm'
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:border-border'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Building2 className="size-12 text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground">No clients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Invoices</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Quotations</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Total Invoiced</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Collected</th>
                  <th className="px-3 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase">Outstanding</th>
                  <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">Collection %</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(row => {
                  const pct = row.totalInvoiced > 0 ? (row.totalPaid / row.totalInvoiced) * 100 : 0;
                  return (
                    <tr key={row.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => router.push(`/${locale}/clients/${row.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold leading-tight">{row.companyName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {row.trn && <span className="text-[10px] text-muted-foreground font-mono">TRN: {row.trn}</span>}
                              {row.phone && <span className="text-[10px] text-muted-foreground">{row.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Receipt className="size-3 text-muted-foreground" />{row.invoiceCount}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <FileText className="size-3 text-muted-foreground" />{row.quotationCount}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-end font-medium tabular-nums">
                        {row.totalInvoiced > 0 ? fmt(row.totalInvoiced) : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-3 py-3 text-end font-bold text-emerald-600 tabular-nums">
                        {row.totalPaid > 0 ? fmt(row.totalPaid) : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-3 py-3 text-end">
                        {row.totalOutstanding > 0.01 ? (
                          <span className="font-bold text-red-600 tabular-nums">{fmt(row.totalOutstanding)}</span>
                        ) : row.totalInvoiced > 0 ? (
                          <span className="text-emerald-600 font-bold">Settled</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center min-w-[100px]">
                        {row.totalInvoiced > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold w-8 text-end ${pct >= 100 ? 'text-emerald-600' : pct > 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">No invoices</span>
                        )}
                      </td>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <Link href={`/${locale}/clients/${row.id}`}>
                          <Button variant="ghost" size="icon" className="size-7">
                            <ChevronRight className="size-3.5 rtl:-scale-x-100" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30 font-bold">
                  <td className="px-4 py-3 text-sm">{rows.length} clients</td>
                  <td colSpan={2} />
                  <td className="px-3 py-3 text-end tabular-nums">{fmt(summary.grandTotal)}</td>
                  <td className="px-3 py-3 text-end text-emerald-600 tabular-nums">{fmt(summary.grandPaid)}</td>
                  <td className={`px-3 py-3 text-end tabular-nums ${summary.grandOutstanding > 0 ? 'text-red-600' : ''}`}>
                    {fmt(summary.grandOutstanding)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
