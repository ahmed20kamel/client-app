'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, Loader2, ChevronLeft, ChevronRight, Check, Plus, X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

interface Employee {
  id: string; empCode: string; name: string; costCenter: string;
  basicSalary: number; allowances: number; totalSalary: number; hoursPerDay: number; status: string;
}
interface Project { id: string; projectCode: string; projectName: string; }
interface RowData  { absent: number; sick: number; otHours: number; notes: string; }
interface Alloc    { projectId: string; days: number; fromDay: number; toDay: number; }

function workingDaysInMonth(year: number, month: number) {
  const total = new Date(year, month, 0).getDate();
  let c = 0;
  for (let d = 1; d <= total; d++) if (new Date(year, month - 1, d).getDay() !== 5) c++;
  return c;
}
function countWorkDays(year: number, month: number, from: number, to: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const f = Math.max(1, from), t = Math.min(daysInMonth, to);
  let c = 0;
  for (let d = f; d <= t; d++) if (new Date(year, month - 1, d).getDay() !== 5) c++;
  return c;
}
function dayLabel(year: number, month: number, day: number) {
  if (!day) return '';
  return new Date(year, month - 1, day).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}
const prevPeriod = (y: number, m: number) => { const d = new Date(y, m - 2, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const nextPeriod = (y: number, m: number) => { const d = new Date(y, m,     1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

const numInp  = "w-14 h-8 text-center text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 tabular-nums";
const noteInp = "w-full h-8 px-2 text-[12px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40";

export default function TimesheetPage() {
  const { locale, period } = useParams() as { locale: string; period: string };
  const router = useRouter();
  const [year, month] = period.split('-').map(Number);
  const workDays = useMemo(() => workingDaysInMonth(year, month), [year, month]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [rows,      setRows]      = useState<Record<string, RowData>>({});
  const [allocs,    setAllocs]    = useState<Record<string, Alloc[]>>({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [tab,       setTab]       = useState<'attendance'|'projects'>('attendance');

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/payroll/timesheets/${period}`);
    const { data } = await res.json();
    setEmployees(data.employees || []);
    setProjects(data.projects   || []);

    const initRows:  Record<string, RowData>  = {};
    const initAlloc: Record<string, Alloc[]>  = {};
    for (const emp of (data.employees || [])) {
      initRows[emp.id]  = { absent: 0, sick: 0, otHours: 0, notes: '' };
      initAlloc[emp.id] = [];
    }
    if (data.timesheet?.entries) {
      for (const e of data.timesheet.entries) {
        if (e.day >= 200) {
          // Project allocation record
          if (!initAlloc[e.employeeId]) initAlloc[e.employeeId] = [];
          if (e.projectId) {
            const [fd, td] = (e.notes || '').split('-').map(Number);
            const fromDay = fd > 0 ? fd : 1;
            const toDay   = td > 0 ? td : workDays;
            initAlloc[e.employeeId].push({ projectId: e.projectId, days: e.hours || 0, fromDay, toDay });
          }
        } else {
          // Attendance
          if (!initRows[e.employeeId]) initRows[e.employeeId] = { absent: 0, sick: 0, otHours: 0, notes: '' };
          if (e.dayStatus === 'A')    initRows[e.employeeId].absent++;
          if (e.dayStatus === 'SICK') initRows[e.employeeId].sick++;
          if (e.notes) initRows[e.employeeId].notes = e.notes;
          const emp = data.employees?.find((x: Employee) => x.id === e.employeeId);
          if (emp && (e.dayStatus === 'P' || e.dayStatus === 'H') && e.hours && e.hours > 8) {
            initRows[e.employeeId].otHours += e.hours - 8;
          }
        }
      }
    }
    setRows(initRows);
    setAllocs(initAlloc);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const setRow   = (id: string, p: Partial<RowData>) => setRows(r => ({ ...r, [id]: { ...r[id], ...p } }));
  const setAlloc = (empId: string, idx: number, p: Partial<Alloc>) =>
    setAllocs(a => ({
      ...a,
      [empId]: a[empId].map((x, i) => {
        if (i !== idx) return x;
        const n = { ...x, ...p };
        if (('fromDay' in p || 'toDay' in p) && n.fromDay > 0 && n.toDay >= n.fromDay)
          n.days = countWorkDays(year, month, n.fromDay, n.toDay);
        return n;
      }),
    }));
  const addAlloc = (empId: string) =>
    setAllocs(a => ({ ...a, [empId]: [...(a[empId]||[]), { projectId: '', days: 0, fromDay: 1, toDay: workDays }] }));
  const removeAlloc = (empId: string, idx: number) => setAllocs(a => ({ ...a, [empId]: a[empId].filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    setSaving(true);
    const entries: object[] = [];

    for (const emp of employees) {
      const row  = rows[emp.id] ?? { absent: 0, sick: 0, otHours: 0, notes: '' };
      const net  = Math.max(0, workDays - row.absent - row.sick);
      const otPerDay = net > 0 ? row.otHours / net : 0;
      let day = 1;
      for (let i = 0; i < row.absent; i++) entries.push({ employeeId: emp.id, day: day++, hours: 0, dayStatus: 'A', notes: null });
      for (let i = 0; i < row.sick;   i++) entries.push({ employeeId: emp.id, day: day++, hours: 0, dayStatus: 'SICK', notes: null });
      for (let i = 0; i < net; i++)        entries.push({ employeeId: emp.id, day: day++, hours: 8 + otPerDay, dayStatus: 'P', notes: row.notes || null });
      // Project allocations at day 200+
      const empAllocs = allocs[emp.id] || [];
      empAllocs.forEach((a, idx) => {
        if (a.projectId && a.days > 0) {
          const rangeNotes = a.fromDay && a.toDay ? `${a.fromDay}-${a.toDay}` : null;
          entries.push({ employeeId: emp.id, day: 200 + idx, hours: a.days, dayStatus: 'PROJECT', projectId: a.projectId, notes: rangeNotes });
        }
      });
    }

    const res = await fetch(`/api/payroll/timesheets/${period}/entries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (res.ok) { toast.success('Saved'); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else        { toast.error('Failed to save'); }
    setSaving(false);
  };

  const grouped = useMemo(() => {
    const g: Record<string, Employee[]> = {};
    for (const e of employees) { if (!g[e.costCenter]) g[e.costCenter] = []; g[e.costCenter].push(e); }
    return g;
  }, [employees]);

  const totals = useMemo(() => {
    let absent = 0, sick = 0, ot = 0;
    for (const r of Object.values(rows)) { absent += r.absent; sick += r.sick; ot += r.otHours; }
    return { absent, sick, ot };
  }, [rows]);

  // Project cost summary
  const projectCosts = useMemo(() => {
    const map: Record<string, { project: Project; totalDays: number; totalCost: number; employees: {emp: Employee; days: number; cost: number; fromDay: number; toDay: number}[] }> = {};
    for (const emp of employees) {
      const empAllocs = allocs[emp.id] || [];
      const dailyRate = (emp.totalSalary || (emp.basicSalary + emp.allowances)) / workDays;
      for (const a of empAllocs) {
        if (!a.projectId || !a.days) continue;
        const proj = projects.find(p => p.id === a.projectId);
        if (!proj) continue;
        if (!map[a.projectId]) map[a.projectId] = { project: proj, totalDays: 0, totalCost: 0, employees: [] };
        const cost = dailyRate * a.days;
        map[a.projectId].totalDays += a.days;
        map[a.projectId].totalCost += cost;
        map[a.projectId].employees.push({ emp, days: a.days, cost, fromDay: a.fromDay, toDay: a.toDay });
      }
    }
    return Object.values(map).sort((a, b) => b.totalCost - a.totalCost);
  }, [allocs, employees, projects]);

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-3">

      {/* ── Header ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 bg-muted/40 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">{MONTHS[month]} {year} — Attendance</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">{employees.length} employees · {workDays} working days</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/${locale}/payroll/timesheet/${prevPeriod(year,month)}`)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="size-4" /></button>
            <button onClick={() => router.push(`/${locale}/payroll/timesheet/${nextPeriod(year,month)}`)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="size-4" /></button>
            <Link href={`/${locale}/payroll/monthly/${period}`}><Button variant="outline" size="sm">View Payroll</Button></Link>
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 min-w-20">
              {saving ? <><Loader2 className="size-3.5 animate-spin" />Saving…</> : saved ? <><Check className="size-3.5" />Saved</> : <><Save className="size-3.5" />Save</>}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-stretch divide-x divide-border border-b-2 border-border">
          {[
            { label: 'Working Days', val: workDays, cls: '' },
            { label: 'Employees',    val: employees.length, cls: '' },
            { label: 'Absences',     val: totals.absent,    cls: totals.absent > 0 ? 'text-red-600' : '' },
            { label: 'Sick Days',    val: totals.sick,      cls: totals.sick > 0 ? 'text-amber-600' : '' },
            { label: 'OT Hours',     val: totals.ot,        cls: totals.ot > 0 ? 'text-primary' : '' },
          ].map(({ label, val, cls }) => (
            <div key={label} className="flex-1 px-5 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
              <p className={cn('text-xl font-semibold tabular-nums mt-0.5', cls)}>{val}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/10">
          {(['attendance', 'projects'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-5 py-2.5 text-[12px] font-medium border-b-2 transition-colors',
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t === 'attendance' ? 'Attendance' : 'Project Allocation'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : tab === 'attendance' ? (

        /* ══ ATTENDANCE TAB ══ */
        <div className="space-y-3">
          {Object.entries(grouped).map(([cc, emps]) => {
            const ccAbsent = emps.reduce((s, e) => s + (rows[e.id]?.absent  ?? 0), 0);
            const ccSick   = emps.reduce((s, e) => s + (rows[e.id]?.sick    ?? 0), 0);
            const ccOT     = emps.reduce((s, e) => s + (rows[e.id]?.otHours ?? 0), 0);
            return (
              <div key={cc} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{cc}</span>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span>{emps.length} employees</span>
                    {ccAbsent > 0 && <span className="text-red-500">{ccAbsent} absent</span>}
                    {ccSick   > 0 && <span className="text-amber-600">{ccSick} sick</span>}
                    {ccOT     > 0 && <span className="text-primary">{ccOT}h OT</span>}
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="px-4 h-9 text-left text-[11px] font-medium text-muted-foreground w-6">#</th>
                      <th className="px-4 h-9 text-left text-[11px] font-medium text-muted-foreground w-24">Code</th>
                      <th className="px-4 h-9 text-left text-[11px] font-medium text-muted-foreground">Name</th>
                      <th className="px-4 h-9 text-center text-[11px] font-medium text-muted-foreground w-24">Work Days</th>
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
                      return (
                        <tr key={emp.id} className={cn('transition-colors', (row.absent > 0 || row.sick > 0) ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-muted/20')}>
                          <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5 font-mono text-[12px] font-semibold text-primary">{emp.empCode}</td>
                          <td className="px-4 py-2.5 text-[13px] font-medium">{emp.name}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn('text-[13px] font-semibold tabular-nums', net < workDays ? 'text-red-600' : 'text-emerald-700')}>{net}</span>
                            <span className="text-[10px] text-muted-foreground ms-1">/ {workDays}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input type="number" min="0" max={workDays} step="1" value={row.absent || ''} placeholder="0"
                              onChange={e => setRow(emp.id, { absent: Math.max(0, parseInt(e.target.value)||0) })}
                              className={cn(numInp, row.absent > 0 && 'border-red-300 text-red-600 bg-red-50/50')} />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input type="number" min="0" max={workDays} step="1" value={row.sick || ''} placeholder="0"
                              onChange={e => setRow(emp.id, { sick: Math.max(0, parseInt(e.target.value)||0) })}
                              className={cn(numInp, row.sick > 0 && 'border-amber-300 text-amber-700 bg-amber-50/50')} />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input type="number" min="0" step="0.5" value={row.otHours || ''} placeholder="0"
                              onChange={e => setRow(emp.id, { otHours: parseFloat(e.target.value)||0 })}
                              className={cn(numInp, row.otHours > 0 && 'border-primary/40 text-primary bg-primary/5')} />
                          </td>
                          <td className="px-4 py-2.5">
                            <input value={row.notes} placeholder="Optional notes…"
                              onChange={e => setRow(emp.id, { notes: e.target.value })}
                              className={noteInp} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td colSpan={3} className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Subtotal</td>
                      <td className="px-4 py-2 text-center text-[12px] font-semibold text-emerald-700 tabular-nums">
                        {emps.reduce((s, e) => s + Math.max(0, workDays - (rows[e.id]?.absent??0) - (rows[e.id]?.sick??0)), 0)}
                      </td>
                      <td className="px-4 py-2 text-center text-[12px] font-semibold text-red-600 tabular-nums">{ccAbsent || '—'}</td>
                      <td className="px-4 py-2 text-center text-[12px] font-semibold text-amber-600 tabular-nums">{ccSick || '—'}</td>
                      <td className="px-4 py-2 text-center text-[12px] font-semibold text-primary tabular-nums">{ccOT || '—'}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>

      ) : (

        /* ══ PROJECT ALLOCATION TAB ══ */
        <div className="space-y-3">

          {/* Instructions */}
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <p className="text-[13px] font-medium">Assign each employee's work days to projects</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              The total allocated days per employee should equal their net work days. This data is used to calculate each project's labor cost.
            </p>
          </div>

          {/* Allocation table */}
          {Object.entries(grouped).map(([cc, emps]) => (
            <div key={cc} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{cc}</span>
              </div>
              <div className="divide-y divide-border/40">
                {emps.map((emp) => {
                  const net        = Math.max(0, workDays - (rows[emp.id]?.absent??0) - (rows[emp.id]?.sick??0));
                  const empAllocs  = allocs[emp.id] || [];
                  const allocTotal = empAllocs.reduce((s, a) => s + (a.days || 0), 0);
                  const diff       = net - allocTotal;
                  return (
                    <div key={emp.id} className="px-4 py-3 flex items-start gap-4">
                      {/* Employee info */}
                      <div className="w-48 shrink-0 pt-1">
                        <div className="font-mono text-[12px] font-semibold text-primary">{emp.empCode}</div>
                        <div className="text-[12px] text-foreground truncate">{emp.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">Net days: <strong>{net}</strong></div>
                      </div>

                      {/* Allocations */}
                      <div className="flex-1 space-y-2">
                        {empAllocs.length === 0 && (
                          <p className="text-[12px] text-muted-foreground italic">No projects assigned yet</p>
                        )}
                        {empAllocs.map((a, idx) => {
                          const proj      = projects.find(p => p.id === a.projectId);
                          const daysInMon = new Date(year, month, 0).getDate();
                          const cost      = a.days > 0 ? ((emp.totalSalary || emp.basicSalary + emp.allowances) / workDays) * a.days : 0;
                          return (
                            <div key={idx} className="flex items-center gap-2 flex-wrap">
                              <select
                                value={a.projectId}
                                onChange={e => setAlloc(emp.id, idx, { projectId: e.target.value })}
                                className="h-8 flex-1 max-w-[220px] border border-border rounded-md px-2 text-[12px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                                <option value="">— Select project —</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>)}
                              </select>

                              {/* Day range */}
                              <div className="flex items-center gap-1.5 bg-muted/30 border border-border/60 rounded-lg px-2.5 py-1">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Day</span>
                                <input
                                  type="number" min="1" max={daysInMon} step="1"
                                  value={a.fromDay || ''}
                                  placeholder="1"
                                  onChange={e => setAlloc(emp.id, idx, { fromDay: Math.max(1, parseInt(e.target.value)||1) })}
                                  className="w-10 h-6 text-center text-[12px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 tabular-nums"
                                />
                                <span className="text-[11px] text-muted-foreground">→</span>
                                <input
                                  type="number" min="1" max={daysInMon} step="1"
                                  value={a.toDay || ''}
                                  placeholder={String(workDays)}
                                  onChange={e => setAlloc(emp.id, idx, { toDay: Math.min(daysInMon, parseInt(e.target.value)||workDays) })}
                                  className="w-10 h-6 text-center text-[12px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 tabular-nums"
                                />
                              </div>

                              {/* Computed days badge */}
                              {a.fromDay > 0 && a.toDay >= a.fromDay ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tabular-nums">
                                  {a.days} days
                                  {a.fromDay && a.toDay && (
                                    <span className="text-[10px] text-primary/60 font-normal">
                                      ({dayLabel(year, month, a.fromDay)} – {dayLabel(year, month, a.toDay)})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <input
                                  type="number" min="0" max={net} step="1"
                                  value={a.days || ''}
                                  placeholder="days"
                                  onChange={e => setAlloc(emp.id, idx, { days: parseInt(e.target.value)||0 })}
                                  className="w-14 h-8 text-center text-[12px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 tabular-nums"
                                />
                              )}

                              {proj && cost > 0 && (
                                <span className="text-[11px] text-muted-foreground">= {fmt(cost)} AED</span>
                              )}

                              <button onClick={() => removeAlloc(emp.id, idx)}
                                className="p-1 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                                <X className="size-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        <button onClick={() => addAlloc(emp.id)}
                          className="flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 transition-colors mt-1">
                          <Plus className="size-3.5" /> Add project
                        </button>
                      </div>

                      {/* Balance indicator */}
                      <div className={cn('text-[12px] font-semibold tabular-nums pt-1 min-w-20 text-right',
                        diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600')}>
                        {allocTotal}/{net} days
                        {diff !== 0 && <div className="text-[10px] font-normal">{diff > 0 ? `${diff} unassigned` : `${Math.abs(diff)} over`}</div>}
                        {diff === 0 && allocTotal > 0 && <div className="text-[10px] font-normal text-emerald-600">✓ balanced</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Project Cost Summary */}
          {projectCosts.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
                <FolderOpen className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Project Cost Summary — {MONTHS[month]} {year}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="px-4 h-9 text-left text-[11px] font-medium text-muted-foreground">Project</th>
                    <th className="px-4 h-9 text-center text-[11px] font-medium text-muted-foreground">Employees</th>
                    <th className="px-4 h-9 text-center text-[11px] font-medium text-muted-foreground">Total Days</th>
                    <th className="px-4 h-9 text-right text-[11px] font-medium text-muted-foreground">Labor Cost (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {projectCosts.map(({ project, totalDays, totalCost, employees: empList }) => (
                    <>
                      <tr key={project.id} className="bg-muted/10">
                        <td className="px-4 py-2.5" colSpan={2}>
                          <div className="font-mono text-[12px] font-semibold text-primary">{project.projectCode}</div>
                          <div className="text-[11px] text-muted-foreground">{project.projectName}</div>
                        </td>
                        <td className="px-4 py-2.5 text-center text-[12px] font-bold tabular-nums">{totalDays} days</td>
                        <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-primary">{fmt(totalCost)} AED</td>
                      </tr>
                      {empList.map(({ emp, days, cost, fromDay, toDay }) => (
                        <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="pl-8 pr-4 py-2 border-l-2 border-primary/20">
                            <span className="font-mono text-[11px] text-primary/70 mr-2">{emp.empCode}</span>
                            <span className="text-[12px]">{emp.name}</span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {fromDay > 0 && toDay > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                {dayLabel(year, month, fromDay)} → {dayLabel(year, month, toDay)}
                              </span>
                            ) : <span className="text-[11px] text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2 text-center text-[11px] tabular-nums text-muted-foreground">{days} days</td>
                          <td className="px-4 py-2 text-right text-[12px] tabular-nums text-muted-foreground">{fmt(cost)}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td colSpan={2} className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">Total</td>
                    <td className="px-4 py-2.5 text-center text-[12px] font-bold tabular-nums">
                      {projectCosts.reduce((s, p) => s + p.totalDays, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-primary">
                      {fmt(projectCosts.reduce((s, p) => s + p.totalCost, 0))} AED
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
