'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, Loader2, UserCheck, UserX, CreditCard, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Employee {
  id: string; empCode: string; name: string; visaType: string;
  costCenter: string; wpsEntity: string; paymentMethod: string;
  basicSalary: number; allowances: number; totalSalary: number;
  status: string;
}

const CENTERS = ['All', 'Stride Office', 'Stride Main', 'National Factory', 'Maisan Carpentry', 'Outside Visa'];

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE:     { label: 'Active',     cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  HOLD:       { label: 'On Hold',    cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  VACATION:   { label: 'Vacation',   cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  TERMINATED: { label: 'Terminated', cls: 'bg-red-50 text-red-600 ring-red-200' },
};

const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatCard({ icon: Icon, label, value, iconCls }: { icon: any; label: string; value: string | number; iconCls: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-lg font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { locale } = useParams() as { locale: string };
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [center,    setCenter]    = useState('All');
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (center !== 'All') p.set('costCenter', center);
    const res = await fetch(`/api/payroll/employees?${p}`);
    const { data } = await res.json();
    setEmployees(data || []);
    setLoading(false);
  }, [search, center]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/payroll/employees/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Removed'); load(); } else toast.error('Failed');
    setDeleting(null);
  };

  const active   = employees.filter(e => e.status === 'ACTIVE').length;
  const inactive = employees.filter(e => e.status !== 'ACTIVE' && e.status !== 'TERMINATED').length;
  const wpsTotal = employees.filter(e => e.paymentMethod === 'WPS').reduce((s, e) => s + e.totalSalary, 0);
  const cashTotal = employees.filter(e => e.paymentMethod === 'Cash').reduce((s, e) => s + e.totalSalary, 0);

  const grouped: Record<string, Employee[]> = {};
  for (const e of employees) {
    (grouped[e.costCenter] ??= []).push(e);
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Employees</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {employees.length} employees across all cost centers
          </p>
        </div>
        <Link href={`/${locale}/payroll/employees/new`}>
          <Button size="sm" className="gap-1.5"><Plus className="size-3.5" />Add Employee</Button>
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={UserCheck}  label="Active"         value={active}       iconCls="bg-emerald-50 text-emerald-600" />
        <StatCard icon={UserX}      label="Hold / Vacation" value={inactive}     iconCls="bg-amber-50 text-amber-600" />
        <StatCard icon={CreditCard} label="WPS Total (AED)" value={fmt(wpsTotal)} iconCls="bg-primary/10 text-primary" />
        <StatCard icon={Banknote}   label="Cash Total (AED)" value={fmt(cashTotal)} iconCls="bg-orange-50 text-orange-600" />
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* Filter bar */}
        <div className="px-4 py-2.5 border-b border-border flex flex-wrap items-center gap-2.5 bg-muted/20">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or code…"
              className="w-full pl-8 pr-3 h-8 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {CENTERS.map(c => (
              <button key={c} onClick={() => setCenter(c)}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                  center === c ? 'bg-primary text-white' : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-muted-foreground">No employees found</p>
            <Link href={`/${locale}/payroll/employees/new`} className="mt-3 inline-block">
              <Button size="sm" variant="outline"><Plus className="size-3.5 me-1.5" />Add First Employee</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {Object.entries(grouped).map(([cc, emps]) => (
              <div key={cc}>
                {/* Cost center row */}
                <div className="px-4 py-2 bg-muted/30 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{cc}</span>
                  <span className="text-[11px] text-muted-foreground">{emps.length}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60">
                        {['Code','Name','Visa','WPS Entity','Basic','Allowances','Total','Payment','Status',''].map(h => (
                          <th key={h} className={`px-4 h-9 text-xs font-medium text-muted-foreground whitespace-nowrap ${
                            ['Basic','Allowances','Total'].includes(h) ? 'text-right' : ['Payment','Status',''].includes(h) ? 'text-center' : 'text-left'
                          }`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {emps.map(emp => {
                        const st = STATUS[emp.status] ?? { label: emp.status, cls: 'bg-muted text-muted-foreground ring-border' };
                        return (
                          <tr key={emp.id} className="hover:bg-muted/25 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[12px] font-semibold text-primary whitespace-nowrap">{emp.empCode}</td>
                            <td className="px-4 py-2.5 text-[13px] font-medium whitespace-nowrap">{emp.name}</td>
                            <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{emp.visaType}</td>
                            <td className="px-4 py-2.5 text-[12px]">{emp.wpsEntity}</td>
                            <td className="px-4 py-2.5 text-[13px] text-right tabular-nums">{fmt(emp.basicSalary)}</td>
                            <td className="px-4 py-2.5 text-[13px] text-right tabular-nums text-muted-foreground">{fmt(emp.allowances)}</td>
                            <td className="px-4 py-2.5 text-[13px] text-right tabular-nums font-semibold">{fmt(emp.totalSalary)}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ${
                                emp.paymentMethod === 'Cash' ? 'bg-orange-50 text-orange-700 ring-orange-200' : 'bg-blue-50 text-blue-700 ring-blue-200'
                              }`}>{emp.paymentMethod}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ${st.cls}`}>
                                {st.label}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <Link href={`/${locale}/payroll/employees/${emp.id}`}>
                                  <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <Pencil className="size-3.5" />
                                  </button>
                                </Link>
                                <button onClick={() => remove(emp.id, emp.name)} disabled={deleting === emp.id}
                                  className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40">
                                  {deleting === emp.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td colSpan={4} className="px-4 py-2 text-[11px] font-medium text-muted-foreground">
                          Subtotal · {emps.length} employees
                        </td>
                        <td className="px-4 py-2 text-[12px] font-semibold text-right tabular-nums">
                          {fmt(emps.reduce((s, e) => s + e.basicSalary, 0))}
                        </td>
                        <td className="px-4 py-2 text-[12px] font-medium text-right tabular-nums text-muted-foreground">
                          {fmt(emps.reduce((s, e) => s + e.allowances, 0))}
                        </td>
                        <td className="px-4 py-2 text-[13px] font-bold text-right tabular-nums">
                          {fmt(emps.reduce((s, e) => s + e.totalSalary, 0))}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
