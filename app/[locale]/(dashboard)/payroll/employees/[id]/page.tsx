'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, Save, Plus, Trash2, CreditCard,
  ChevronDown, ChevronUp, AlertCircle, Calendar, Clock,
  Banknote, TrendingUp, Briefcase, UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────
const COST_CENTERS = ['Stride Office','Stride Main','National Factory','Maisan Carpentry','Outside Visa'];
const VISA_TYPES   = ['SC-MAIN','NF','ALUM','MAISAN','Outside','NW'];
const WPS_ENTITIES = ['SC','SC-RAK','Maisan','NF','Cash'];
const STATUSES     = ['ACTIVE','HOLD','VACATION','TERMINATED'];
const MONTH_NAMES  = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_LABEL: Record<string, string> = { ACTIVE:'Active', HOLD:'On Hold', VACATION:'Vacation', TERMINATED:'Terminated' };
const STATUS_CLS: Record<string, string> = {
  ACTIVE:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  HOLD:       'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  VACATION:   'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  TERMINATED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};
const LOAN_STATUS_CLS: Record<string, string> = {
  ACTIVE:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CANCELLED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt    = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('en-AE');
const inp    = "w-full h-9 border border-input rounded-lg px-3 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow placeholder:text-muted-foreground/50";
const sel    = `${inp} appearance-none`;

const AVATAR_GRADIENTS = [
  'from-blue-400 to-blue-600',     'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600', 'from-rose-400 to-rose-600',
  'from-orange-400 to-orange-600', 'from-cyan-400 to-cyan-600',
  'from-amber-400 to-amber-600',   'from-indigo-400 to-indigo-600',
];

function avatarGradient(name: string) {
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function serviceDuration(startDate: string | null) {
  if (!startDate) return '—';
  const m = (new Date().getFullYear() - new Date(startDate).getFullYear()) * 12
          + new Date().getMonth() - new Date(startDate).getMonth();
  if (m < 1)  return 'New hire';
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12), r = m % 12;
  return r > 0 ? `${y}y ${r}m` : `${y} yr${y > 1 ? 's' : ''}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────
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

// ── Loan types ───────────────────────────────────────────────────────────────
interface Loan {
  id: string; description: string | null;
  totalAmount: number; paidAmount: number; installmentAmount: number;
  status: string; startMonth: number; startYear: number;
  deductions: { id: string; month: number; year: number; amount: number }[];
}

function LoanCard({ loan, onCancel, onDelete }: { loan: Loan; onCancel: (id: string) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const remaining = Math.max(0, loan.totalAmount - loan.paidAmount);
  const pct       = loan.totalAmount > 0 ? Math.min(100, (loan.paidAmount / loan.totalAmount) * 100) : 0;
  const left      = loan.installmentAmount > 0 ? Math.ceil(remaining / loan.installmentAmount) : 0;

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 size-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <CreditCard className="size-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold">{loan.description || 'Loan / Advance'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${LOAN_STATUS_CLS[loan.status]}`}>{loan.status}</span>
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {MONTH_NAMES[loan.startMonth - 1]} {loan.startYear}
            <span className="mx-1.5">·</span>
            <span className="font-medium text-foreground">{fmt(loan.installmentAmount)} AED</span>/month
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Paid: <span className="text-foreground font-medium">{fmt(loan.paidAmount)}</span></span>
              <span className="text-muted-foreground">Remaining: <span className="font-semibold text-orange-600">{fmt(remaining)}</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground">
              {pct.toFixed(0)}% paid
              {loan.status === 'ACTIVE' && left > 0 && <span className="ml-2">· ~{left} installment{left !== 1 ? 's' : ''} left</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {loan.status === 'ACTIVE' && (
            <button onClick={() => onCancel(loan.id)} className="h-7 px-2 text-[11px] rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Cancel</button>
          )}
          {loan.status !== 'ACTIVE' && (
            <button onClick={() => onDelete(loan.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded text-muted-foreground hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Deduction History</p>
          {loan.deductions.length === 0
            ? <p className="text-[12px] text-muted-foreground">No deductions recorded yet.</p>
            : <div className="space-y-1">
                {loan.deductions.map(d => (
                  <div key={d.id} className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{MONTH_NAMES[d.month - 1]} {d.year}</span>
                    <span className="font-medium tabular-nums">{fmt(d.amount)} AED</span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

function AddLoanForm({ onAdd }: { onAdd: (data: object) => Promise<void> }) {
  const now = new Date();
  const [form, setForm] = useState({ description: '', totalAmount: '', installmentAmount: '', startMonth: String(now.getMonth() + 1), startYear: String(now.getFullYear()) });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.totalAmount || !form.installmentAmount) { toast.error('Total and installment amounts required'); return; }
    setSaving(true);
    try {
      await onAdd({ description: form.description || null, totalAmount: parseFloat(form.totalAmount), installmentAmount: parseFloat(form.installmentAmount), startMonth: parseInt(form.startMonth), startYear: parseInt(form.startYear) });
      setForm({ description: '', totalAmount: '', installmentAmount: '', startMonth: String(now.getMonth() + 1), startYear: String(now.getFullYear()) });
    } finally { setSaving(false); }
  };

  const count = (form.totalAmount && form.installmentAmount) ? Math.ceil(parseFloat(form.totalAmount) / parseFloat(form.installmentAmount)) : null;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-4 space-y-3">
      <p className="text-[12px] font-semibold text-blue-700">New Loan / Advance</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <F label="Description"><input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Personal Advance, Car Fine" className={inp} /></F>
        </div>
        <F label="Total (AED)"><input type="number" min="1" step="0.01" value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)} placeholder="0.00" className={inp} required /></F>
        <F label="Monthly Installment (AED)"><input type="number" min="1" step="0.01" value={form.installmentAmount} onChange={e => set('installmentAmount', e.target.value)} placeholder="0.00" className={inp} required /></F>
        <F label="Start Month">
          <select value={form.startMonth} onChange={e => set('startMonth', e.target.value)} className={sel}>
            {MONTH_NAMES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </F>
        <F label="Start Year"><input type="number" min="2024" max="2030" value={form.startYear} onChange={e => set('startYear', e.target.value)} className={inp} /></F>
      </div>
      {count !== null && (
        <div className="flex items-center gap-1.5 text-[12px] text-blue-700 bg-blue-100 rounded-md px-3 py-1.5">
          <AlertCircle className="size-3.5 shrink-0" />
          {count} installment{count !== 1 ? 's' : ''} of {fmt(parseFloat(form.installmentAmount))} AED
        </div>
      )}
      <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}Add
      </Button>
    </form>
  );
}

// ── Attendance types ─────────────────────────────────────────────────────────
interface AttPeriod {
  period: string; year: number; month: number; src: string;
  present: number; absent: number; sick: number; annualLeave: number; publicHoliday: number;
  otHours: number;
  projects: { id: string; code: string; name: string }[];
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function EmployeeProfilePage() {
  const router = useRouter();
  const { locale, id } = useParams() as { locale: string; id: string };

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState<any>({});
  const [activeTab, setActiveTab] = useState<'profile' | 'loans' | 'attendance'>('profile');

  // Loans
  const [loans,         setLoans]         = useState<Loan[]>([]);
  const [loansLoading,  setLoansLoading]  = useState(true);
  const [showAddLoan,   setShowAddLoan]   = useState(false);

  // Attendance
  const [attendance,        setAttendance]        = useState<{ periods: AttPeriod[]; totalPresent: number; totalAbsent: number; totalOt: number } | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Load employee
  useEffect(() => {
    fetch(`/api/payroll/employees/${id}`)
      .then(r => r.json())
      .then(({ data }) => {
        setForm({
          ...data,
          basicSalary:    String(data.basicSalary    ?? ''),
          allowances:     String(data.allowances     ?? ''),
          otherAllowance: String(data.otherAllowance ?? ''),
          hoursPerDay:    String(data.hoursPerDay    ?? ''),
          startDate:      data.startDate ? data.startDate.slice(0, 10) : '',
          remarks:        data.remarks   ?? '',
        });
        setLoading(false);
      });
  }, [id]);

  // Load loans on mount (for stats)
  const loadLoans = useCallback(async () => {
    setLoansLoading(true);
    try {
      const res  = await fetch(`/api/payroll/employees/${id}/loans`);
      const json = await res.json();
      if (res.ok) setLoans(json.data || []);
    } finally { setLoansLoading(false); }
  }, [id]);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  // Load attendance when tab opens
  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const res  = await fetch(`/api/payroll/employees/${id}/attendance`);
      const json = await res.json();
      if (res.ok) setAttendance(json.data);
    } finally { setAttendanceLoading(false); }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'attendance' && !attendance) loadAttendance();
  }, [activeTab, attendance, loadAttendance]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/payroll/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          basicSalary:    parseFloat(form.basicSalary)    || 0,
          allowances:     parseFloat(form.allowances)     || 0,
          otherAllowance: parseFloat(form.otherAllowance) || 0,
          hoursPerDay:    parseFloat(form.hoursPerDay)    || 9,
          startDate:      form.startDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Failed'); return; }
      toast.success('Changes saved');
    } finally { setSaving(false); }
  };

  const handleAddLoan = async (data: object) => {
    const res  = await fetch(`/api/payroll/employees/${id}/loans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error || 'Failed'); return; }
    toast.success('Loan added');
    setShowAddLoan(false);
    loadLoans();
  };
  const handleCancelLoan = async (loanId: string) => {
    if (!confirm('Cancel this loan?')) return;
    const res = await fetch(`/api/payroll/loans/${loanId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED' }) });
    if (!res.ok) { toast.error('Failed'); return; }
    toast.success('Loan cancelled'); loadLoans();
  };
  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm('Delete this loan permanently?')) return;
    const res = await fetch(`/api/payroll/loans/${loanId}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed'); return; }
    toast.success('Deleted'); loadLoans();
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeLoans     = loans.filter(l => l.status === 'ACTIVE');
  const totalLoanBal    = activeLoans.reduce((s, l) => s + Math.max(0, l.totalAmount - l.paidAmount), 0);
  const totalMonthlyDed = activeLoans.reduce((s, l) => s + l.installmentAmount, 0);
  const inactiveLoans   = loans.filter(l => l.status !== 'ACTIVE');
  const totalSalary     = (parseFloat(form.basicSalary) || 0) + (parseFloat(form.allowances) || 0);

  if (loading) return (
    <div className="flex justify-center items-center min-h-52">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-4">

      {/* ── Back ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(`/${locale}/payroll/employees`)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-[12px] text-muted-foreground">All Employees</span>
      </div>

      {/* ── Hero card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 flex items-start gap-4">
          {/* Avatar */}
          <div className={cn('size-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm', avatarGradient(form.name || 'E'))}>
            <span className="text-white text-lg font-bold tracking-wide select-none">
              {initials(form.name || '?')}
            </span>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[18px] font-semibold tracking-tight">{form.name}</h1>
              {form.status && (
                <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', STATUS_CLS[form.status])}>
                  {STATUS_LABEL[form.status]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[12px] text-muted-foreground">
              <span className="font-mono text-primary font-semibold text-[12px]">{form.empCode}</span>
              {form.costCenter && <><span className="text-border">·</span><span>{form.costCenter}</span></>}
              {form.visaType   && <><span className="text-border">·</span><span>Visa: {form.visaType}</span></>}
              {form.wpsEntity  && <><span className="text-border">·</span><span>WPS: {form.wpsEntity}</span></>}
            </div>
            {form.startDate && (
              <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                <Calendar className="size-3" />
                <span>Since {new Date(form.startDate).toLocaleDateString('en-AE', { month: 'short', year: 'numeric', day: 'numeric' })}</span>
                <span className="text-primary font-medium ml-1">{serviceDuration(form.startDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 divide-x divide-border border-t border-border">
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Banknote className="size-3 text-primary" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Salary</p>
            </div>
            <p className="text-[14px] font-bold tabular-nums">{fmt(totalSalary)}</p>
            <p className="text-[10px] text-muted-foreground">AED / month</p>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="size-3 text-orange-500" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Loan Balance</p>
            </div>
            {loansLoading
              ? <div className="h-5 w-20 bg-muted rounded animate-pulse" />
              : <><p className={cn('text-[14px] font-bold tabular-nums', totalLoanBal > 0 ? 'text-orange-600' : 'text-muted-foreground')}>{fmt(totalLoanBal)}</p>
                 <p className="text-[10px] text-muted-foreground">AED · {activeLoans.length} active</p></>
            }
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="size-3 text-violet-500" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tenure</p>
            </div>
            <p className="text-[14px] font-bold">{serviceDuration(form.startDate)}</p>
            <p className="text-[10px] text-muted-foreground">{form.paymentMethod || '—'} payment</p>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="size-3 text-emerald-500" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Man-Days</p>
            </div>
            <p className="text-[14px] font-bold tabular-nums">
              {attendance ? fmtInt(attendance.totalPresent) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {attendance ? `${attendance.totalOt}h OT · ${attendance.totalAbsent} absent` : 'see attendance'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-border">
        {(['profile', 'loans', 'attendance'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'profile' ? (
              <span className="flex items-center gap-1.5"><UserCheck className="size-3.5" />Profile</span>
            ) : tab === 'loans' ? (
              <span className="flex items-center gap-1.5">
                <CreditCard className="size-3.5" />Loans & Advances
                {activeLoans.length > 0 && (
                  <span className="size-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">{activeLoans.length}</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Briefcase className="size-3.5" />Attendance
                {attendance && attendance.periods.length > 0 && (
                  <span className="px-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{attendance.periods.length}mo</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ PROFILE TAB ══ */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="space-y-3">
          <Section title="Identity">
            <div className="grid grid-cols-2 gap-3">
              <F label="Employee Code"><input value={form.empCode || ''} onChange={e => set('empCode', e.target.value)} className={inp} /></F>
              <F label="Full Name"><input value={form.name || ''} onChange={e => set('name', e.target.value)} className={inp} /></F>
              <F label="Visa Type">
                <select value={form.visaType || ''} onChange={e => set('visaType', e.target.value)} className={sel}>
                  {VISA_TYPES.map(v => <option key={v}>{v}</option>)}
                </select>
              </F>
              <F label="Start Date"><input type="date" value={form.startDate || ''} onChange={e => set('startDate', e.target.value)} className={inp} /></F>
            </div>
          </Section>

          <Section title="Assignment">
            <div className="grid grid-cols-2 gap-3">
              <F label="Cost Center">
                <select value={form.costCenter || ''} onChange={e => set('costCenter', e.target.value)} className={sel}>
                  {COST_CENTERS.map(c => <option key={c}>{c}</option>)}
                </select>
              </F>
              <F label="WPS Entity">
                <select value={form.wpsEntity || ''} onChange={e => set('wpsEntity', e.target.value)} className={sel}>
                  {WPS_ENTITIES.map(w => <option key={w}>{w}</option>)}
                </select>
              </F>
              <F label="Payment Method">
                <select value={form.paymentMethod || ''} onChange={e => set('paymentMethod', e.target.value)} className={sel}>
                  {['WPS','Cash'].map(p => <option key={p}>{p}</option>)}
                </select>
              </F>
              <F label="Status">
                <select value={form.status || ''} onChange={e => set('status', e.target.value)} className={sel}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </F>
            </div>
          </Section>

          <Section title="Salary Structure (AED)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <F label="Basic Salary"><input type="number" min="0" step="0.01" value={form.basicSalary || ''} onChange={e => set('basicSalary', e.target.value)} className={inp} /></F>
              <F label="Allowances"><input type="number" min="0" step="0.01" value={form.allowances || ''} onChange={e => set('allowances', e.target.value)} className={inp} /></F>
              <F label="Total Salary">
                <div className="h-9 px-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center text-[13px] font-semibold text-primary tabular-nums">
                  {totalSalary.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                </div>
              </F>
              <F label="Other Allowance"><input type="number" min="0" step="0.01" value={form.otherAllowance || ''} onChange={e => set('otherAllowance', e.target.value)} className={inp} /></F>
            </div>
          </Section>

          <Section title="Additional">
            <div className="grid grid-cols-2 gap-3">
              <F label="Hours Per Day"><input type="number" min="1" max="24" step="0.5" value={form.hoursPerDay || ''} onChange={e => set('hoursPerDay', e.target.value)} className={inp} /></F>
              <F label="Remarks"><input value={form.remarks || ''} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes" className={inp} /></F>
            </div>
          </Section>

          <div className="flex items-center gap-2.5 pt-1 pb-4">
            <Button type="submit" disabled={saving} size="sm" className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Link href={`/${locale}/payroll/employees`}>
              <Button type="button" variant="outline" size="sm">Back to List</Button>
            </Link>
          </div>
        </form>
      )}

      {/* ══ LOANS TAB ══ */}
      {activeTab === 'loans' && (
        <div className="space-y-3 pb-6">
          {/* Active loan warning */}
          {activeLoans.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-orange-800">
                  {activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''} · balance {fmt(totalLoanBal)} AED
                </p>
                <p className="text-[11px] text-orange-700 mt-0.5">
                  Monthly deduction: <span className="font-bold">{fmt(totalMonthlyDed)} AED</span>
                </p>
              </div>
              <CreditCard className="size-5 text-orange-400 shrink-0" />
            </div>
          )}

          {loansLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {activeLoans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Active</p>
                  {activeLoans.map(l => <LoanCard key={l.id} loan={l} onCancel={handleCancelLoan} onDelete={handleDeleteLoan} />)}
                </div>
              )}

              {showAddLoan ? (
                <div>
                  <AddLoanForm onAdd={handleAddLoan} />
                  <button onClick={() => setShowAddLoan(false)} className="mt-2 text-[12px] text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddLoan(true)}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-border text-[13px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus className="size-4" />Add Loan / Advance
                </button>
              )}

              {inactiveLoans.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">History</p>
                  {inactiveLoans.map(l => <LoanCard key={l.id} loan={l} onCancel={handleCancelLoan} onDelete={handleDeleteLoan} />)}
                </div>
              )}

              {loans.length === 0 && !showAddLoan && (
                <div className="text-center py-10 text-[13px] text-muted-foreground rounded-xl border border-border bg-card">
                  No loans recorded. Click &ldquo;Add Loan&rdquo; to get started.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ ATTENDANCE TAB ══ */}
      {activeTab === 'attendance' && (
        <div className="space-y-3 pb-6">
          {attendanceLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : !attendance || attendance.periods.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-border bg-card">
              <Briefcase className="size-8 mx-auto mb-2.5 text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground">No attendance records found.</p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">Records appear after timesheets are saved in the Timesheet module.</p>
            </div>
          ) : (
            <>
              {/* All-time summary */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Days Present</p>
                  <p className="text-2xl font-bold tabular-nums mt-1 text-primary">{fmtInt(attendance.totalPresent)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Days Absent</p>
                  <p className={cn('text-2xl font-bold tabular-nums mt-1', attendance.totalAbsent > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                    {fmtInt(attendance.totalAbsent)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">OT Hours</p>
                  <p className={cn('text-2xl font-bold tabular-nums mt-1', attendance.totalOt > 0 ? 'text-emerald-600' : 'text-muted-foreground')}>
                    {attendance.totalOt}h
                  </p>
                </div>
              </div>

              {/* Monthly table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Monthly Breakdown — {attendance.periods.length} periods</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/10">
                        <th className="px-4 h-8 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Period</th>
                        <th className="px-4 h-8 text-center text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">P</th>
                        <th className="px-4 h-8 text-center text-[10px] font-semibold text-red-500 uppercase tracking-wide">A</th>
                        <th className="px-4 h-8 text-center text-[10px] font-semibold text-amber-600 uppercase tracking-wide">SL</th>
                        <th className="px-4 h-8 text-center text-[10px] font-semibold text-violet-600 uppercase tracking-wide">AL</th>
                        <th className="px-4 h-8 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">OT</th>
                        <th className="px-4 h-8 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Projects</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {attendance.periods.map(p => (
                        <tr key={p.period} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                            {MONTH_NAMES[p.month]} {p.year}
                            {p.src === 'summary' && <span className="ml-1.5 text-[9px] text-muted-foreground/60 font-normal">legacy</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {p.present > 0
                              ? <span className="inline-flex items-center justify-center size-6 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold tabular-nums">{p.present}</span>
                              : <span className="text-muted-foreground/30">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {p.absent > 0
                              ? <span className="inline-flex items-center justify-center size-6 rounded-full bg-red-100 text-red-600 text-[11px] font-bold tabular-nums">{p.absent}</span>
                              : <span className="text-muted-foreground/30">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {p.sick > 0
                              ? <span className="inline-flex items-center justify-center size-6 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold tabular-nums">{p.sick}</span>
                              : <span className="text-muted-foreground/30">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {(p.annualLeave + p.publicHoliday) > 0
                              ? <span className="inline-flex items-center justify-center size-6 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold tabular-nums">{p.annualLeave + p.publicHoliday}</span>
                              : <span className="text-muted-foreground/30">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center tabular-nums">
                            {p.otHours > 0
                              ? <span className="text-emerald-600 font-semibold">+{p.otHours}h</span>
                              : <span className="text-muted-foreground/30">—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1 flex-wrap">
                              {p.projects.length === 0
                                ? <span className="text-muted-foreground/30 text-[11px]">—</span>
                                : p.projects.map(pr => (
                                    <span key={pr.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-semibold">
                                      {pr.code}
                                    </span>
                                  ))
                              }
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">All-time</td>
                        <td className="px-4 py-2.5 text-center font-bold text-emerald-700 tabular-nums">{attendance.totalPresent}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-red-600 tabular-nums">{attendance.totalAbsent}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-amber-700 tabular-nums">
                          {attendance.periods.reduce((s, p) => s + p.sick, 0) || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-violet-700 tabular-nums">
                          {attendance.periods.reduce((s, p) => s + p.annualLeave + p.publicHoliday, 0) || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-emerald-600 tabular-nums">{attendance.totalOt > 0 ? `${attendance.totalOt}h` : '—'}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
