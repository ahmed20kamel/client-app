'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, Printer, Download, Search, Loader2 } from 'lucide-react';
import { COMPANY } from '@/lib/company';

interface ReportRow {
  id: string;
  invoiceNumber: string;
  date: string;
  company: string;
  amount: number;
  vat: number;
  deliveryCharges: number;
  total: number;
}
interface ReportData {
  rows: ReportRow[];
  totals: { amount: number; vat: number; deliveryCharges: number; total: number };
  earnedBonus: number;
  bonusPct: number;
}

export default function SalesBonusReportPage() {
  const params  = useParams();
  const locale  = params.locale as string;

  const [from,     setFrom]     = useState('');
  const [to,       setTo]       = useState('');
  const [product,  setProduct]  = useState('');
  const [bonusPct, setBonusPct] = useState('4');
  const [loading,  setLoading]  = useState(false);
  const [data,     setData]     = useState<ReportData | null>(null);

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from)     params.set('from', from);
      if (to)       params.set('to', to);
      if (product)  params.set('product', product);
      if (bonusPct) params.set('bonusPct', bonusPct);
      const res = await fetch(`/api/reports/sales-bonus?${params}`);
      if (!res.ok) throw new Error('Failed to fetch report');
      const { data } = await res.json();
      setData(data);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!data) return;
    const title = `Sales Bonus Report${product ? ` - ${product}` : ''}`;
    const headers = ['Date', 'Company', 'Tax Invoice', 'Amount (AED)', 'VAT (AED)', 'Delivery (AED)', 'Total (AED)'];
    const rows = data.rows.map(r => [
      fmtDate(r.date), r.company, r.invoiceNumber,
      r.amount.toFixed(2), r.vat.toFixed(2), r.deliveryCharges.toFixed(2), r.total.toFixed(2),
    ]);
    const totalsRow = [
      'TOTAL', '', '',
      data.totals.amount.toFixed(2), data.totals.vat.toFixed(2),
      data.totals.deliveryCharges.toFixed(2), data.totals.total.toFixed(2),
    ];
    const bonusRow = ['', 'Earned Bonus', `${data.bonusPct}%`, data.earnedBonus.toFixed(2), '', '', ''];

    const csvContent = [
      [title], [''], [headers.join(',')],
      ...rows.map(r => r.join(',')),
      [''],
      [totalsRow.join(',')],
      [bonusRow.join(',')],
    ].map(r => (Array.isArray(r) ? r.join(',') : r)).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sales-bonus-${product || 'all'}-${from || 'start'}-${to || 'end'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPrint = () => {
    if (!data) return;
    const params = new URLSearchParams();
    if (from)     params.set('from', from);
    if (to)       params.set('to', to);
    if (product)  params.set('product', product);
    if (bonusPct) params.set('bonusPct', bonusPct);
    window.open(`/${locale}/reports/sales-bonus/print?${params}`, '_blank');
  };

  return (
    <div className="p-3 md:p-3.5 space-y-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Sales Bonus Report</h1>
              <p className="text-sm text-muted-foreground">تقرير مكافأة المبيعات</p>
            </div>
          </div>
          {data && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openPrint}>
                <Printer className="size-4 me-1" /> Print PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <Download className="size-4 me-1" /> Export Excel
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">From Date</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">To Date</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Product Filter</label>
              <input type="text" value={product} onChange={e => setProduct(e.target.value)}
                placeholder="e.g. Litbeam"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Bonus %</label>
              <div className="flex gap-2">
                <input type="number" value={bonusPct} onChange={e => setBonusPct(e.target.value)}
                  min="0" max="100" step="0.5"
                  className="w-20 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <Button onClick={fetchReport} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <><Search className="size-4 me-1" />Run</>}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {data && (
          <div className="p-6">
            {data.rows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No invoices found for selected filters</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary text-white">
                        <th className="px-3 py-2.5 text-left font-semibold">#</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Company</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Tax Invoice</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Amount (AED)</th>
                        <th className="px-3 py-2.5 text-right font-semibold">VAT (AED)</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Delivery (AED)</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Total (AED)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, i) => (
                        <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2">{fmtDate(row.date)}</td>
                          <td className="px-3 py-2 font-medium">{row.company}</td>
                          <td className="px-3 py-2 text-primary font-semibold">{row.invoiceNumber}</td>
                          <td className="px-3 py-2 text-right">{fmt(row.amount)}</td>
                          <td className="px-3 py-2 text-right">{fmt(row.vat)}</td>
                          <td className="px-3 py-2 text-right">{fmt(row.deliveryCharges)}</td>
                          <td className="px-3 py-2 text-right font-bold">{fmt(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted font-bold border-t-2 border-primary">
                        <td colSpan={4} className="px-3 py-3 text-right uppercase tracking-wide text-sm">Total</td>
                        <td className="px-3 py-3 text-right">{fmt(data.totals.amount)}</td>
                        <td className="px-3 py-3 text-right">{fmt(data.totals.vat)}</td>
                        <td className="px-3 py-3 text-right">{fmt(data.totals.deliveryCharges)}</td>
                        <td className="px-3 py-3 text-right">{fmt(data.totals.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Earned Bonus */}
                <div className="mt-6 flex justify-end">
                  <Card className="border-emerald-300 bg-emerald-50">
                    <CardContent className="pt-4 px-6 pb-4">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Amount</p>
                          <p className="text-lg font-bold">{fmt(data.totals.amount)} AED</p>
                        </div>
                        <div className="text-2xl text-muted-foreground">×</div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase font-semibold">Bonus Rate</p>
                          <p className="text-lg font-bold">{data.bonusPct}%</p>
                        </div>
                        <div className="text-2xl text-muted-foreground">=</div>
                        <div className="text-center bg-emerald-600 text-white rounded-xl px-6 py-2">
                          <p className="text-xs uppercase font-semibold opacity-80">Earned Bonus</p>
                          <p className="text-2xl font-extrabold">{fmt(data.earnedBonus)} AED</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {!data && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileText className="size-12 mb-3 opacity-20" />
            <p>Set filters and click <strong>Run</strong> to generate report</p>
          </div>
        )}
      </div>
    </div>
  );
}
