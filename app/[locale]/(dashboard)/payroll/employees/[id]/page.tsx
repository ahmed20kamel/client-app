'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Plus, Trash2, CreditCard, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const COST_CENTERS = ['Stride Office', 'Stride Main', 'National Factory', 'Maisan Carpentry', 'Outside Visa'];
const VISA_TYPES   = ['SC-MAIN', 'NF', 'ALUM', 'MAISAN', 'Outside', 'NW'];
const WPS_ENTITIES = ['SC', 'SC-RAK', 'Maisan', 'NF', 'Cash'];
const STATUSES     = ['ACTIVE', 'HOLD', 'VACATION', 'TERMINATED'];
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Active', HOLD: 'On Hold', VACATION: 'Vacation', TERMINATED: 'Terminated' };
const MONTH_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const inp = "w-full h-9 border border-input rounded-lg px-3 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow placeholder:text-muted-foreground/50";
const sel = `${inp} appearance-none`;
const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface Loan {
  id: string;
  description: string | null;
  totalAmount: number;
  paidAmount: number;
  installmentAmount: number;
  status: string;
  startMonth: number;
  startYear: number;
  deductions: { id: string; month: number; year: number; amount: number }[];
}

const LOAN_STATUS_CLS: Record<string, string> = {
  ACTIVE:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CANCELLED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

function LoanCard({ loan, onCancel, onDelete }: { loan: Loan; onCancel: (id: string) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const remaining  = Math.max(0, loan.totalAmount - loan.paidAmount);
  const pct        = loan.totalAmount > 0 ? Math.min(100, (loan.paidAmount / loan.totalAmount) * 100) : 0;
  const installmentsLeft = loan.installmentAmount > 0 ? Math.ceil(remaining / loan.installmentAmount) : 0;

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 size-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <CreditCard className="size-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold">{loan.description || 'Loan / Advance'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${LOAN_STATUS_CLS[loan.status]}`}>
              {loan.status}
            </span>
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Started {MONTH_NAMES[loan.startMonth - 1]} {loan.startYear}
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
              {loan.status === 'ACTIVE' && installmentsLeft > 0 && (
                <span className="ml-2">· ~{installmentsLeft} installment{installmentsLeft !== 1 ? 's' : ''} left</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {loan.status === 'ACTIVE' && (
            <button
              onClick={() => onCancel(loan.id)}
              className="h-7 px-2 text-[11px] rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {loan.status !== 'ACTIVE' && (
            <button
              onClick={() => onDelete(loan.id)}
              className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded text-muted-foreground hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
      </div>

      {expanded && loan.deductions.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Deduction History</p>
          <div className="space-y-1">
            {loan.deductions.map(d => (
              <div key={d.id} className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">{MONTH_NAMES[d.month - 1]} {d.year}</span>
                <span className="font-medium tabular-nums">{fmt(d.amount)} AED</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && loan.deductions.length === 0 && (
        <div className="border-t border-border px-4 py-3 text-[12px] text-muted-foreground">
          No deductions recorded yet.
        </div>
      )}
    </div>
  );
}

function AddLoanForm({ onAdd }: { onAdd: (data: any) => void }) {
  const now = new Date();
  const [form, setForm] = useState({
    description: '',
    totalAmount: '',
    installmentAmount: '',
    startMonth: String(now.getMonth() + 1),
    startYear: String(now.getFullYear()),
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.totalAmount || !form.installmentAmount) {
      toast.error('Total amount and installment amount are required');
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        description: form.description || null,
        totalAmount: parseFloat(form.totalAmount),
        installmentAmount: parseFloat(form.installmentAmount),
        startMonth: parseInt(form.startMonth),
        startYear: parseInt(form.startYear),
      });
      setForm({ description: '', totalAmount: '', installmentAmount: '', startMonth: String(now.getMonth() + 1), startYear: String(now.getFullYear()) });
    } finally {
      setSaving(false);
    }
  };

  const installmentsCount = form.totalAmount && form.installmentAmount
    ? Math.ceil(parseFloat(form.totalAmount) / parseFloat(form.installmentAmount))
    : null;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-4 space-y-3">
      <p className="text-[12px] font-semibold text-blue-700">New Loan / Advance</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <F label="Description">
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Personal Advance, Medical" className={inp} />
          </F>
        </div>
        <F label="Total Amount (AED)">
          <input type="number" min="1" step="0.01" value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)} placeholder="0.00" className={inp} required />
        </F>
        <F label="Monthly Installment (AED)">
          <input type="number" min="1" step="0.01" value={form.installmentAmount} onChange={e => set('installmentAmount', e.target.value)} placeholder="0.00" className={inp} required />
        </F>
        <F label="Start Month">
          <select value={form.startMonth} onChange={e => set('startMonth', e.target.value)} className={sel}>
            {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </F>
        <F label="Start Year">
          <input type="number" min="2024" max="2030" value={form.startYear} onChange={e => set('startYear', e.target.value)} className={inp} />
        </F>
      </div>

      {installmentsCount !== null && (
        <div className="flex items-center gap-1.5 text-[12px] text-blue-700 bg-blue-100 rounded-md px-3 py-1.5">
          <AlertCircle className="size-3.5 shrink-0" />
          {installmentsCount} installment{installmentsCount !== 1 ? 's' : ''} of {form.installmentAmount && fmt(parseFloat(form.installmentAmount))} AED
          {parseFloat(form.totalAmount) % parseFloat(form.installmentAmount) !== 0 && (
            <span className="ml-1">(last: {fmt(parseFloat(form.totalAmount) - (installmentsCount - 1) * parseFloat(form.installmentAmount))} AED)</span>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add Loan
        </Button>
      </div>
    </form>
  );
}

export default function EditEmployeePage() {
  const router = useRouter();
  const { locale, id } = useParams() as { locale: string; id: string };
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'info' | 'loans'>('info');

  const [loans, setLoans]               = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [showAddLoan,  setShowAddLoan]  = useState(false);

  useEffect(() => {
    fetch(`/api/payroll/employees/${id}`).then(r => r.json()).then(({ data }) => {
      setForm({
        ...data,
        basicSalary:    String(data.basicSalary    ?? ''),
        allowances:     String(data.allowances     ?? ''),
        otherAllowance: String(data.otherAllowance ?? ''),
        hoursPerDay:    String(data.hoursPerDay    ?? ''),
        startDate:      data.startDate ? data.startDate.slice(0, 10) : '',
        remarks:        data.remarks ?? '',
      });
      setLoading(false);
    });
  }, [id]);

  const loadLoans = useCallback(async () => {
    setLoansLoading(true);
    try {
      const res = await fetch(`/api/payroll/employees/${id}/loans`);
      const json = await res.json();
      if (res.ok) setLoans(json.data || []);
    } finally {
      setLoansLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'loans') loadLoans();
  }, [activeTab, loadLoans]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  const total = (parseFloat(form.basicSalary) || 0) + (parseFloat(form.allowances) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/payroll/employees/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          basicSalary: parseFloat(form.basicSalary) || 0,
          allowances: parseFloat(form.allowances) || 0,
          otherAllowance: parseFloat(form.otherAllowance) || 0,
          hoursPerDay: parseFloat(form.hoursPerDay) || 9,
          startDate: form.startDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Failed'); return; }
      toast.success('Saved');
      router.push(`/${locale}/payroll/employees`);
    } finally { setSaving(false); }
  };

  const handleAddLoan = async (data: any) => {
    const res = await fetch(`/api/payroll/employees/${id}/loans`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error || 'Failed to add loan'); return; }
    toast.success('Loan added');
    setShowAddLoan(false);
    loadLoans();
  };

  const handleCancelLoan = async (loanId: string) => {
    if (!confirm('Cancel this loan? This will stop future deductions.')) return;
    const res = await fetch(`/api/payroll/loans/${loanId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    if (!res.ok) { toast.error('Failed'); return; }
    toast.success('Loan cancelled');
    loadLoans();
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm('Delete this loan permanently?')) return;
    const res = await fetch(`/api/payroll/loans/${loanId}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed'); return; }
    toast.success('Deleted');
    loadLoans();
  };

  const activeLoans     = loans.filter(l => l.status === 'ACTIVE');
  const inactiveLoans   = loans.filter(l => l.status !== 'ACTIVE');
  const totalMonthlyDed = activeLoans.reduce((s, l) => s + l.installmentAmount, 0);

  if (loading) return (
    <div className="flex justify-center items-center min-h-52">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2.5">
        <Link href={`/${locale}/payroll/employees`}>
          <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{form.name}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            <span className="font-mono text-primary text-[12px]">{form.empCode}</span>
            <span className="mx-1.5 text-border">·</span>
            {form.costCenter}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['info', 'loans'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'info' ? 'Employee Info' : (
              <span className="flex items-center gap-1.5">
                Loans & Advances
                {activeLoans.length > 0 && (
                  <span className="size-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeLoans.length}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <form onSubmit={handleSubmit} className="space-y-3">
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
                  {total.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
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
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Link href={`/${locale}/payroll/employees`}>
              <Button type="button" variant="outline" size="sm">Cancel</Button>
            </Link>
          </div>
        </form>
      )}

      {activeTab === 'loans' && (
        <div className="space-y-3 pb-6">
          {activeLoans.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-orange-800">
                  {activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''}
                </p>
                <p className="text-[11px] text-orange-700 mt-0.5">
                  Total monthly deduction: <span className="font-bold">{fmt(totalMonthlyDed)} AED</span>
                </p>
              </div>
              <CreditCard className="size-5 text-orange-400" />
            </div>
          )}

          {loansLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {activeLoans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-0.5">Active</p>
                  {activeLoans.map(loan => (
                    <LoanCard key={loan.id} loan={loan} onCancel={handleCancelLoan} onDelete={handleDeleteLoan} />
                  ))}
                </div>
              )}

              {showAddLoan ? (
                <div>
                  <AddLoanForm onAdd={handleAddLoan} />
                  <button
                    onClick={() => setShowAddLoan(false)}
                    className="mt-2 text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddLoan(true)}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-border text-[13px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus className="size-4" />
                  Add Loan / Advance
                </button>
              )}

              {inactiveLoans.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-0.5">History</p>
                  {inactiveLoans.map(loan => (
                    <LoanCard key={loan.id} loan={loan} onCancel={handleCancelLoan} onDelete={handleDeleteLoan} />
                  ))}
                </div>
              )}

              {loans.length === 0 && !showAddLoan && (
                <div className="text-center py-10 text-[13px] text-muted-foreground">
                  No loans recorded for this employee.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}