'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, Download, Loader2, Save, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Employee {
  id: string; empCode: string; name: string; costCenter: string;
  wpsEntity: string; paymentMethod: string; basicSalary: number;
  allowances: number; totalSalary: number; otherAllowance: number;
}
interface PayrollRow {
  employeeId: string; employee: Employee;
  basicSalary: number; allowances: number; otherAllowance: number; totalSalary: number;
  workDays: number; absentDays: number; otHours: number; otAmount: number;
  absentDeduction: number; allowanceAdj: number; deduction: number;
  loanDeduction: number; adjustment: number;
  grossSalary: number; wpsAmount: number; cashAmount: number; otPayment: number;
  totalPayment: number; remarks?: string;
}

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

const editInp = "w-16 h-7 text-right text-[12px] border border-border/60 rounded-md px-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 tabular-nums";

function recalc(r: PayrollRow): PayrollRow {
  const u = { ...r };
  u.grossSalary  = u.totalSalary + u.otherAllowance - u.absentDeduction + u.otAmount + u.allowanceAdj - u.deduction + u.adjustment;
  u.totalPayment = u.grossSalary - u.loanDeduction;
  if (u.employee.paymentMethod === 'Cash') {
    u.cashAmount = u.totalPayment; u.wpsAmount = 0;
  } else {
    u.wpsAmount  = Math.max(0, u.basicSalary - u.absentDeduction);
    u.cashAmount = Math.max(0, u.totalPayment - u.wpsAmount);
  }
  return u;
}

