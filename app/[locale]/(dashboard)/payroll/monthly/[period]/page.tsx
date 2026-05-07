'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DollarSign, Printer, Download, Loader2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

interface Employee {
  id: string; empCode: string; name: string; costCenter: string;
  wpsEntity: string; paymentMethod: string; basicSalary: number;
  allowances: number; totalSalary: number; otherAllowance: number;
}
interface PayrollRow {
  employeeId: string; employee: Employee;
  basicSalary: number; allowances: number; otherAllowance: number; totalSalary: number;
  workDays: number; absentDays: number; otHours: number; otAmount: number;
  absentDeduction: number; allowanceAdj: number; deduction: number; adjustment: number;
  grossSalary: number; wpsAmount: number; cashAmount: number; otPayment: number;
  totalPayment: number; remarks?: string;
}

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MonthlyPayrollPage() {
  const { locale, period } = useParams() as { locale: string; period: string };
  const [year, month] = period.split('-').map(Number);
  const [rows,    setRows]    = useState<PayrollRow[]>([]);
  const [source,  setSource]  = useState<'saved' | 'computed'>('computed');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const fmt = (n: number) => n?.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '—';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/payroll/monthly/${period}`);
    const { data } = await res.json();
    setRows(data?.entries || []);
    setSource(data?.source || 'computed');
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Inline edit for adjustment/deduction/otherAllowance
  const setField = (empId: string, field: string, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.employeeId !== empId) return r;
      const updated = { ...r, [field]: parseFloat(value) || 0 };
      // Recompute gross
      updated.grossSalary  = updated.totalSalary + updated.otherAllowance - updated.absentDeduction + updated.otAmount + updated.allowanceAdj - updated.deduction + updated.adjustment;
      updated.totalPayment = updated.grossSalary;
      if (updated.employee.paymentMethod === 'Cash') {
        updated.cashAmount = updated.grossSalary;
        updated.wpsAmount  = 0;
      } else {
        updated.wpsAmount  = Math.max(0, updated.basicSalary - updated.absentDeduction);
        updated.cashAmount = Math.max(0, updated.grossSalary - updated.wpsAmount);
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/payroll/monthly/${period}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: rows }),
    });
    if (res.ok) { toast.success('Payroll saved'); setSource('saved'); }
    else        { toast.error('Failed to save payroll'); }
    setSaving(false);
  };

  const exportCSV = () => {
    const headers = ['Code','Name','Cost Center','WPS','Basic','Allowances','Other Allow','Total Salary','Work Days','Absent','OT Hrs','OT Amt','Absent Deduct','Allowance Adj','Deduction','Adj','Gross','WPS Amt','Cash','OT Pay','Total','Remarks'];
    const csvRows = rows.map(r => [
      r.employee.empCode, r.employee.name, r.employee.costCenter, r.employee.wpsEntity,
      r.basicSalary, r.allowances, r.otherAllowance, r.totalSalary,
      r.workDays, r.absentDays, r.otHours, r.otAmount.toFixed(2),
      r.absentDeduction.toFixed(2), r.allowanceAdj, r.deduction, r.adjustment,
      r.grossSalary.toFixed(2), r.wpsAmount.toFixed(2), r.cashAmount.toFixed(2),
      r.otPayment.toFixed(2), r.totalPayment.toFixed(2), r.remarks || '',
    ].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-${period}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Group by cost center
  const grouped: Record<string, PayrollRow[]> = {};
  for (const r of rows) {
    const cc = r.employee?.costCenter || 'Unknown';
    if (!grouped[cc]) grouped[cc] = [];
    grouped[cc].push(r);
  }

  const total = (arr: PayrollRow[], field: keyof PayrollRow) =>
    arr.reduce((s, r) => s + ((r[field] as number) || 0), 0);

  const prevPeriod = () => {
    const d = new Date(year, month - 2, 1);
    window.location.href = `/${locale}/payroll/monthly/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const nextPeriod = () => {
    const d = new Date(year, month, 1);
    window.location.href = `/${locale}/payroll/monthly/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className="p-2 space-y-3">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <DollarSign className="size-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Payroll — {MONTHS[month]} {year}</h1>
            <p className="text-xs text-muted-foreground">
              كشف الرواتب · {rows.length} employees ·
              {source === 'saved' ? <span className="text-emerald-600 font-semibold"> Saved</span> : <span className="text-amber-600 font-semibold"> Computed (unsaved)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevPeriod} className="p-2 rounded-lg border border-border hover:bg-muted"><ChevronLeft className="size-4" /></button>
          <button onClick={nextPeriod} className="p-2 rounded-lg border border-border hover:bg-muted"><ChevronRight className="size-4" /></button>
          <Link href={`/${locale}/payroll/timesheet/${period}`}>
            <Button variant="outline" size="sm">Edit Timesheet</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="size-4 me-1" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/${locale}/payroll/${period}/print`, '_blank')}>
            <Printer className="size-4 me-1" />Print PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 me-1 animate-spin" /> : <Save className="size-4 me-1" />}
            Save
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cc, ccRows]) => (
            <div key={cc} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-primary/10 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{cc}</span>
                <span className="text-xs text-muted-foreground font-semibold">
                  Total: {fmt(total(ccRows, 'totalPayment'))} AED · WPS: {fmt(total(ccRows, 'wpsAmount'))} · Cash: {fmt(total(ccRows, 'cashAmount'))}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: '1400px' }}>
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground">
                      <th className="px-2 py-2.5 text-left font-semibold border-r border-border/50 sticky left-0 bg-muted/90 z-10 min-w-40">Employee</th>
                      <th className="px-2 py-2.5 text-left font-semibold border-r border-border/50">VISA</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50">Basic</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50">Allow.</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50">Other Allow.</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50 bg-blue-50">Total Salary</th>
                      <th className="px-2 py-2.5 text-center font-semibold border-r border-border/50">Work Days</th>
                      <th className="px-2 py-2.5 text-center font-semibold border-r border-border/50 bg-red-50">Absent</th>
                      <th className="px-2 py-2.5 text-center font-semibold border-r border-border/50">OT Hrs</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50 bg-emerald-50">OT Amt</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50 bg-red-50">Abs Deduct</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50">Allow.Adj</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50">Deduct</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50">Adj</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50 bg-primary/10">GT / Gross</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50 bg-blue-50">WPS</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50 bg-orange-50">Cash</th>
                      <th className="px-2 py-2.5 text-right font-semibold border-r border-border/50">OT Pay</th>
                      <th className="px-2 py-2.5 text-right font-semibold bg-primary/20">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ccRows.map((row, i) => (
                      <tr key={row.employeeId} className={i % 2 === 0 ? 'bg-white dark:bg-background' : 'bg-muted/20'}>
                        <td className="sticky left-0 bg-inherit z-10 px-2 py-1.5 border-r border-border/50">
                          <div className="font-semibold text-primary">{row.employee?.empCode}</div>
                          <div className="text-foreground truncate max-w-36">{row.employee?.name}</div>
                        </td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-muted-foreground">{row.employee?.wpsEntity}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right">{fmt(row.basicSalary)}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right text-muted-foreground">{fmt(row.allowances)}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right">
                          <input type="number" step="0.01" value={row.otherAllowance || 0}
                            onChange={e => setField(row.employeeId, 'otherAllowance', e.target.value)}
                            className="w-16 text-right border border-border/40 rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right font-semibold bg-blue-50/50">{fmt(row.totalSalary)}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-center font-bold text-emerald-700">{row.workDays}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-center font-bold text-red-600 bg-red-50/30">{row.absentDays || ''}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-center">{row.otHours || ''}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right text-emerald-700 font-semibold bg-emerald-50/30">{row.otAmount ? fmt(row.otAmount) : ''}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right text-red-600 bg-red-50/30">{row.absentDeduction ? fmt(row.absentDeduction) : ''}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right">
                          <input type="number" step="0.01" value={row.allowanceAdj || 0}
                            onChange={e => setField(row.employeeId, 'allowanceAdj', e.target.value)}
                            className="w-16 text-right border border-border/40 rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right">
                          <input type="number" step="0.01" value={row.deduction || 0}
                            onChange={e => setField(row.employeeId, 'deduction', e.target.value)}
                            className="w-16 text-right border border-border/40 rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right">
                          <input type="number" step="0.01" value={row.adjustment || 0}
                            onChange={e => setField(row.employeeId, 'adjustment', e.target.value)}
                            className="w-16 text-right border border-border/40 rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right font-bold bg-primary/5">{fmt(row.grossSalary)}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right font-semibold text-blue-700 bg-blue-50/40">{row.wpsAmount ? fmt(row.wpsAmount) : '—'}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right font-semibold text-orange-700 bg-orange-50/40">{row.cashAmount ? fmt(row.cashAmount) : '—'}</td>
                        <td className="px-2 py-1.5 border-r border-border/50 text-right">{row.otPayment ? fmt(row.otPayment) : ''}</td>
                        <td className="px-2 py-1.5 text-right font-extrabold text-primary bg-primary/10">{fmt(row.totalPayment)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted border-t-2 border-primary font-bold">
                      <td colSpan={2} className="sticky left-0 bg-muted z-10 px-2 py-2 text-xs uppercase text-muted-foreground">Subtotal ({ccRows.length})</td>
                      <td className="px-2 py-2 text-right text-xs">{fmt(total(ccRows, 'basicSalary'))}</td>
                      <td className="px-2 py-2 text-right text-xs">{fmt(total(ccRows, 'allowances'))}</td>
                      <td className="px-2 py-2 text-right text-xs">{fmt(total(ccRows, 'otherAllowance'))}</td>
                      <td className="px-2 py-2 text-right text-xs bg-blue-50">{fmt(total(ccRows, 'totalSalary'))}</td>
                      <td /><td /><td />
                      <td className="px-2 py-2 text-right text-xs bg-emerald-50">{fmt(total(ccRows, 'otAmount'))}</td>
                      <td className="px-2 py-2 text-right text-xs bg-red-50">{fmt(total(ccRows, 'absentDeduction'))}</td>
                      <td /><td /><td />
                      <td className="px-2 py-2 text-right text-xs bg-primary/10">{fmt(total(ccRows, 'grossSalary'))}</td>
                      <td className="px-2 py-2 text-right text-xs bg-blue-50">{fmt(total(ccRows, 'wpsAmount'))}</td>
                      <td className="px-2 py-2 text-right text-xs bg-orange-50">{fmt(total(ccRows, 'cashAmount'))}</td>
                      <td className="px-2 py-2 text-right text-xs">{fmt(total(ccRows, 'otPayment'))}</td>
                      <td className="px-2 py-2 text-right text-xs bg-primary/20">{fmt(total(ccRows, 'totalPayment'))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Grand Total */}
          {rows.length > 0 && (
            <div className="bg-card rounded-2xl border-2 border-primary shadow-sm p-5">
              <div className="text-sm font-bold text-primary uppercase tracking-wide mb-3">Grand Total — إجمالي كشف الرواتب</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total Salary', value: total(rows, 'totalSalary'), color: 'text-foreground' },
                  { label: 'OT Amount', value: total(rows, 'otAmount'), color: 'text-emerald-600' },
                  { label: 'Absent Deductions', value: total(rows, 'absentDeduction'), color: 'text-red-600' },
                  { label: 'WPS (Bank)', value: total(rows, 'wpsAmount'), color: 'text-blue-600' },
                  { label: 'Cash', value: total(rows, 'cashAmount'), color: 'text-orange-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{label}</p>
                    <p className={`text-lg font-extrabold ${color}`}>{fmt(value)}</p>
                    <p className="text-xs text-muted-foreground">AED</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center bg-primary/10 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total Payment</p>
                <p className="text-3xl font-extrabold text-primary">{fmt(total(rows, 'totalPayment'))} AED</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
