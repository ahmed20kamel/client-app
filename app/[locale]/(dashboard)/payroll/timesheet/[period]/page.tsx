'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

interface Employee {
  id: string; empCode: string; name: string; costCenter: string;
  basicSalary: number; allowances: number; hoursPerDay: number; status: string;
}

interface RowData {
  absent:  number;
  sick:    number;
  otHours: number;
  notes:   string;
}

function workingDaysInMonth(year: number, month: number): number {
  const total = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= total; d++) {
    if (new Date(year, month - 1, d).getDay() !== 5) count++;
  }
  return count;
}

function prevMonth(year: number, month: number) {
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMonth(year: number, month: number) {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const numInp = "w-14 h-8 text-center text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 tabular-nums";
const noteInp = "w-full h-8 px-2 text-[12px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40";

export default function TimesheetPage() {
  const { locale, period } = useParams() as { locale: string; period: string };
  const router = useRouter();
  const [year, month] = period.split('-').map(Number);

  const workDays = useMemo(() => workingDaysInMonth(year, month), [year, month]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows,      setRows]      = useState<Record<string, RowData>>({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/payroll/timesheets/${period}`);
    const { data } = await res.json();

    setEmployees(data.employees || []);

    // Reconstruct summary from stored entries (count by status per employee)
    const init: Record<string, RowData> = {};
    for (const emp of (data.employees || [])) {
      init[emp.id] = { absent: 0, sick: 0, otHours: 0, notes: '' };
    }
    if (data.timesheet?.entries) {
      for (const e of data.timesheet.entries) {
        if (!init[e.employeeId]) init[e.employeeId] = { absent: 0, sick: 0, otHours: 0, notes: '' };
        if (e.dayStatus === 'A')    init[e.employeeId].absent++;
        if (e.dayStatus === 'SICK') init[e.employeeId].sick++;
        if (e.dayStatus === 'P' || e.dayStatus === 'H') {
          const hpd = data.employees?.find((x: Employee) => x.id === e.employeeId)?.hoursPerDay ?? 9;
          if (e.hours && e.hours > hpd) init[e.employeeId].otHours += e.hours - hpd;
        }
        if (e.notes) init[e.employeeId].notes = e.notes;
      }
    }
    setRows(init);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const setRow = (empId: string, patch: Partial<RowData>) =>
    setRows(r => ({ ...r, [empId]: { ...r[empId], ...patch } }));

  const handleSave = async () => {
    setSaving(true);
    // Build entries from summary: absent + sick days get assigned to day slots
    const entries: { employeeId: string; day: number; hours: number | null; dayStatus: string; notes: string | null }[] = [];
    for (const emp of employees) {
      const row  = rows[emp.id] ?? { absent: 0, sick: 0, otHours: 0, notes: '' };
      const hpd  = emp.hoursPerDay;
      const net  = Math.max(0, workDays - row.absent - row.sick);
      const otPerDay = net > 0 ? row.otHours / net : 0;
      let day = 1;
      // Absent days
      for (let i = 0; i < row.absent; i++) { entries.push({ employeeId: emp.id, day: day++, hours: 0, dayStatus: 'A', notes: null }); }
      // Sick days
      for (let i = 0; i < row.sick;   i++) { entries.push({ employeeId: emp.id, day: day++, hours: 0, dayStatus: 'SICK', notes: null }); }
      // Present days
      for (let i = 0; i < net; i++) {
        entries.push({ employeeId: emp.id, day: day++, hours: hpd + otPerDay, dayStatus: 'P', notes: row.notes || null });
      }
    }
    const res = await fetch(`/api/payroll/timesheets/${period}/entries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (res.ok) { toast.success('Attendance saved'); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else        { toast.error('Failed to save'); }
    setSaving(false);
  };

  // Group by cost center
  const grouped = useMemo(() => {
    const g: Record<string, Employee[]> = {};
    for (const e of employees) {
      if (!g[e.costCenter]) g[e.costCenter] = [];
      g[e.costCenter].push(e);
    }
    return g;
  }, [employees]);

  // Totals
  const totals = useMemo(() => {
    let totalAbsent = 0, totalSick = 0, totalOT = 0;
    for (const r of Object.values(rows)) {
      totalAbsent += r.absent; totalSick += r.sick; totalOT += r.otHours;
    }
    return { totalAbsent, totalSick, totalOT };
  }, [rows]);

  return (
    <div className="space-y-3">

      {/* ── Header card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 bg-muted/40 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">{MONTHS[month]} {year} — Attendance</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {employees.length} employees · {workDays} working days this month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/${locale}/payroll/timesheet/${prevMonth(year, month)}`)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => router.push(`/${locale}/payroll/timesheet/${nextMonth(year, month)}`)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronRight className="size-4" />
            </button>
            <Link href={`/${locale}/payroll/monthly/${period}`}>
              <Button variant="outline" size="sm">View Payroll</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 min-w-20">
              {saving ? <><Loader2 className="size-3.5 animate-spin" />Saving…</>
                      : saved  ? <><Check className="size-3.5" />Saved</>
                               : <><Save className="size-3.5" />Save</>}
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-stretch divide-x divide-border border-b border-border text-center">
          <div className="flex-1 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Working Days</p>
            <p className="text-lg font-semibold tabular-nums mt-0.5">{workDays}</p>
          </div>
          <div className="flex-1 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Employees</p>
            <p className="text-lg font-semibold tabular-nums mt-0.5">{employees.length}</p>
          </div>
          <div className="flex-1 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-500">Total Absences</p>
            <p className="text-lg font-semibold tabular-nums mt-0.5 text-red-600">{totals.totalAbsent}</p>
          </div>
          <div className="flex-1 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">Sick Days</p>
            <p className="text-lg font-semibold tabular-nums mt-0.5 text-amber-600">{totals.totalSick}</p>
          </div>
          <div className="flex-1 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">OT Hours</p>
            <p className="text-lg font-semibold tabular-nums mt-0.5 text-primary">{totals.totalOT}</p>
          </div>
        </div>
      </div>

      {/* ── Data ── */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cc, emps]) => {
            const ccAbsent = emps.reduce((s, e) => s + (rows[e.id]?.absent  ?? 0), 0);
            const ccSick   = emps.reduce((s, e) => s + (rows[e.id]?.sick    ?? 0), 0);
            const ccOT     = emps.reduce((s, e) => s + (rows[e.id]?.otHours ?? 0), 0);

            return (
              <div key={cc} className="rounded-xl border border-border bg-card overflow-hidden">

                {/* Group header */}
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{cc}</span>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span>{emps.length} employees</span>
                    {ccAbsent > 0 && <span className="text-red-500">{ccAbsent} absent</span>}
                    {ccSick   > 0 && <span className="text-amber-600">{ccSick} sick</span>}
                    {ccOT     > 0 && <span className="text-primary">{ccOT}h OT</span>}
                  </div>
                </div>

                {/* Table */}
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="px-4 h-9 text-left text-[11px] font-medium text-muted-foreground w-6">#</th>
                      <th className="px-4 h-9 text-left text-[11px] font-medium text-muted-foreground w-24">Code</th>
                      <th className="px-4 h-9 text-left text-[11px] font-medium text-muted-foreground">Name</th>
                      <th className="px-4 h-9 text-center text-[11px] font-medium text-muted-foreground w-20">Work Days</th>
                      <th className="px-4 h-9 text-center text-[11px] font-medium text-red-500 w-20">Absent</th>
                      <th className="px-4 h-9 text-center text-[11px] font-medium text-amber-600 w-20">Sick</th>
                      <th className="px-4 h-9 text-center text-[11px] font-medium text-primary w-20">OT (hrs)</th>
                      <th className="px-4 h-9 text-left text-[11px] font-medium text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {emps.map((emp, i) => {
                      const row = rows[emp.id] ?? { absent: 0, sick: 0, otHours: 0, notes: '' };
                      const net = Math.max(0, workDays - row.absent - row.sick);
                      const isIssue = row.absent > 0 || row.sick > 0;
                      return (
                        <tr key={emp.id} className={cn('transition-colors', isIssue ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-muted/20')}>
                          <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5 font-mono text-[12px] font-semibold text-primary">{emp.empCode}</td>
                          <td className="px-4 py-2.5 text-[13px] font-medium">{emp.name}</td>
                          {/* Work Days — auto calculated, read-only */}
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn(
                              'inline-block min-w-[2rem] text-[13px] font-semibold tabular-nums',
                              net < workDays ? 'text-red-600' : 'text-emerald-700'
                            )}>
                              {net}
                            </span>
                            <span className="text-[10px] text-muted-foreground ms-1">/ {workDays}</span>
                          </td>
                          {/* Absent */}
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number" min="0" max={workDays} step="1"
                              value={row.absent || ''}
                              placeholder="0"
                              onChange={e => {
                                const v = Math.max(0, parseInt(e.target.value) || 0);
                                setRow(emp.id, { absent: v });
                              }}
                              className={cn(numInp, row.absent > 0 && 'border-red-300 text-red-600 bg-red-50/50')}
                            />
                          </td>
                          {/* Sick */}
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number" min="0" max={workDays} step="1"
                              value={row.sick || ''}
                              placeholder="0"
                              onChange={e => {
                                const v = Math.max(0, parseInt(e.target.value) || 0);
                                setRow(emp.id, { sick: v });
                              }}
                              className={cn(numInp, row.sick > 0 && 'border-amber-300 text-amber-700 bg-amber-50/50')}
                            />
                          </td>
                          {/* OT */}
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number" min="0" step="0.5"
                              value={row.otHours || ''}
                              placeholder="0"
                              onChange={e => setRow(emp.id, { otHours: parseFloat(e.target.value) || 0 })}
                              className={cn(numInp, row.otHours > 0 && 'border-primary/40 text-primary bg-primary/5')}
                            />
                          </td>
                          {/* Notes */}
                          <td className="px-4 py-2.5">
                            <input
                              value={row.notes}
                              placeholder="Optional notes…"
                              onChange={e => setRow(emp.id, { notes: e.target.value })}
                              className={noteInp}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Group totals */}
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td colSpan={3} className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Subtotal — {cc}
                      </td>
                      <td className="px-4 py-2 text-center text-[12px] font-semibold text-emerald-700 tabular-nums">
                        {emps.reduce((s, e) => s + Math.max(0, workDays - (rows[e.id]?.absent ?? 0) - (rows[e.id]?.sick ?? 0)), 0)}
                      </td>
                      <td className="px-4 py-2 text-center text-[12px] font-semibold text-red-600 tabular-nums">
                        {ccAbsent || '—'}
                      </td>
                      <td className="px-4 py-2 text-center text-[12px] font-semibold text-amber-600 tabular-nums">
                        {ccSick || '—'}
                      </td>
                      <td className="px-4 py-2 text-center text-[12px] font-semibold text-primary tabular-nums">
                        {ccOT || '—'}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
