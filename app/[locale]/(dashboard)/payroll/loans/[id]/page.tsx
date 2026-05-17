'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CreditCard, TrendingUp, CheckCircle2, Save,
  Loader2, Trash2, AlertTriangle, User, Calendar, Banknote,
  ShieldCheck, ShieldAlert, ShieldX, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt  = (n: number) => (n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inp  = "w-full h-9 border border-input rounded-lg px-3 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow placeholder:text-muted-foreground/50";
const sel  = `${inp} appearance-none`;

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

interface Deduction { id: string; month: number; year: number; amount: number; }
interface Employee {
  id: string; empCode: string; name: string; costCenter: string;
  basicSalary: number; allowances: number; totalSalary: number;
  status: string; startDate: string | null; wpsEntity: string | null; paymentMethod: string | null;
}
interface Loan {
  id: string; description: string | null;
  totalAmount: number; paidAmount: number; installmentAmount: number;
  status: string; startMonth: number; startYear: number;
  createdAt: string; updatedAt: string;
  employee: Employee;
  deductions: Deduction[];
}

const STATUS_CLS: Record<string, string> = {
  ACTIVE:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CANCELLED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

function monthsSince(startMonth: number, startYear: number): number {
  const now = new Date();
  return Math.max(1, (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth) + 1);
}

type HealthRating = 'Excellent' | 'On Track' | 'Fair' | 'At Risk';

function getHealth(loan: Loan): { rating: HealthRating; coverage: number; color: string; Icon: React.ElementType } {
  const months = monthsSince(loan.startMonth, loan.startYear);
  const expected = Math.min(loan.totalAmount, months * loan.installmentAmount);
  const coverage = expected > 0 ? loan.paidAmount / expected : 1;
  if (coverage >= 0.95) return { rating: 'Excellent',  coverage, color: 'emerald', Icon: ShieldCheck };
  if (coverage >= 0.80) return { rating: 'On Track',   coverage, color: 'blue',    Icon: Shield };
  if (coverage >= 0.60) return { rating: 'Fair',       coverage, color: 'orange',  Icon: ShieldAlert };
  return                        { rating: 'At Risk',   coverage, color: 'red',     Icon: ShieldX };
}

export default function LoanDetailPage() {
  const { locale, id } = useParams() as { locale: string; id: string };
  const router = useRouter();

  const [loan,    setLoan]    = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'overview' | 'payments' | 'edit'>('overview');

  // edit form state
  const [draft,   setDraft]   = useState({ description: '', totalAmount: '', installmentAmount: '', status: '' });
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/payroll/loans/${id}`);
    if (!res.ok) { toast.error('Loan not found'); router.push(`/${locale}/payroll/loans`); return; }
    const json = await res.json();
    const data: Loan = json.data;
    setLoan(data);
    setDraft({
      description:       data.description || '',
      totalAmount:       String(data.totalAmount),
      installmentAmount: String(data.installmentAmount),
      status:            data.status,
    });
    setLoading(false);
  }, [id, locale, router]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!loan) return;
    setSaving(true);
    const res = await fetch(`/api/payroll/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description:       draft.description || null,
        totalAmount:       parseFloat(draft.totalAmount),
        installmentAmount: parseFloat(draft.installmentAmount),
        status:            draft.status,
      }),
    });
    setSaving(false);
    if (!res.ok) { toast.error('Failed to save'); return; }
    toast.success('Loan updated');
    load();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this loan permanently? This cannot be undone.')) return;
    setDeleting(true);
    const res = await fetch(`/api/payroll/loans/${id}`, { method: 'DELETE' });
    setDeleting(false);
    if (!res.ok) { toast.error('Failed to delete'); return; }
    toast.success('Loan deleted');
    router.push(`/${locale}/payroll/loans`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!loan) return null;

  const remaining = Math.max(0, loan.totalAmount - loan.paidAmount);
  const pct = loan.totalAmount > 0 ? Math.min(100, (loan.paidAmount / loan.totalAmount) * 100) : 0;
  const installmentsLeft = loan.installmentAmount > 0 ? Math.ceil(remaining / loan.installmentAmount) : 0;
  const health = getHealth(loan);
  const months = monthsSince(loan.startMonth, loan.startYear);

  // payment timeline: newest first, with cumulative running total
  const sortedDeductions = [...loan.deductions].sort((a, b) =>
    b.year !== a.year ? b.year - a.year : b.month - a.month
  );
  let cumulative = loan.paidAmount;
  const timeline = sortedDeductions.map(d => {
    const entry = { ...d, cumulative };
    cumulative -= d.amount;
    return entry;
  });

  const TABS = [
    { key: 'overview',  label: 'Overview',        Icon: TrendingUp },
    { key: 'payments',  label: `Payments (${loan.deductions.length})`, Icon: CheckCircle2 },
    { key: 'edit',      label: 'Edit Loan',        Icon: Save },
  ] as const;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push(`/${locale}/payroll/loans`)}
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Loans &amp; Advances
      </button>

      {/* Hero card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5 flex items-start gap-4">
          <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
            <CreditCard className="size-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-bold text-white leading-tight">
                {loan.description || 'Loan / Advance'}
              </h1>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${STATUS_CLS[loan.status]}`}>
                {loan.status}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-blue-100">
              <span className="font-mono font-semibold">{loan.employee.empCode}</span>
              <span className="mx-1.5">·</span>
              {loan.employee.name}
              <span className="mx-1.5 text-blue-200/60">|</span>
              {loan.employee.costCenter}
            </p>
            <p className="mt-0.5 text-[12px] text-blue-200">
              Started {MONTH_NAMES[loan.startMonth - 1]} {loan.startYear}
              <span className="mx-1.5">·</span>
              {months} month{months !== 1 ? 's' : ''} active
            </p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-border">
          {[
            { label: 'Total Amount',  value: fmt(loan.totalAmount),       unit: 'AED', cls: 'text-foreground' },
            { label: 'Paid',          value: fmt(loan.paidAmount),         unit: 'AED', cls: 'text-emerald-600' },
            { label: 'Balance',       value: fmt(remaining),               unit: 'AED', cls: remaining > 0 ? 'text-orange-600' : 'text-emerald-600' },
            { label: 'Monthly',       value: fmt(loan.installmentAmount),  unit: 'AED', cls: 'text-blue-600' },
          ].map(k => (
            <div key={k.label} className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{k.label}</p>
              <p className={`text-[17px] font-bold tabular-nums mt-0.5 ${k.cls}`}>
                {k.value} <span className="text-[11px] font-medium text-muted-foreground">{k.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-4">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-muted-foreground">{pct.toFixed(1)}% repaid</span>
            {loan.status === 'ACTIVE' && installmentsLeft > 0 && (
              <span className="text-orange-600 font-medium">{installmentsLeft} installment{installmentsLeft !== 1 ? 's' : ''} remaining</span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 rounded-xl border border-border overflow-hidden bg-card">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-colors flex-1 justify-center ${
              tab === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Health Assessment */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[12px] font-semibold">Repayment Assessment</p>
            </div>
            <div className="p-4 flex items-start gap-4">
              <div className={`size-14 rounded-xl flex items-center justify-center shrink-0 ${
                health.color === 'emerald' ? 'bg-emerald-50' :
                health.color === 'blue'   ? 'bg-blue-50'    :
                health.color === 'orange' ? 'bg-orange-50'  : 'bg-red-50'
              }`}>
                <health.Icon className={`size-7 ${
                  health.color === 'emerald' ? 'text-emerald-600' :
                  health.color === 'blue'    ? 'text-blue-600'    :
                  health.color === 'orange'  ? 'text-orange-600'  : 'text-red-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[16px] font-bold ${
                    health.color === 'emerald' ? 'text-emerald-700' :
                    health.color === 'blue'    ? 'text-blue-700'    :
                    health.color === 'orange'  ? 'text-orange-600'  : 'text-red-600'
                  }`}>{health.rating}</span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">
                  {(health.coverage * 100).toFixed(1)}% coverage of expected payments to date.
                  {health.rating === 'Excellent' && ' Repayment is ahead of or exactly on schedule.'}
                  {health.rating === 'On Track'  && ' Minor gap from expected — within acceptable range.'}
                  {health.rating === 'Fair'      && ' Significant underpayment detected. Monitor closely.'}
                  {health.rating === 'At Risk'   && ' Severely behind on repayment schedule. Immediate action required.'}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      health.color === 'emerald' ? 'bg-emerald-500' :
                      health.color === 'blue'    ? 'bg-blue-500'    :
                      health.color === 'orange'  ? 'bg-orange-500'  : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, health.coverage * 100).toFixed(1)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Loan Timeline */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[12px] font-semibold">Loan Timeline</p>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Start Date',        value: `${MONTH_NAMES[loan.startMonth - 1]} ${loan.startYear}` },
                { label: 'Months Active',     value: `${months} months` },
                { label: 'Installments Paid', value: `${loan.deductions.length}` },
                { label: 'Total Deducted',    value: `${fmt(loan.paidAmount)} AED` },
                { label: 'Remaining Balance', value: `${fmt(remaining)} AED` },
                { label: 'Est. Completion',   value: remaining > 0 && loan.installmentAmount > 0
                  ? (() => {
                      const futureMonths = Math.ceil(remaining / loan.installmentAmount);
                      const d = new Date();
                      d.setMonth(d.getMonth() + futureMonths);
                      return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
                    })()
                  : loan.status === 'COMPLETED' ? 'Completed' : 'N/A'
                },
              ].map(r => (
                <div key={r.label} className="bg-muted/40 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{r.label}</p>
                  <p className="text-[13px] font-semibold mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Overview */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-[12px] font-semibold">Employee Overview</p>
              <button
                onClick={() => router.push(`/${locale}/payroll/employees/${loan.employee.id}`)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <User className="size-3" />
                View Profile
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Employee Code', value: loan.employee.empCode },
                { label: 'Name',          value: loan.employee.name },
                { label: 'Cost Center',   value: loan.employee.costCenter },
                { label: 'Basic Salary',  value: `${fmt(loan.employee.basicSalary)} AED` },
                { label: 'Total Salary',  value: `${fmt(loan.employee.totalSalary)} AED` },
                { label: 'Status',        value: loan.employee.status },
              ].map(r => (
                <div key={r.label} className="bg-muted/40 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{r.label}</p>
                  <p className="text-[13px] font-semibold mt-0.5 truncate">{r.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === 'payments' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-[12px] font-semibold">Payment History</p>
            <span className="text-[11px] text-muted-foreground">
              Total deducted: <span className="font-semibold text-foreground">{fmt(loan.paidAmount)} AED</span>
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-muted-foreground">No payments recorded yet.</div>
          ) : (
            <div className="p-4">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />

                <div className="space-y-0">
                  {timeline.map((d, i) => (
                    <div key={d.id} className="flex items-start gap-3 relative pb-5 last:pb-0">
                      {/* Dot */}
                      <div className={`size-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                        i === 0 ? 'bg-blue-500' : 'bg-muted border border-border'
                      }`}>
                        <CheckCircle2 className={`size-3.5 ${i === 0 ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex items-center justify-between pt-0.5">
                        <div>
                          <p className="text-[13px] font-semibold">
                            {MONTH_NAMES[d.month - 1]} {d.year}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Cumulative paid after: <span className="font-medium text-foreground">{fmt(d.cumulative)} AED</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[14px] font-bold text-emerald-600 tabular-nums">
                            {fmt(d.amount)} AED
                          </p>
                          <p className="text-[10px] text-muted-foreground">deducted</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EDIT TAB ── */}
      {tab === 'edit' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[12px] font-semibold">Edit Loan Details</p>
            </div>
            <div className="p-4 space-y-4">
              <F label="Description">
                <input
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="Personal Advance, Medical, etc."
                  className={inp}
                />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Total Amount (AED)">
                  <input
                    type="number" min="1" step="0.01"
                    value={draft.totalAmount}
                    onChange={e => setDraft(d => ({ ...d, totalAmount: e.target.value }))}
                    className={inp}
                  />
                </F>
                <F label="Monthly Installment (AED)">
                  <input
                    type="number" min="1" step="0.01"
                    value={draft.installmentAmount}
                    onChange={e => setDraft(d => ({ ...d, installmentAmount: e.target.value }))}
                    className={inp}
                  />
                </F>
              </div>
              <F label="Status">
                <select
                  value={draft.status}
                  onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                  className={sel}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </F>
              <div className="flex justify-end pt-1">
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-200 bg-red-50/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-red-200 flex items-center gap-2">
              <AlertTriangle className="size-3.5 text-red-600" />
              <p className="text-[12px] font-semibold text-red-700">Danger Zone</p>
            </div>
            <div className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium text-foreground">Delete this loan</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Permanently removes this loan and all {loan.deductions.length} payment record{loan.deductions.length !== 1 ? 's' : ''}. Cannot be undone.
                </p>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors shrink-0"
              >
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                {deleting ? 'Deleting...' : 'Delete Loan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
