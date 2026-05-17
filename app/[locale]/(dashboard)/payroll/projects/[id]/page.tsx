'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, Save, ChevronDown, ChevronUp,
  FolderOpen, Users, TrendingUp, Banknote, HardHat,
} from 'lucide-react';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUSES = ['ONGOING', 'WORK_DONE', 'MOBILIZING', 'HOLD', 'CANCELLED'];
const STATUS_LABEL: Record<string, string> = {
  ONGOING: 'Ongoing', WORK_DONE: 'Work Done', MOBILIZING: 'Mobilizing',
  HOLD: 'On Hold', CANCELLED: 'Cancelled',
};
const STATUS_CLS: Record<string, string> = {
  ONGOING:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  WORK_DONE:  'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  MOBILIZING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  HOLD:       'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  CANCELLED:  'bg-red-50 text-red-600 ring-1 ring-red-200',
};
const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const inp = "w-full h-9 border border-input rounded-lg px-3 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow placeholder:text-muted-foreground/50";
const sel = `${inp} appearance-none`;
const fmt = (n?: number | null) => n != null ? n.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—';
const fmtDec = (n?: number | null) => n != null ? n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface EmpEntry { employee: { id: string; name: string; empCode: string; costCenter: string }; days: number; hours: number; cost: number }
interface MonthData { key: string; year: number; month: number; uniqueEmployees: number; totalDays: number; totalHours: number; totalCost: number; employees: EmpEntry[] }
interface ManpowerData { months: MonthData[]; grandTotalDays: number; grandTotalHours: number; grandTotalCost: number }

