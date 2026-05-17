'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Loader2, CreditCard, ChevronDown, ChevronUp, AlertCircle, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt = (n: number) => (n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const inp = "w-full h-9 border border-input rounded-lg px-3 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow placeholder:text-muted-foreground/50";
const sel = `${inp} appearance-none`;

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

interface Employee { id: string; empCode: string; name: string; costCenter: string; }
interface Loan {
  id: string;
  description: string | null;
  totalAmount: number;
  paidAmount: number;
  installmentAmount: number;
  status: string;
  startMonth: number;
  startYear: number;
  employee: Employee;
  deductions: { id: string; month: number; year: number; amount: number }[];
}

const STATUS_CLS: Record<string, string> = {
  ACTIVE:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CANCELLED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

function LoanRow({ loan, onCancel, onDelete, locale }: {
  loan: Loan;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  locale: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const remaining       = Math.max(0, loan.totalAmount - loan.paidAmount);
  const pct             = loan.totalAmount > 0 ? Math.min(100, (loan.paidAmount / loan.totalAmount) * 100) : 0;
  const installmentsLeft = loan.installmentAmount > 0 ? Math.ceil(remaining / loan.installmentAmount) : 0;

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all"
      onClick={() => router.push(`/${locale}/payroll/loans/${loan.id}`)}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Icon */}
        <div className="mt-0.5 size-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <CreditCard className="size-4 text-blue-600" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold">{loan.description || 'Loan / Advance'}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${STATUS_CLS[loan.status]}`}>
              {loan.status}
            </span>
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            <span className="font-medium text-primary">{loan.employee.empCode}</span>
            <span className="mx-1">·</span>
            {loan.employee.name}
            <span className="mx-1.5 text-border">|</span>
            {loan.employee.costCenter}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            From {MONTH_NAMES[loan.startMonth - 1]} {loan.startYear}
            <span className="mx-1.5">·</span>
            <span className="font-medium text-foreground">{fmt(loan.installmentAmount)} AED</span>/month
            {loan.status === 'ACTIVE' && installmentsLeft > 0 && (
              <span className="ml-2 text-orange-600 font-medium">· {installmentsLeft} left</span>
            )}
          </div>

          {/* Progress */}
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Paid <span className="text-foreground font-semibold">{fmt(loan.paidAmount)}</span></span>
              <span className="text-muted-foreground">Total <span className="text-foreground font-semibold">{fmt(loan.totalAmount)}</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{pct.toFixed(0)}% paid</span>
              <span className="font-semibold text-orange-600">{fmt(remaining)} remaining</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {loan.status === 'ACTIVE' && (
            <button
              onClick={e => { e.stopPropagation(); onCancel(loan.id); }}
              className="h-7 px-2.5 text-[11px] rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium"
            >
              Cancel
            </button>
          )}
          {loan.status !== 'ACTIVE' && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(loan.id); }}
              className="h-7 px-2.5 text-[11px] rounded-md border border-border text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Deduction History</p>
          {loan.deductions.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No deductions yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {loan.deductions.map(d => (
                <div key={d.id} className="flex justify-between text-[12px] bg-muted/40 rounded-md px-2.5 py-1.5">
                  <span className="text-muted-foreground">{MONTH_NAMES[d.month - 1]} {d.year}</span>
                  <span className="font-semibold tabular-nums">{fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddLoanModal({ employees, onAdd, onClose }: {
  employees: Employee[];
  onAdd: (empId: string, data: any) => Promise<void>;
  onClose: () => void;
}) {
  const now = new Date();
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    description: '',
    totalAmount: '',
    installmentAmount: '',
    startMonth: String(now.getMonth() + 1),
    startYear: String(now.getFullYear()),
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filtered = employees.filter(e =>
    !empSearch ||
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.empCode.toLowerCase().includes(empSearch.toLowerCase())
  );

  const installmentsCount = form.totalAmount && form.installmentAmount
    ? Math.ceil(parseFloat(form.totalAmount) / parseFloat(form.installmentAmount))
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) { toast.error('Select an employee'); return; }
    if (!form.totalAmount || !form.installmentAmount) { toast.error('Fill in all amounts'); return; }
    setSaving(true);
    try {
      await onAdd(selectedEmp.id, {
        description: form.description || null,
        totalAmount: parseFloat(form.totalAmount),
        installmentAmount: parseFloat(form.installmentAmount),
        startMonth: parseInt(form.startMonth),
        startYear: parseInt(form.startYear),
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <CreditCard className="size-4 text-blue-600" />
            </div>
            <h2 className="text-[14px] font-semibold">New Loan / Advance</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Employee selector */}
          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Employee</label>
            {selectedEmp ? (
              <div className="flex items-center justify-between h-9 px-3 rounded-lg border border-primary/40 bg-primary/5">
                <span className="text-[13px]">
                  <span className="font-mono text-primary text-[12px] mr-1.5">{selectedEmp.empCode}</span>
                  {selectedEmp.name}
                </span>
                <button type="button" onClick={() => setSelectedEmp(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    placeholder="Search employee..."
                    className="w-full h-9 border border-input rounded-lg pl-8 pr-3 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border/40">
                  {filtered.slice(0, 20).map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => { setSelectedEmp(emp); setEmpSearch(''); }}
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <span className="font-mono text-primary text-[11px] mr-1.5">{emp.empCode}</span>
                      <span className="text-[12px]">{emp.name}</span>
                      <span className="text-[11px] text-muted-foreground ml-1.5">· {emp.costCenter}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="px-3 py-2 text-[12px] text-muted-foreground">No results.</p>}
                </div>
              </div>
            )}
          </div>

          {/* Loan details */}
          <F label="Description (optional)">
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Personal Advance, Medical, etc." className={inp} />
          </F>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex items-center gap-1.5 text-[12px] text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
              <AlertCircle className="size-3.5 shrink-0" />
              {installmentsCount} installment{installmentsCount !== 1 ? 's' : ''} of {fmt(parseFloat(form.installmentAmount))} AED
              {parseFloat(form.totalAmount) % parseFloat(form.installmentAmount) !== 0 && (
                <span className="ml-1">(last: {fmt(parseFloat(form.totalAmount) - (installmentsCount - 1) * parseFloat(form.installmentAmount))} AED)</span>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving || !selectedEmp} className="flex-1 gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              {saving ? 'Adding...' : 'Add Loan'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoansPage() {
  const { locale } = useParams() as { locale: string };
  const [loans,     setLoans]     = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [filter,    setFilter]    = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');
  const [search,    setSearch]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [loansRes, empRes] = await Promise.all([
      fetch('/api/payroll/loans'),
      fetch('/api/payroll/employees?status=ACTIVE'),
    ]);
    const [loansJson, empJson] = await Promise.all([loansRes.json(), empRes.json()]);
    setLoans(loansJson.data || []);
    setEmployees(empJson.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (empId: string, data: any) => {
    const res = await fetch(`/api/payroll/employees/${empId}/loans`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error || 'Failed'); return; }
    toast.success('Loan added');
    setShowAdd(false);
    load();
  };

  const handleCancel = async (loanId: string) => {
    if (!confirm('Cancel this loan? Stops future deductions.')) return;
    const res = await fetch(`/api/payroll/loans/${loanId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    if (!res.ok) { toast.error('Failed'); return; }
    toast.success('Loan cancelled');
    load();
  };

  const handleDelete = async (loanId: string) => {
    if (!confirm('Delete this loan permanently?')) return;
    const res = await fetch(`/api/payroll/loans/${loanId}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed'); return; }
    toast.success('Deleted');
    load();
  };

  const filtered = loans.filter(l => {
    const matchStatus = filter === 'ALL' || l.status === filter;
    const matchSearch = !search ||
      l.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      l.employee.empCode.toLowerCase().includes(search.toLowerCase()) ||
      (l.description || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const totalActive = activeLoans.reduce((s, l) => s + Math.max(0, l.totalAmount - l.paidAmount), 0);
  const totalMonthly = activeLoans.reduce((s, l) => s + l.installmentAmount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Loans & Advances</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Manage employee loans and monthly deductions
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5">
          <Plus className="size-3.5" />
          New Loan
        </Button>
      </div>

      {/* Summary cards */}
      {!loading && activeLoans.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Loans',       value: activeLoans.length,     unit: '',    cls: 'text-blue-700' },
            { label: 'Total Outstanding',  value: fmt(totalActive),        unit: 'AED', cls: 'text-orange-600' },
            { label: 'Monthly Deductions', value: fmt(totalMonthly),       unit: 'AED', cls: 'text-purple-700' },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{c.label}</p>
              <p className={`text-[18px] font-bold tabular-nums mt-0.5 ${c.cls}`}>{c.value} <span className="text-[12px] font-medium">{c.unit}</span></p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee or description..."
            className="w-full h-8 border border-input rounded-lg pl-8 pr-3 text-[12px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['ALL','ACTIVE','COMPLETED','CANCELLED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 h-8 text-[11px] font-medium transition-colors ${
                filter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {s === 'ALL' ? `All (${loans.length})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${loans.filter(l => l.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[13px] text-muted-foreground">
          {filter === 'ACTIVE' ? 'No active loans.' : 'No loans found.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(loan => (
            <LoanRow key={loan.id} loan={loan} onCancel={handleCancel} onDelete={handleDelete} locale={locale} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddLoanModal
          employees={employees}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}