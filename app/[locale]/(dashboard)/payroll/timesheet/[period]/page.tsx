'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Save, Loader2, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

interface Employee {
  id: string; empCode: string; name: string; costCenter: string;
  hoursPerDay: number; status: string;
}
interface Project { id: string; projectCode: string; projectName: string; }
interface Entry   { employeeId: string; day: number; hours: number | null; dayStatus: string; projectId: string | null; }

type CellState = { hours: string; status: string; projectId: string };

const STATUS_OPTS = ['P', 'A', 'SICK', 'OFF', 'H'];
const STATUS_COLOR: Record<string, string> = {
  P:    'bg-emerald-50 text-emerald-700',
  A:    'bg-red-100 text-red-700',
  SICK: 'bg-amber-100 text-amber-700',
  OFF:  'bg-slate-100 text-slate-500',
  H:    'bg-blue-50 text-blue-600',
};

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

export default function TimesheetGridPage() {
  const { locale, period } = useParams() as { locale: string; period: string };
  const [year, month] = period.split('-').map(Number);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [tsStatus,  setTsStatus]  = useState('OPEN');
  const [cells,     setCells]     = useState<Record<string, CellState>>({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [selectedProject, setSelectedProject] = useState('');

  const key = (empId: string, day: number) => `${empId}_${day}`;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/payroll/timesheets/${period}`);
    const { data } = await res.json();
    setEmployees(data.employees || []);
    setProjects(data.projects || []);

    if (data.timesheet) {
      setTsStatus(data.timesheet.status);
      const map: Record<string, CellState> = {};
      for (const e of (data.timesheet.entries || [])) {
        map[key(e.employeeId, e.day)] = {
          hours:     e.hours != null ? String(e.hours) : '',
          status:    e.dayStatus || 'P',
          projectId: e.projectId || '',
        };
      }
      setCells(map);
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const getCell = (empId: string, day: number): CellState => {
    return cells[key(empId, day)] || { hours: '', status: 'P', projectId: '' };
  };

  const setCell = (empId: string, day: number, patch: Partial<CellState>) => {
    const k = key(empId, day);
    setCells(prev => ({ ...prev, [k]: { ...getCell(empId, day), ...patch } }));
  };

  // Quick-fill: click a day header → fill same status for ALL employees
  const fillDay = (day: number, status: string) => {
    setCells(prev => {
      const next = { ...prev };
      for (const emp of employees) {
        const k = key(emp.id, day);
        next[k] = { ...(prev[k] || { hours: '', projectId: '' }), status };
      }
      return next;
    });
  };

  // Fill all days for one employee
  const fillEmployee = (empId: string, status: string, hpd: number) => {
    setCells(prev => {
      const next = { ...prev };
      for (const d of days) {
        const k = key(empId, d);
        const dow = new Date(year, month - 1, d).getDay();
        if (dow === 5) { next[k] = { ...(prev[k] || {}), status: 'OFF', hours: '0', projectId: prev[k]?.projectId || '' }; }
        else           { next[k] = { ...(prev[k] || {}), status, hours: status === 'P' ? String(hpd) : '0', projectId: prev[k]?.projectId || selectedProject }; }
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const entries: Entry[] = [];
    for (const emp of employees) {
      for (const d of days) {
        const c = getCell(emp.id, d);
        entries.push({
          employeeId: emp.id,
          day: d,
          hours:     c.hours ? parseFloat(c.hours) : null,
          dayStatus: c.status || 'P',
          projectId: c.projectId || null,
        });
      }
    }
    const res = await fetch(`/api/payroll/timesheets/${period}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (res.ok) { toast.success('Timesheet saved'); }
    else        { toast.error('Failed to save'); }
    setSaving(false);
  };

  // Navigate months
  const prevPeriod = () => {
    const d = new Date(year, month - 2, 1);
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    window.location.href = `/${locale}/payroll/timesheet/${p}`;
  };
  const nextPeriod = () => {
    const d = new Date(year, month, 1);
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    window.location.href = `/${locale}/payroll/timesheet/${p}`;
  };

  // Summary per employee
  const empSummary = (empId: string, hpd: number) => {
    let workDays = 0, absentDays = 0, sickDays = 0, otHours = 0;
    for (const d of days) {
      const c = getCell(empId, d);
      if (c.status === 'A') absentDays++;
      else if (c.status === 'SICK') sickDays++;
      else if (c.status === 'P' || c.status === 'H') {
        workDays++;
        const h = parseFloat(c.hours || '0') || hpd;
        if (h > hpd) otHours += h - hpd;
      }
    }
    return { workDays, absentDays, sickDays, otHours: Math.round(otHours * 10) / 10 };
  };

  // Group employees by cost center
  const grouped: Record<string, Employee[]> = {};
  for (const e of employees) {
    if (!grouped[e.costCenter]) grouped[e.costCenter] = [];
    grouped[e.costCenter].push(e);
  }

  const isLocked = tsStatus === 'LOCKED';

  return (
    <div className="p-2 space-y-3">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{MONTHS[month]} {year} Timesheet</h1>
              <p className="text-xs text-muted-foreground">{employees.length} employees · {daysInMonth} days</p>
            </div>
            {isLocked && (
              <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
                <Lock className="size-3" /> Locked
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={prevPeriod} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={nextPeriod} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronRight className="size-4" />
            </button>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 max-w-44">
              <option value="">Default Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
            </select>
            <Link href={`/${locale}/payroll/monthly/${period}`}>
              <Button variant="outline" size="sm">View Payroll</Button>
            </Link>
            {!isLocked && (
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? <><Loader2 className="size-4 me-1 animate-spin" />Saving…</> : <><Save className="size-4 me-1" />Save</>}
              </Button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 py-2 border-b border-border bg-muted/20 flex gap-3 flex-wrap text-xs">
          {STATUS_OPTS.map(s => (
            <span key={s} className={`px-2 py-0.5 rounded font-semibold ${STATUS_COLOR[s]}`}>{s}</span>
          ))}
          <span className="text-muted-foreground">· Click cell status to cycle · Click employee name to auto-fill row</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cc, emps]) => (
            <div key={cc} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-primary/10 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{cc}</span>
                <span className="text-xs text-muted-foreground">{emps.length} employees</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: `${daysInMonth * 42 + 260}px` }}>
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="sticky left-0 z-10 bg-muted/90 px-3 py-2 text-left font-semibold border-r border-border min-w-52">Employee</th>
                      {days.map(d => {
                        const dow = new Date(year, month - 1, d).getDay();
                        const isFri = dow === 5;
                        return (
                          <th key={d}
                            className={`px-1 py-2 text-center font-semibold border-r border-border/50 min-w-10 cursor-pointer hover:bg-primary/20 select-none ${isFri ? 'bg-red-50 text-red-500' : ''}`}
                            onClick={() => !isLocked && fillDay(d, isFri ? 'OFF' : 'P')}
                            title={`Click to mark all as ${isFri ? 'OFF' : 'P'}`}>
                            {d}
                            {isFri && <div className="text-[8px] leading-none text-red-400">Fri</div>}
                          </th>
                        );
                      })}
                      <th className="px-2 py-2 text-center font-semibold bg-muted/40 min-w-10">Work</th>
                      <th className="px-2 py-2 text-center font-semibold bg-red-50 min-w-10">Abs</th>
                      <th className="px-2 py-2 text-center font-semibold bg-amber-50 min-w-10">Sick</th>
                      <th className="px-2 py-2 text-center font-semibold bg-emerald-50 min-w-12">OT hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emps.map((emp, ei) => {
                      const sum = empSummary(emp.id, emp.hoursPerDay);
                      return (
                        <tr key={emp.id} className={ei % 2 === 0 ? 'bg-white dark:bg-background' : 'bg-muted/20'}>
                          <td className="sticky left-0 z-10 bg-inherit px-3 py-1 border-r border-border">
                            <button
                              onClick={() => !isLocked && fillEmployee(emp.id, 'P', emp.hoursPerDay)}
                              className="text-left hover:text-primary transition-colors w-full"
                              title="Click to auto-fill all days as Present">
                              <div className="font-semibold text-primary text-xs">{emp.empCode}</div>
                              <div className="text-xs text-foreground truncate max-w-44">{emp.name}</div>
                            </button>
                          </td>
                          {days.map(d => {
                            const c = getCell(emp.id, d);
                            const dow = new Date(year, month - 1, d).getDay();
                            return (
                              <td key={d} className={`border-r border-border/30 p-0 ${dow === 5 ? 'bg-red-50/50' : ''}`}>
                                <div className="flex flex-col items-center p-0.5 gap-0.5">
                                  {/* Status toggle */}
                                  <button
                                    disabled={isLocked}
                                    onClick={() => {
                                      const idx = STATUS_OPTS.indexOf(c.status || 'P');
                                      const next = STATUS_OPTS[(idx + 1) % STATUS_OPTS.length];
                                      const hpd  = emp.hoursPerDay;
                                      setCell(emp.id, d, {
                                        status: next,
                                        hours: next === 'P' || next === 'H' ? String(hpd) : next === 'OFF' ? '0' : '',
                                      });
                                    }}
                                    className={`w-full text-center rounded text-[10px] font-bold px-1 py-0.5 ${STATUS_COLOR[c.status || 'P']} hover:opacity-80 transition-opacity`}>
                                    {c.status || 'P'}
                                  </button>
                                  {/* Hours input */}
                                  {(c.status === 'P' || c.status === 'H') && (
                                    <input
                                      disabled={isLocked}
                                      type="number" step="0.5" min="0" max="16"
                                      value={c.hours}
                                      onChange={e => setCell(emp.id, d, { hours: e.target.value })}
                                      className="w-9 text-center text-[10px] border border-border/60 rounded px-0.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                                    />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="text-center font-bold px-2 text-emerald-700 bg-emerald-50/50">{sum.workDays}</td>
                          <td className="text-center font-bold px-2 text-red-600 bg-red-50/50">{sum.absentDays || ''}</td>
                          <td className="text-center font-bold px-2 text-amber-600 bg-amber-50/50">{sum.sickDays || ''}</td>
                          <td className="text-center font-bold px-2 text-primary bg-primary/5">{sum.otHours || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
