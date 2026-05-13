'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, Loader2, ChevronLeft, ChevronRight, Check, Plus, X, FolderOpen, Settings, Lock } from 'lucide-react';
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
interface DayEntry { status: 'P'|'A'|'SICK'|'AL'|'PH'; hours: number; projectId: string; }
interface AttendanceSetting { checkInStart: number; checkInEnd: number; graceMinutes: number; timezone: string; }

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

const STATUS_COLORS: Record<string, string> = {
  P:    '#d1fae5',  // green-100
  A:    '#fee2e2',  // red-100
  SICK: '#fef9c3',  // yellow-100
  AL:   '#ede9fe',  // violet-100
  PH:   '#e2e8f0',  // slate-200
};
const STATUS_LABELS: Record<string, string> = { P: 'P', A: 'A', SICK: 'SL', AL: 'AL', PH: 'PH' };
const STATUS_TEXT_COLOR: Record<string, string> = {
  P: '#065f46', A: '#991b1b', SICK: '#92400e', AL: '#5b21b6', PH: '#475569',
};

export default function TimesheetPage() {
  const { locale, period } = useParams() as { locale: string; period: string };
  const router = useRouter();
  const [year, month] = period.split('-').map(Number);
  const workDays = useMemo(() => workingDaysInMonth(year, month), [year, month]);
  const calendarDays = useMemo(() => {
    const n = new Date(year, month, 0).getDate();
    return Array.from({ length: n }, (_, i) => ({ day: i + 1, dow: new Date(year, month - 1, i + 1).getDay() }));
  }, [year, month]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [rows,      setRows]      = useState<Record<string, RowData>>({});
  const [allocs,    setAllocs]    = useState<Record<string, Alloc[]>>({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [tab,       setTab]       = useState<'attendance'|'projects'|'daily'>('attendance');
  const [dailyData, setDailyData] = useState<Record<string, Record<number, DayEntry>>>({});
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // Attendance window
  const [attSettings, setAttSettings]     = useState<AttendanceSetting>({ checkInStart: 6, checkInEnd: 8, graceMinutes: 0, timezone: 'Asia/Dubai' });
  const [showAttSettings, setShowAttSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<AttendanceSetting>({ checkInStart: 6, checkInEnd: 8, graceMinutes: 0, timezone: 'Asia/Dubai' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [nowDubai, setNowDubai] = useState({ hour: 0, minute: 0, day: 0, month: 0, year: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/payroll/timesheets/${period}`);
    const { data } = await res.json();
    setEmployees(data.employees || []);
    setProjects(data.projects   || []);

    const initRows:      Record<string, RowData>                 = {};
    const initAlloc:     Record<string, Alloc[]>                 = {};
    const initDailyData: Record<string, Record<number, DayEntry>> = {};
    for (const emp of (data.employees || [])) {
      initRows[emp.id]      = { absent: 0, sick: 0, otHours: 0, notes: '' };
      initAlloc[emp.id]     = [];
      initDailyData[emp.id] = {};
    }
    if (data.timesheet?.entries) {
      for (const e of data.timesheet.entries) {
        if (e.day >= 300) {
          // Daily site log: day = 300 + calendarDay
          if (initDailyData[e.employeeId]) {
            const calDay = e.day - 300;
            // 'SITE' was the old dayStatus before this refactor → treat as Present
            const rawStatus = e.dayStatus === 'SITE' ? 'P' : e.dayStatus;
            const status = (['P','A','SICK','AL','PH'] as string[]).includes(rawStatus)
              ? rawStatus as 'P'|'A'|'SICK'|'AL'|'PH'
              : 'P';
            initDailyData[e.employeeId][calDay] = {
              status,
              hours:     e.hours ?? 8,
              projectId: e.projectId || '',
            };
          }
        } else if (e.day >= 200) {
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
    // Recompute absent/sick/OT from daily site log entries (day >= 300)
    for (const [empId, days] of Object.entries(initDailyData)) {
      if (Object.keys(days).length === 0) continue;
      let absent = 0, sick = 0, otHours = 0;
      for (const entry of Object.values(days)) {
        if (entry.status === 'A')    absent++;
        if (entry.status === 'SICK') sick++;
        if (entry.status === 'P' && entry.hours > 8)
          otHours += entry.hours - 8;
      }
      initRows[empId] = { ...initRows[empId], absent, sick, otHours: Math.round(otHours * 100) / 100 };
    }
    setRows(initRows);
    setAllocs(initAlloc);
    setDailyData(initDailyData);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Fetch attendance window settings
  useEffect(() => {
    fetch('/api/payroll/attendance/settings')
      .then(r => r.json())
      .then(s => setAttSettings(s))
      .catch(() => {});
  }, []);

  // Dubai clock — updates every 30s
  useEffect(() => {
    const update = () => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dubai',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date());
      const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0');
      setNowDubai({ hour: get('hour') % 24, minute: get('minute'), day: get('day'), month: get('month'), year: get('year') });
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, []);

  // Keep attendance rows in sync with daily site log entries
  useEffect(() => {
    if (Object.keys(dailyData).length === 0) return;
    setRows(prev => {
      const updated = { ...prev };
      for (const [empId, days] of Object.entries(dailyData)) {
        if (Object.keys(days).length === 0) continue;
        let absent = 0, sick = 0, otHours = 0;
        for (const entry of Object.values(days)) {
          if (entry.status === 'A')    absent++;
          if (entry.status === 'SICK') sick++;
          if (entry.status === 'P' && entry.hours > 8)
            otHours += entry.hours - 8;
        }
        updated[empId] = { ...updated[empId], absent, sick, otHours: Math.round(otHours * 100) / 100 };
      }
      return updated;
    });
  }, [dailyData]);

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
  const addAlloc    = (empId: string) =>
    setAllocs(a => ({ ...a, [empId]: [...(a[empId]||[]), { projectId: '', days: 0, fromDay: 1, toDay: workDays }] }));
  const removeAlloc = (empId: string, idx: number) => setAllocs(a => ({ ...a, [empId]: a[empId].filter((_, i) => i !== idx) }));

  const setDayEntry = (empId: string, day: number, patch: Partial<DayEntry>) =>
    setDailyData(s => {
      const existing = s[empId]?.[day];
      const updated: DayEntry = {
        status:    patch.status    ?? existing?.status    ?? 'P',
        hours:     patch.hours     ?? existing?.hours     ?? 8,
        projectId: patch.projectId ?? existing?.projectId ?? '',
      };
      return { ...s, [empId]: { ...(s[empId] || {}), [day]: updated } };
    });
  const clearDay = (empId: string, day: number) =>
    setDailyData(s => {
      const empData = { ...(s[empId] || {}) };
      delete empData[day];
      return { ...s, [empId]: empData };
    });
  const fillAll = (empId: string, projectId: string) => {
    if (!projectId) {
      setDailyData(s => ({ ...s, [empId]: {} }));
    } else {
      const updates: Record<number, DayEntry> = {};
      for (const { day, dow } of calendarDays) if (dow !== 5) updates[day] = { status: 'P', hours: 8, projectId };
      setDailyData(s => ({ ...s, [empId]: { ...(s[empId] || {}), ...updates } }));
    }
    setActiveCell(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const entries: object[] = [];

    for (const emp of employees) {
      const row  = rows[emp.id] ?? { absent: 0, sick: 0, otHours: 0, notes: '' };
      const net  = Math.max(0, workDays - row.absent - row.sick);
      const otPerDay = net > 0 ? row.otHours / net : 0;
      let day = 1;
      for (let i = 0; i < row.absent; i++) entries.push({ employeeId: emp.id, day: day++, hours: 0,           dayStatus: 'A',    notes: null });
      for (let i = 0; i < row.sick;   i++) entries.push({ employeeId: emp.id, day: day++, hours: 0,           dayStatus: 'SICK', notes: null });
      for (let i = 0; i < net; i++)        entries.push({ employeeId: emp.id, day: day++, hours: 8 + otPerDay, dayStatus: 'P',    notes: row.notes || null });
      // Project allocations at day 200+
      const empAllocs = allocs[emp.id] || [];
      empAllocs.forEach((a, idx) => {
        if (a.projectId && a.days > 0) {
          const rangeNotes = a.fromDay && a.toDay ? `${a.fromDay}-${a.toDay}` : null;
          entries.push({ employeeId: emp.id, day: 200 + idx, hours: a.days, dayStatus: 'PROJECT', projectId: a.projectId, notes: rangeNotes });
        }
      });
      // Daily site log at day 300 + calendarDay
      const empDailyData = dailyData[emp.id] || {};
      for (const [calDay, entry] of Object.entries(empDailyData)) {
        entries.push({
          employeeId: emp.id,
          day:        300 + parseInt(calDay),
          hours:      entry.hours,
          dayStatus:  entry.status,
          projectId:  entry.status === 'P' ? (entry.projectId || null) : null,
          notes:      null,
        });
      }
    }

    const res = await fetch(`/api/payroll/timesheets/${period}/entries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.blocked > 0) {
        toast.warning(data.message);
      } else {
        toast.success('Saved');
      }
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } else {
      toast.error('Failed to save');
    }
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

  // Project cost summary (monthly allocation)
  const projectCosts = useMemo(() => {
    const map: Record<string, { project: Project; totalDays: number; totalCost: number; employees: {emp: Employee; days: number; cost: number; fromDay: number; toDay: number}[] }> = {};
    for (const emp of employees) {
      const empAllocs  = allocs[emp.id] || [];
      const dailyRate  = (emp.totalSalary || (emp.basicSalary + emp.allowances)) / workDays;
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
  }, [allocs, employees, projects, workDays]);

  // Project colors for daily grid
  const PROJ_COLORS = ['#bfdbfe','#a7f3d0','#fde68a','#fbcfe8','#ddd6fe','#fed7aa','#bae6fd','#bbf7d0','#fecaca','#e0f2fe'];
  const projColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach((p, i) => { m[p.id] = PROJ_COLORS[i % PROJ_COLORS.length]; });
    return m;
  }, [projects]);

  // Daily site project summary (only Present days)
  const dailyProjectSummary = useMemo(() => {
    const map: Record<string, { project: Project; empDays: number; cost: number }> = {};
    for (const emp of employees) {
      const dailyRate = (emp.totalSalary || (emp.basicSalary + emp.allowances)) / workDays;
      for (const entry of Object.values(dailyData[emp.id] || {})) {
        if (entry.status !== 'P' || !entry.projectId) continue;
        const proj = projects.find(p => p.id === entry.projectId);
        if (!proj) continue;
        if (!map[entry.projectId]) map[entry.projectId] = { project: proj, empDays: 0, cost: 0 };
        map[entry.projectId].empDays += 1;
        map[entry.projectId].cost    += dailyRate;
      }
    }
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [dailyData, employees, projects, workDays]);

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

  // Attendance window derived values
  const windowStartMin     = attSettings.checkInStart * 60;
  const windowEndMin       = attSettings.checkInEnd   * 60 + (attSettings.graceMinutes ?? 0);
  const currentMin         = nowDubai.hour * 60 + nowDubai.minute;
  const windowOpen         = currentMin >= windowStartMin && currentMin <= windowEndMin;
  const isTodayInPeriod    = nowDubai.year === year && nowDubai.month === month;
  const todayCalDay        = isTodayInPeriod ? nowDubai.day : -1;
  const minsUntilClose     = windowOpen ? windowEndMin - currentMin : 0;
  const minsUntilOpen      = !windowOpen && currentMin < windowStartMin ? windowStartMin - currentMin : 0;

  const saveAttSettings = async () => {
    setSavingSettings(true);
    const res = await fetch('/api/payroll/attendance/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsDraft),
    });
    if (res.ok) {
      const updated = await res.json();
      setAttSettings(updated);
      setShowAttSettings(false);
      toast.success('Attendance settings saved');
    } else {
      toast.error('Failed to save settings');
    }
    setSavingSettings(false);
  };

  return (
    <div className="space-y-3">

      {/* ── Attendance Settings Modal ── */}
      {showAttSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAttSettings(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[15px] font-semibold">Attendance Window</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Foremen can only mark Present (P) for today within this window</p>
              </div>
              <button onClick={() => setShowAttSettings(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Start Hour (0–23)</label>
                  <input type="number" min="0" max="23"
                    value={settingsDraft.checkInStart}
                    onChange={e => setSettingsDraft(s => ({ ...s, checkInStart: Math.min(23, Math.max(0, parseInt(e.target.value)||0)) }))}
                    className="mt-1.5 w-full h-9 px-3 border border-border rounded-lg text-[13px] font-semibold tabular-nums bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <p className="text-[11px] text-muted-foreground mt-1">{fmtHour(settingsDraft.checkInStart)}</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">End Hour (0–23)</label>
                  <input type="number" min="0" max="23"
                    value={settingsDraft.checkInEnd}
                    onChange={e => setSettingsDraft(s => ({ ...s, checkInEnd: Math.min(23, Math.max(0, parseInt(e.target.value)||0)) }))}
                    className="mt-1.5 w-full h-9 px-3 border border-border rounded-lg text-[13px] font-semibold tabular-nums bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <p className="text-[11px] text-muted-foreground mt-1">{fmtHour(settingsDraft.checkInEnd)}</p>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Grace Period (minutes)</label>
                <input type="number" min="0" max="120"
                  value={settingsDraft.graceMinutes}
                  onChange={e => setSettingsDraft(s => ({ ...s, graceMinutes: Math.max(0, parseInt(e.target.value)||0) }))}
                  className="mt-1.5 w-full h-9 px-3 border border-border rounded-lg text-[13px] tabular-nums bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <p className="text-[11px] text-muted-foreground mt-1">Extra minutes allowed after end hour</p>
              </div>
              <div className="rounded-lg bg-muted/40 border border-border/60 px-4 py-3">
                <p className="text-[12px] text-muted-foreground">
                  Window: <strong className="text-foreground">{fmtHour(settingsDraft.checkInStart)} – {fmtHour(settingsDraft.checkInEnd)}{settingsDraft.graceMinutes > 0 ? ` +${settingsDraft.graceMinutes}m` : ''}</strong>
                  {' '}(UAE time, Asia/Dubai)
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowAttSettings(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveAttSettings} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}Save
              </Button>
            </div>
          </div>
        </div>
      )}

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
            { label: 'Working Days', val: workDays,        cls: '' },
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
          {(['attendance', 'daily', 'projects'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-5 py-2.5 text-[12px] font-medium border-b-2 transition-colors',
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t === 'attendance' ? 'Attendance' : t === 'daily' ? 'Daily Site Log' : 'Monthly Allocation'}
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
                      <th className="px-4 h-9 text-center text-[11px] font-medium text-red-500 w-20">
                        Absent
                        {Object.values(dailyData).some(d => Object.keys(d).length > 0) && (
                          <span className="block text-[9px] text-muted-foreground font-normal">from daily log</span>
                        )}
                      </th>
                      <th className="px-4 h-9 text-center text-[11px] font-medium text-amber-600 w-20">
                        Sick
                        {Object.values(dailyData).some(d => Object.keys(d).length > 0) && (
                          <span className="block text-[9px] text-muted-foreground font-normal">from daily log</span>
                        )}
                      </th>
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
                            {Object.keys(dailyData[emp.id] || {}).length > 0 ? (
                              <span className={cn('text-[13px] font-semibold tabular-nums', row.absent > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                                {row.absent || 0}
                              </span>
                            ) : (
                              <input type="number" min="0" max={workDays} step="1" value={row.absent || ''} placeholder="0"
                                onChange={e => setRow(emp.id, { absent: Math.max(0, parseInt(e.target.value)||0) })}
                                className={cn(numInp, row.absent > 0 && 'border-red-300 text-red-600 bg-red-50/50')} />
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {Object.keys(dailyData[emp.id] || {}).length > 0 ? (
                              <span className={cn('text-[13px] font-semibold tabular-nums', row.sick > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                                {row.sick || 0}
                              </span>
                            ) : (
                              <input type="number" min="0" max={workDays} step="1" value={row.sick || ''} placeholder="0"
                                onChange={e => setRow(emp.id, { sick: Math.max(0, parseInt(e.target.value)||0) })}
                                className={cn(numInp, row.sick > 0 && 'border-amber-300 text-amber-700 bg-amber-50/50')} />
                            )}
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

      ) : tab === 'daily' ? (

        /* ══ DAILY SITE LOG TAB ══ */
        <div className="space-y-3" onClick={() => setActiveCell(null)}>

          {/* Attendance Window Status Banner */}
          <div className={cn('rounded-xl border px-4 py-3 flex items-center justify-between gap-3 flex-wrap',
            windowOpen ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/50')}>
            <div className="flex items-center gap-3">
              <div className={cn('w-2.5 h-2.5 rounded-full shrink-0',
                windowOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400')} />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-semibold text-foreground">
                  Check-in Window: {fmtHour(attSettings.checkInStart)} – {fmtHour(attSettings.checkInEnd)}
                  {attSettings.graceMinutes > 0 && <span className="font-normal text-muted-foreground"> +{attSettings.graceMinutes}m grace</span>}
                </span>
                <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full',
                  windowOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                  {windowOpen ? 'OPEN' : 'CLOSED'}
                </span>
                {windowOpen && minsUntilClose > 0 && (
                  <span className="text-[11px] text-emerald-600">closes in {minsUntilClose}m</span>
                )}
                {!windowOpen && minsUntilOpen > 0 && (
                  <span className="text-[11px] text-muted-foreground">opens in {minsUntilOpen}m</span>
                )}
                {!windowOpen && isTodayInPeriod && (
                  <span className="text-[11px] text-rose-600 flex items-center gap-1">
                    <Lock className="size-3" />Today&apos;s P entries are locked
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setSettingsDraft(attSettings); setShowAttSettings(true); }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border/60 rounded-lg px-3 py-1.5 bg-background hover:bg-muted/40 transition-colors shrink-0">
              <Settings className="size-3" />Settings
            </button>
          </div>

          {/* Legend */}
          <div className="rounded-xl border border-border bg-card px-5 py-3 flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-medium">Click any day cell to set status, hours, and site.</span>
            <div className="flex items-center gap-2 flex-wrap">
              {(['P','A','SICK','AL','PH'] as const).map(s => (
                <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-border/60"
                  style={{ background: STATUS_COLORS[s], color: STATUS_TEXT_COLOR[s] }}>
                  {STATUS_LABELS[s]}
                  <span className="font-normal opacity-70">{s === 'P' ? 'Present' : s === 'A' ? 'Absent' : s === 'SICK' ? 'Sick' : s === 'AL' ? 'Annual Leave' : 'Public Holiday'}</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground border border-border/60 bg-slate-100">F = Friday off</span>
            </div>
          </div>

          {Object.entries(grouped).map(([cc, emps]) => (
            <div key={cc} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{cc}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="border-collapse text-[11px]" style={{ minWidth: calendarDays.length * 36 + 240 }}>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky left-0 z-20 bg-muted/95 px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground border-r border-border min-w-52">Employee</th>
                      {calendarDays.map(({ day, dow }) => {
                        const isToday = day === todayCalDay;
                        const thBg    = isToday ? (windowOpen ? '#d1fae5' : '#fee2e2') : dow === 5 ? '#f1f5f9' : undefined;
                        const thColor = isToday ? (windowOpen ? '#065f46' : '#991b1b') : dow === 5 ? '#94a3b8' : undefined;
                        return (
                          <th key={day} className="text-center font-medium border-r border-border/30 px-0"
                            style={{ width: 35, minWidth: 35, background: thBg, color: thColor }}>
                            <div className="text-[10px] font-bold leading-tight">{day}</div>
                            <div className="text-[9px] opacity-70">{isToday ? 'NOW' : ['Su','Mo','Tu','We','Th','Fr','Sa'][dow]}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {emps.map(emp => {
                      const empDays = dailyData[emp.id] || {};
                      const presentCount = Object.values(empDays).filter(e => e.status === 'P').length;
                      const absentCount  = Object.values(empDays).filter(e => e.status === 'A').length;
                      const leaveCount   = Object.values(empDays).filter(e => e.status === 'AL' || e.status === 'SICK' || e.status === 'PH').length;
                      return (
                        <tr key={emp.id} className="hover:bg-muted/10 transition-colors">
                          <td className="sticky left-0 z-10 bg-card px-3 py-1.5 border-r border-border/60">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <span className="font-mono text-[11px] font-semibold text-primary mr-1.5">{emp.empCode}</span>
                                <span className="text-[11px] text-foreground">{emp.name}</span>
                              </div>
                              {/* Fill all button */}
                              <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setActiveCell(activeCell === `fill-${emp.id}` ? null : `fill-${emp.id}`)}
                                  className="text-[10px] text-primary hover:text-primary/70 border border-primary/30 rounded px-1.5 py-0.5 bg-primary/5 hover:bg-primary/10 transition-colors whitespace-nowrap">
                                  Fill all ▾
                                </button>
                                {activeCell === `fill-${emp.id}` && (
                                  <div className="absolute top-full left-0 z-50 bg-card border border-border rounded-lg shadow-xl p-1 min-w-40 mt-0.5">
                                    {projects.map(p => (
                                      <button key={p.id} onClick={() => fillAll(emp.id, p.id)}
                                        className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-[11px] hover:bg-muted/60 rounded transition-colors">
                                        <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: projColorMap[p.id] }} />
                                        <span className="font-mono font-semibold text-primary">{p.projectCode}</span>
                                        <span className="text-muted-foreground truncate">{p.projectName}</span>
                                      </button>
                                    ))}
                                    <button onClick={() => fillAll(emp.id, '')}
                                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/60 rounded transition-colors border-t border-border mt-1 pt-1">
                                      Clear all
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Summary badges */}
                            <div className="flex gap-1 flex-wrap mt-0.5">
                              {presentCount > 0 && (
                                Object.entries(
                                  Object.values(empDays).filter(e => e.status === 'P' && e.projectId).reduce((acc, e) => {
                                    acc[e.projectId] = (acc[e.projectId]||0) + 1; return acc;
                                  }, {} as Record<string,number>)
                                ).map(([pid, cnt]) => {
                                  const p = projects.find(pr => pr.id === pid);
                                  return <span key={pid} className="text-[9px] px-1 rounded font-semibold" style={{ background: projColorMap[pid] }}>{p?.projectCode} {cnt}d</span>;
                                })
                              )}
                              {absentCount > 0  && <span className="text-[9px] px-1 rounded font-semibold" style={{ background: STATUS_COLORS.A, color: STATUS_TEXT_COLOR.A }}>A×{absentCount}</span>}
                              {leaveCount > 0   && <span className="text-[9px] px-1 rounded font-semibold" style={{ background: STATUS_COLORS.AL, color: STATUS_TEXT_COLOR.AL }}>Leave×{leaveCount}</span>}
                            </div>
                          </td>
                          {calendarDays.map(({ day, dow }) => {
                            const isFriday = dow === 5;
                            const isToday  = day === todayCalDay;
                            const pLocked  = isToday && !windowOpen;
                            const entry    = empDays[day];
                            const cellKey  = `${emp.id}-${day}`;
                            const isActive = activeCell === cellKey;

                            if (isFriday) return (
                              <td key={day} className="text-center border-r border-border/20 text-[9px] text-slate-300 font-medium" style={{ background: '#f8fafc', width: 35 }}>F</td>
                            );

                            // Determine cell appearance
                            let cellBg: string | undefined = isToday && !entry ? (windowOpen ? '#d1fae540' : '#fee2e240') : undefined;
                            let cellLabel = '·';
                            let cellTextColor = '#cbd5e1';
                            if (entry) {
                              if (entry.status === 'P') {
                                const proj = projects.find(p => p.id === entry.projectId);
                                cellBg        = proj ? projColorMap[proj.id] : STATUS_COLORS.P;
                                cellLabel     = proj ? proj.projectCode.slice(0, 4) : 'P';
                                cellTextColor = '#1e293b';
                              } else {
                                cellBg        = STATUS_COLORS[entry.status];
                                cellLabel     = STATUS_LABELS[entry.status];
                                cellTextColor = STATUS_TEXT_COLOR[entry.status];
                              }
                            }

                            const currentEntry: DayEntry = entry || { status: 'P', hours: 8, projectId: '' };

                            return (
                              <td key={day} className="relative p-0 border-r border-border/20" style={{ width: 35 }} onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setActiveCell(isActive ? null : cellKey)}
                                  className="w-full h-8 transition-opacity hover:opacity-75 flex flex-col items-center justify-center gap-0"
                                  style={{ background: cellBg, color: cellTextColor }}
                                  title={entry ? `${entry.status}${entry.status === 'P' && entry.projectId ? ' · ' + projects.find(p=>p.id===entry.projectId)?.projectCode : ''} · ${entry.hours}h` : 'Click to assign'}>
                                  <span className="text-[9px] font-bold leading-none">{cellLabel}</span>
                                  {entry?.status === 'P' && entry.hours !== 8 && (
                                    <span className="text-[8px] leading-none opacity-80">{entry.hours}h</span>
                                  )}
                                </button>

                                {isActive && (
                                  <div className="absolute top-full left-0 z-50 bg-card border border-border rounded-xl shadow-2xl p-2.5 w-52 mt-1 space-y-2.5" style={{ minWidth: 208 }}>
                                    <p className="text-[10px] font-semibold text-muted-foreground">{dayLabel(year, month, day)}</p>

                                    {/* Status buttons */}
                                    <div>
                                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Status</p>
                                      {pLocked && (
                                        <div className="flex items-center gap-1 mb-1.5 px-2 py-1 rounded bg-rose-50 border border-rose-200">
                                          <Lock className="size-2.5 text-rose-500 shrink-0" />
                                          <span className="text-[9px] text-rose-600">Window closed · {fmtHour(attSettings.checkInStart)}–{fmtHour(attSettings.checkInEnd)}</span>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-5 gap-1">
                                        {(['P','A','SICK','AL','PH'] as const).map(s => {
                                          const isLocked = s === 'P' && pLocked;
                                          return (
                                            <button key={s}
                                              onClick={() => !isLocked && setDayEntry(emp.id, day, { status: s })}
                                              disabled={isLocked}
                                              title={isLocked ? `Check-in window closed (${fmtHour(attSettings.checkInStart)}–${fmtHour(attSettings.checkInEnd)})` : undefined}
                                              className={cn('py-1 text-[10px] font-bold rounded border transition-all', isLocked && 'cursor-not-allowed')}
                                              style={{
                                                background:  currentEntry.status === s ? STATUS_COLORS[s] : undefined,
                                                color:       currentEntry.status === s ? STATUS_TEXT_COLOR[s] : undefined,
                                                borderColor: currentEntry.status === s ? STATUS_TEXT_COLOR[s] + '55' : undefined,
                                                opacity:     isLocked ? 0.25 : currentEntry.status === s ? 1 : 0.5,
                                              }}>
                                              {isLocked ? <Lock className="size-2.5 mx-auto" /> : STATUS_LABELS[s]}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <div className="grid grid-cols-5 gap-1 mt-0.5">
                                        {(['P','A','SICK','AL','PH'] as const).map(s => (
                                          <span key={s} className="text-center text-[8px] text-muted-foreground leading-tight">
                                            {s === 'P' ? 'Work' : s === 'A' ? 'Absent' : s === 'SICK' ? 'Sick' : s === 'AL' ? 'Annual' : 'Holiday'}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Hours (only when Present) */}
                                    {currentEntry.status === 'P' && (
                                      <div className="flex items-center gap-2">
                                        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Hours worked</p>
                                        <input
                                          type="number" min="0" max="24" step="0.5"
                                          value={currentEntry.hours}
                                          onChange={e => setDayEntry(emp.id, day, { hours: parseFloat(e.target.value) || 8 })}
                                          className="flex-1 h-7 text-center text-[12px] font-semibold border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 tabular-nums" />
                                      </div>
                                    )}

                                    {/* Site / Project (only when Present) */}
                                    {currentEntry.status === 'P' && (
                                      <div>
                                        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Site / Project</p>
                                        <select
                                          value={currentEntry.projectId}
                                          onChange={e => setDayEntry(emp.id, day, { projectId: e.target.value })}
                                          className="w-full h-7 border border-border rounded-md px-2 text-[11px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                                          <option value="">— Unassigned —</option>
                                          {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}

                                    {/* Clear / Done */}
                                    <div className="flex gap-1.5 pt-0.5 border-t border-border">
                                      <button
                                        onClick={() => { clearDay(emp.id, day); setActiveCell(null); }}
                                        className="flex-1 text-[10px] text-muted-foreground hover:text-red-500 border border-border/60 rounded-md py-1 hover:bg-red-50/50 transition-colors">
                                        Clear
                                      </button>
                                      <button
                                        onClick={() => setActiveCell(null)}
                                        className="flex-1 text-[10px] font-semibold text-primary border border-primary/30 rounded-md py-1 hover:bg-primary/5 transition-colors">
                                        Done
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Daily Project Summary */}
          {dailyProjectSummary.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
                <FolderOpen className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Daily Site Summary — {MONTHS[month]} {year}</span>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="px-4 h-9 text-left text-[11px] font-medium text-muted-foreground">Project</th>
                    <th className="px-4 h-9 text-center text-[11px] font-medium text-muted-foreground">Man-Days</th>
                    <th className="px-4 h-9 text-right text-[11px] font-medium text-muted-foreground">Labor Cost (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {dailyProjectSummary.map(({ project, empDays, cost }) => (
                    <tr key={project.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: projColorMap[project.id] }} />
                        <span className="font-mono text-[12px] font-semibold text-primary">{project.projectCode}</span>
                        <span className="text-[11px] text-muted-foreground">{project.projectName}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-semibold tabular-nums">{empDays}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-primary">{fmt(cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">Total</td>
                    <td className="px-4 py-2.5 text-center font-bold tabular-nums">{dailyProjectSummary.reduce((s, p) => s + p.empDays, 0)}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-primary">{fmt(dailyProjectSummary.reduce((s, p) => s + p.cost, 0))} AED</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
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