export default function MonthlyPayrollPage() {
  const { locale, period } = useParams() as { locale: string; period: string };
  const router = useRouter();
  const [year, month] = period.split('-').map(Number);
  const [rows,    setRows]    = useState<PayrollRow[]>([]);
  const [source,  setSource]  = useState<'saved' | 'computed'>('computed');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const fmt = (n: number) => n?.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/payroll/monthly/${period}`);
    const { data } = await res.json();
    setRows(data?.entries || []);
    setSource(data?.source || 'computed');
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const setField = (empId: string, field: string, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.employeeId !== empId) return r;
      const u = { ...r, [field]: parseFloat(value) || 0 };
      return recalc(u);
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/payroll/monthly/${period}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: rows }),
    });
    if (res.ok) { toast.success('Payroll saved'); setSource('saved'); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else        { toast.error('Failed to save payroll'); }
    setSaving(false);
  };

  const exportCSV = () => {
    const headers = ['Code','Name','Cost Center','WPS Entity','Basic','Allowances','Other Allow','Total Salary','Work Days','Absent','OT Hrs','OT Amt','Absent Deduct','Allow Adj','Deduction','Loan Deduction','Adj','Gross','WPS Amt','Cash','OT Pay','Total'];
    const csvRows = rows.map(r => [
      r.employee.empCode, `"${r.employee.name}"`, r.employee.costCenter, r.employee.wpsEntity,
      r.basicSalary, r.allowances, r.otherAllowance, r.totalSalary,
      r.workDays, r.absentDays, r.otHours, r.otAmount.toFixed(2),
      r.absentDeduction.toFixed(2), r.allowanceAdj, r.deduction, r.loanDeduction,
      r.adjustment, r.grossSalary.toFixed(2), r.wpsAmount.toFixed(2), r.cashAmount.toFixed(2),
      r.otPayment.toFixed(2), r.totalPayment.toFixed(2),
    ].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `payroll-${period}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const prevPeriod = () => { const d = new Date(year, month - 2, 1); router.push(`/${locale}/payroll/monthly/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };
  const nextPeriod = () => { const d = new Date(year, month,     1); router.push(`/${locale}/payroll/monthly/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };

  const grouped: Record<string, PayrollRow[]> = {};
  for (const r of rows) { const cc = r.employee?.costCenter || 'Unknown'; if (!grouped[cc]) grouped[cc] = []; grouped[cc].push(r); }

  const sum = (arr: PayrollRow[], f: keyof PayrollRow) => arr.reduce((s, r) => s + ((r[f] as number) || 0), 0);

  return (
    <div className="space-y-3">

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 bg-muted/40 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">Monthly Payroll — {MONTHS[month]} {year}</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {rows.length} employees ·{' '}
              {source === 'saved'
                ? <span className="text-emerald-600 font-medium">Saved</span>
                : <span className="text-amber-600 font-medium">Computed — not yet saved</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={prevPeriod} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="size-4" /></button>
            <button onClick={nextPeriod} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="size-4" /></button>
            <Link href={`/${locale}/payroll/timesheet/${period}`}>
              <Button variant="outline" size="sm">Edit Timesheet</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="size-3.5" />Export CSV</Button>
            <Button variant="outline" size="sm" onClick={() => window.open(`/${locale}/payroll/${period}/print`, '_blank')} className="gap-1.5">
              <Printer className="size-3.5" />Print
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 min-w-20">
              {saving ? <><Loader2 className="size-3.5 animate-spin" />Saving...</>
                      : saved  ? <><Check className="size-3.5" />Saved</>
                               : <><Save className="size-3.5" />Save</>}
            </Button>
          </div>
        </div>

        {/* Grand totals strip */}
        {rows.length > 0 && (
          <div className="flex items-stretch divide-x divide-border border-b-2 border-border">
            {[
              { label: 'Total Salary',   value: sum(rows, 'totalSalary'),     cls: '' },
              { label: 'OT Amount',      value: sum(rows, 'otAmount'),        cls: 'text-emerald-700' },
              { label: 'Abs Deductions', value: sum(rows, 'absentDeduction'), cls: 'text-red-600' },
              { label: 'Loan Deductions',value: sum(rows, 'loanDeduction'),   cls: 'text-purple-700' },
              { label: 'WPS (Bank)',     value: sum(rows, 'wpsAmount'),       cls: 'text-blue-700' },
              { label: 'Cash',           value: sum(rows, 'cashAmount'),      cls: 'text-orange-600' },
              { label: 'Total Payment',  value: sum(rows, 'totalPayment'),    cls: 'text-primary font-bold' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex-1 px-4 py-3 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <p className={cn('text-[15px] font-semibold tabular-nums mt-0.5', cls)}>{fmt(value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tables */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cc, ccRows]) => (
            <div key={cc} className="rounded-xl border border-border bg-card overflow-hidden">

              <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{cc}</span>
                <span className="text-[11px] text-muted-foreground">
                  {ccRows.length} employees · WPS {fmt(sum(ccRows,'wpsAmount'))} · Cash {fmt(sum(ccRows,'cashAmount'))} · Total {fmt(sum(ccRows,'totalPayment'))} AED
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse" style={{ minWidth: '1480px' }}>
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                      <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur-sm px-3 py-2.5 text-left font-semibold border-r border-border min-w-44 whitespace-nowrap">Employee</th>
                      <th className="px-3 py-2.5 text-left font-semibold border-r border-border/60 whitespace-nowrap">WPS Entity</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 whitespace-nowrap">Basic</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 whitespace-nowrap">Allow.</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 whitespace-nowrap">Other Allow.</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 bg-blue-50/60 whitespace-nowrap">Total Salary</th>
                      <th className="px-3 py-2.5 text-center font-semibold border-r border-border/60 whitespace-nowrap">Work Days</th>
                      <th className="px-3 py-2.5 text-center font-semibold border-r border-border/60 bg-red-50/60 whitespace-nowrap">Absent</th>
                      <th className="px-3 py-2.5 text-center font-semibold border-r border-border/60 whitespace-nowrap">OT Hrs</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 bg-emerald-50/60 whitespace-nowrap">OT Amt</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 bg-red-50/60 whitespace-nowrap">Abs Deduct</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 whitespace-nowrap">Allow. Adj</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 whitespace-nowrap">Deduction</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 bg-purple-50/60 whitespace-nowrap">Loan Ded.</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 whitespace-nowrap">Adj</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 bg-primary/10 whitespace-nowrap">Gross</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 bg-blue-50/60 whitespace-nowrap">WPS</th>
                      <th className="px-3 py-2.5 text-right font-semibold border-r border-border/60 bg-orange-50/60 whitespace-nowrap">Cash</th>
                      <th className="px-3 py-2.5 text-right font-semibold bg-primary/15 whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {ccRows.map((row) => (
                      <tr key={row.employeeId} className="hover:bg-muted/20 transition-colors">
                        <td className="sticky left-0 z-10 bg-card px-3 py-2 border-r border-border/60">
                          <div className="font-semibold text-[12px] text-primary whitespace-nowrap">{row.employee?.empCode}</div>
                          <div className="text-[11px] text-foreground truncate max-w-40">{row.employee?.name}</div>
                        </td>
                        <td className="px-3 py-2 border-r border-border/40 text-muted-foreground whitespace-nowrap">{row.employee?.wpsEntity}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-right tabular-nums">{fmt(row.basicSalary)}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-right tabular-nums text-muted-foreground">{fmt(row.allowances)}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-right">
                          <input type="number" step="0.01" value={row.otherAllowance || 0}
                            onChange={e => setField(row.employeeId, 'otherAllowance', e.target.value)}
                            className={editInp} />
                        </td>
                        <td className="px-3 py-2 border-r border-border/40 text-right font-semibold tabular-nums bg-blue-50/40">{fmt(row.totalSalary)}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-center font-semibold tabular-nums text-emerald-700">{row.workDays}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-center tabular-nums text-red-600 bg-red-50/30">{row.absentDays || '—'}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-center tabular-nums">{row.otHours || '—'}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-right tabular-nums text-emerald-700 bg-emerald-50/30">{row.otAmount ? fmt(row.otAmount) : '—'}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-right tabular-nums text-red-600 bg-red-50/30">{row.absentDeduction ? fmt(row.absentDeduction) : '—'}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-right">
                          <input type="number" step="0.01" value={row.allowanceAdj || 0}
                            onChange={e => setField(row.employeeId, 'allowanceAdj', e.target.value)}
                            className={editInp} />
                        </td>
                        <td className="px-3 py-2 border-r border-border/40 text-right">
                          <input type="number" step="0.01" value={row.deduction || 0}
                            onChange={e => setField(row.employeeId, 'deduction', e.target.value)}
                            className={editInp} />
                        </td>
                        <td className="px-3 py-2 border-r border-border/40 text-right bg-purple-50/30">
                          <input type="number" step="0.01" value={row.loanDeduction || 0}
                            onChange={e => setField(row.employeeId, 'loanDeduction', e.target.value)}
                            className={`${editInp} text-purple-700`} />
                        </td>
                        <td className="px-3 py-2 border-r border-border/40 text-right">
                          <input type="number" step="0.01" value={row.adjustment || 0}
                            onChange={e => setField(row.employeeId, 'adjustment', e.target.value)}
                            className={editInp} />
                        </td>
                        <td className="px-3 py-2 border-r border-border/40 text-right font-bold tabular-nums bg-primary/5">{fmt(row.grossSalary)}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-right font-semibold tabular-nums text-blue-700 bg-blue-50/30">{row.wpsAmount ? fmt(row.wpsAmount) : '—'}</td>
                        <td className="px-3 py-2 border-r border-border/40 text-right font-semibold tabular-nums text-orange-700 bg-orange-50/30">{row.cashAmount ? fmt(row.cashAmount) : '—'}</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-primary bg-primary/8">{fmt(row.totalPayment)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                      <td className="sticky left-0 z-10 bg-muted/95 px-3 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground border-r border-border whitespace-nowrap">
                        Subtotal ({ccRows.length})
                      </td>
                      <td className="border-r border-border/40" />
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px]">{fmt(sum(ccRows,'basicSalary'))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px]">{fmt(sum(ccRows,'allowances'))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px]">{fmt(sum(ccRows,'otherAllowance'))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px] bg-blue-50/40">{fmt(sum(ccRows,'totalSalary'))}</td>
                      <td /><td /><td />
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px] text-emerald-700 bg-emerald-50/40">{fmt(sum(ccRows,'otAmount'))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px] text-red-600 bg-red-50/40">{fmt(sum(ccRows,'absentDeduction'))}</td>
                      <td /><td />
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px] text-purple-700 bg-purple-50/40">{fmt(sum(ccRows,'loanDeduction'))}</td>
                      <td />
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px] bg-primary/10">{fmt(sum(ccRows,'grossSalary'))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px] text-blue-700 bg-blue-50/40">{fmt(sum(ccRows,'wpsAmount'))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px] text-orange-700 bg-orange-50/40">{fmt(sum(ccRows,'cashAmount'))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[12px] text-primary bg-primary/10">{fmt(sum(ccRows,'totalPayment'))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}