function MonthRow({ m }: { m: MonthData }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="size-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
          <HardHat className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold">{MONTHS[m.month]} {m.year}</span>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{m.uniqueEmployees}</span> employee{m.uniqueEmployees !== 1 ? 's' : ''}
            </span>
            <span className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{m.totalDays}</span> man-days
            </span>
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-primary">{fmtDec(m.totalCost)}</span> AED total
            </span>
            {m.totalDays > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold tabular-nums">
                {fmtDec(m.totalCost / m.totalDays)} AED/day
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border/60 bg-muted/10">
                <th className="px-4 h-8 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Code</th>
                <th className="px-4 h-8 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="px-4 h-8 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cost Center</th>
                <th className="px-4 h-8 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Days</th>
                <th className="px-4 h-8 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Hours</th>
                <th className="px-4 h-8 text-right text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Rate/Day</th>
                <th className="px-4 h-8 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cost (AED)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {m.employees.map(({ employee: e, days, hours, cost }) => (
                <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2 font-mono text-primary font-semibold">{e.empCode}</td>
                  <td className="px-4 py-2 font-medium">{e.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{e.costCenter}</td>
                  <td className="px-4 py-2 text-center tabular-nums font-semibold">{days}</td>
                  <td className="px-4 py-2 text-center tabular-nums text-muted-foreground">{hours.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-orange-600">
                    {days > 0 ? fmtDec(cost / days) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-primary">{fmtDec(cost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/20">
                <td colSpan={3} className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Subtotal</td>
                <td className="px-4 py-2 text-center font-bold tabular-nums">{m.totalDays}</td>
                <td className="px-4 py-2 text-center font-bold tabular-nums text-muted-foreground">{m.totalHours.toFixed(1)}</td>
                <td className="px-4 py-2 text-right font-bold tabular-nums text-orange-600">
                  {m.totalDays > 0 ? fmtDec(m.totalCost / m.totalDays) : '—'}
                </td>
                <td className="px-4 py-2 text-right font-bold tabular-nums text-primary">{fmtDec(m.totalCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const { locale, id } = useParams() as { locale: string; id: string };

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState<any>({});
  const [activeTab, setActiveTab] = useState<'info' | 'manpower'>('info');

  const [manpower,        setManpower]        = useState<ManpowerData | null>(null);
  const [manpowerLoading, setManpowerLoading] = useState(false);

  // Load project
  useEffect(() => {
    fetch(`/api/payroll/projects/${id}`)
      .then(r => r.json())
      .then(({ data }) => {
        setForm({
          ...data,
          completionPct: data.completionPct != null ? String(Math.round(data.completionPct * 100)) : '',
          contractValue: data.contractValue != null ? String(data.contractValue) : '',
          revenue:       data.revenue       != null ? String(data.revenue)       : '',
          retention:     data.retention     != null ? String(data.retention)     : '',
          notes:         data.notes         ?? '',
        });
        setLoading(false);
      });
  }, [id]);

  // Load manpower when tab opens
  const loadManpower = useCallback(async () => {
    setManpowerLoading(true);
    try {
      const res = await fetch(`/api/payroll/projects/${id}/manpower`);
      const { data } = await res.json();
      setManpower(data);
    } finally {
      setManpowerLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'manpower') loadManpower();
  }, [activeTab, loadManpower]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/payroll/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          completionPct: form.completionPct ? parseFloat(form.completionPct) / 100 : 0,
          contractValue: form.contractValue ? parseFloat(form.contractValue) : null,
          revenue:       form.revenue       ? parseFloat(form.revenue)       : null,
          retention:     form.retention     ? parseFloat(form.retention)     : null,
          notes:         form.notes         || null,
        }),
      });
      if (!res.ok) { const j = await res.json(); toast.error(j.error || 'Failed'); return; }
      toast.success('Project saved');
      router.push(`/${locale}/payroll/projects`);
    } finally { setSaving(false); }
  };

  // Derived
  const margin = (form.contractValue && form.revenue)
    ? parseFloat(form.revenue) - parseFloat(form.contractValue) : null;
  const marginPct = (margin != null && parseFloat(form.contractValue) > 0)
    ? (margin / parseFloat(form.contractValue)) * 100 : null;
  const pct = parseFloat(form.completionPct) || 0;

  if (loading) return (
    <div className="flex justify-center items-center min-h-52">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-5xl space-y-4">

      {/* ── Back ── */}
      <button
        onClick={() => router.push(`/${locale}/payroll/projects`)}
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Projects
      </button>

      {/* ── Hero card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-5 flex items-start gap-4">
          <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
            <FolderOpen className="size-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[18px] font-bold text-white leading-tight truncate">{form.projectName}</h1>
              {form.status && (
                <span className={cn('text-[11px] px-2 py-0.5 rounded-md font-medium shrink-0', STATUS_CLS[form.status])}>
                  {STATUS_LABEL[form.status] ?? form.status}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-emerald-100">
              <span className="font-mono font-semibold text-white">{form.projectCode}</span>
              {form.location && <><span className="mx-1.5 text-emerald-200/60">·</span><span>{form.location}</span></>}
            </p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
              <TrendingUp className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Progress</p>
              <p className="text-[15px] font-bold tabular-nums mt-0.5">{pct > 0 ? `${pct}%` : '—'}</p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Banknote className="size-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contract</p>
              <p className="text-[13px] font-bold tabular-nums mt-0.5">
                {form.contractValue ? fmt(parseFloat(form.contractValue)) : '—'}
                {form.contractValue && <span className="text-[10px] font-normal text-muted-foreground ml-1">AED</span>}
              </p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <FolderOpen className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Consultant</p>
              <p className="text-[12px] font-semibold mt-0.5 truncate max-w-28">{form.consultant || '—'}</p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <Users className="size-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Man-Days</p>
              <p className="text-[15px] font-bold tabular-nums mt-0.5">{manpower ? manpower.grandTotalDays : '—'}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {pct > 0 && (
          <div className="px-4 pb-4">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-muted-foreground">{pct}% complete</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex rounded-xl border border-border overflow-hidden bg-card">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-[12px] font-medium transition-colors flex-1 justify-center border-r border-border ${
            activeTab === 'info' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <FolderOpen className="size-3.5" />
          Project Info
        </button>
        <button
          onClick={() => setActiveTab('manpower')}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-[12px] font-medium transition-colors flex-1 justify-center ${
            activeTab === 'manpower' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Users className="size-3.5" />
          Manpower
          {manpower && manpower.grandTotalDays > 0 && (
            <span className={`ml-1 px-1.5 rounded-full text-[10px] font-bold ${
              activeTab === 'manpower' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
            }`}>{manpower.grandTotalDays}d</span>
          )}
        </button>
      </div>

      {/* ══ INFO TAB ══ */}
      {activeTab === 'info' && (
        <form onSubmit={handleSubmit} className="space-y-3">

          <Section title="Identification">
            <div className="grid grid-cols-2 gap-3">
              <F label="Project Code">
                <input value={form.projectCode || ''} onChange={e => set('projectCode', e.target.value)} className={inp} />
              </F>
              <F label="Project Name">
                <input value={form.projectName || ''} onChange={e => set('projectName', e.target.value)} className={inp} />
              </F>
              <F label="Location">
                <input value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="City / Site" className={inp} />
              </F>
              <F label="Consultant">
                <input value={form.consultant || ''} onChange={e => set('consultant', e.target.value)} placeholder="Engineer / Firm" className={inp} />
              </F>
            </div>
          </Section>

          <Section title="Financials (AED)">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <F label="Contract Value">
                <input type="number" min="0" step="0.01" value={form.contractValue || ''} onChange={e => set('contractValue', e.target.value)} placeholder="0.00" className={inp} />
              </F>
              <F label="Revenue Billed">
                <input type="number" min="0" step="0.01" value={form.revenue || ''} onChange={e => set('revenue', e.target.value)} placeholder="0.00" className={inp} />
              </F>
              <F label="Retention">
                <input type="number" min="0" step="0.01" value={form.retention || ''} onChange={e => set('retention', e.target.value)} placeholder="0.00" className={inp} />
              </F>
            </div>
            {marginPct !== null && (
              <div className={cn('mt-3 px-3 py-2 rounded-lg text-[12px] flex items-center gap-2', margin! >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                <span className="font-semibold">Margin:</span>
                <span className="tabular-nums font-bold">{fmtDec(margin!)} AED</span>
                <span className="opacity-70">({marginPct.toFixed(1)}%)</span>
              </div>
            )}
          </Section>

          <Section title="Progress & Status">
            <div className="grid grid-cols-2 gap-3">
              <F label="Status">
                <select value={form.status || ''} onChange={e => set('status', e.target.value)} className={sel}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </F>
              <F label="Completion (%)">
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="100" step="1"
                    value={form.completionPct || 0}
                    onChange={e => set('completionPct', e.target.value)}
                    className="flex-1 accent-primary h-2 cursor-pointer"
                  />
                  <div className="w-14 h-9 px-2 border border-border rounded-lg bg-background text-center text-[13px] font-semibold tabular-nums flex items-center justify-center text-primary">
                    {form.completionPct || 0}%
                  </div>
                </div>
              </F>
            </div>
            <div className="mt-3">
              <F label="Notes">
                <textarea
                  value={form.notes || ''} onChange={e => set('notes', e.target.value)}
                  rows={3} placeholder="Project notes, scope, remarks…"
                  className="w-full border border-input rounded-lg px-3 py-2 text-[13px] bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow placeholder:text-muted-foreground/50"
                />
              </F>
            </div>
          </Section>

          <div className="flex items-center gap-2.5 pt-1 pb-4">
            <Button type="submit" disabled={saving} size="sm" className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* ══ MANPOWER TAB ══ */}
      {activeTab === 'manpower' && (
        <div className="space-y-3 pb-6">
          {manpowerLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !manpower || manpower.grandTotalDays === 0 ? (
            <div className="text-center py-16 rounded-xl border border-border bg-card">
              <HardHat className="size-8 mx-auto mb-2.5 text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground">No manpower data yet.</p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                Assign this project to daily site log entries in the Timesheet module.
              </p>
            </div>
          ) : (
            <>
              {/* Summary banner */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Man-Days</p>
                  <p className="text-2xl font-bold tabular-nums mt-1 text-primary">{manpower.grandTotalDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Man-Hours</p>
                  <p className="text-2xl font-bold tabular-nums mt-1">{manpower.grandTotalHours.toFixed(0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Labor Cost</p>
                  <p className="text-2xl font-bold tabular-nums mt-1">
                    {fmtDec(manpower.grandTotalCost)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">AED</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-600">Avg Cost / Day</p>
                  <p className="text-2xl font-bold tabular-nums mt-1 text-orange-600">
                    {manpower.grandTotalDays > 0 ? fmtDec(manpower.grandTotalCost / manpower.grandTotalDays) : '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">AED / man-day</p>
                </div>
              </div>

              {/* Per-month expandable rows */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">Monthly Breakdown</p>
                {manpower.months.map(m => <MonthRow key={m.key} m={m} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
