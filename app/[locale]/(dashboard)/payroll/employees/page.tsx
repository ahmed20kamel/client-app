'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Users, Plus, Search, Pencil, Trash2, Loader2, UserCheck, UserX, CreditCard, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Employee {
  id: string; empCode: string; name: string; visaType: string;
  costCenter: string; wpsEntity: string; paymentMethod: string;
  basicSalary: number; allowances: number; totalSalary: number;
  otherAllowance: number; hoursPerDay: number; status: string; remarks?: string;
}

const COST_CENTERS = ['All', 'Stride Office', 'Stride Main', 'National Factory', 'Maisan Carpentry', 'Outside Visa'];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE:     { label: 'Active',     cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  HOLD:       { label: 'On Hold',    cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  VACATION:   { label: 'Vacation',   cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  TERMINATED: { label: 'Terminated', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
};

const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/payroll/employees/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Employee removed'); load(); }
    else        { toast.error('Failed to remove employee'); }
    setDeleting(null);
  };

  // Stats
  const active     = employees.filter(e => e.status === 'ACTIVE').length;
  const onHold     = employees.filter(e => e.status === 'HOLD' || e.status === 'VACATION').length;
  const wpsTotal   = employees.filter(e => e.paymentMethod === 'WPS').reduce((s, e) => s + e.totalSalary, 0);
  const cashTotal  = employees.filter(e => e.paymentMethod === 'Cash').reduce((s, e) => s + e.totalSalary, 0);

  // Group by cost center
  const grouped: Record<string, Employee[]> = {};
  for (const e of employees) {
    if (!grouped[e.costCenter]) grouped[e.costCenter] = [];
    grouped[e.costCenter].push(e);
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{employees.length} employees across all cost centers</p>
        </div>
        <Link href={`/${locale}/payroll/employees/new`}>
          <Button size="sm" className="gap-2">
            <Plus className="size-4" /> Add Employee
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <UserCheck className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active</p>
              <p className="text-xl font-bold">{active}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <UserX className="size-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">On Hold / Vacation</p>
              <p className="text-xl font-bold">{onHold}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">WPS Total</p>
              <p className="text-lg font-bold">{fmt(wpsTotal)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Banknote className="size-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cash Total</p>
              <p className="text-lg font-bold">{fmt(cashTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or code…"
            className="w-full pl-9 pr-3 h-9 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {COST_CENTERS.map(c => (
            <button key={c} onClick={() => setCenter(c)}
              className={`px-3 h-9 rounded-lg text-xs font-medium transition-colors ${
                center === c
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-card rounded-xl border border-border text-center py-20">
          <Users className="size-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No employees found</p>
          <Link href={`/${locale}/payroll/employees/new`} className="mt-4 inline-block">
            <Button size="sm" variant="outline"><Plus className="size-4 me-1.5" />Add Employee</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cc, emps]) => (
            <div key={cc} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Cost center header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">{cc}</span>
                <span className="text-xs text-muted-foreground">{emps.length} {emps.length === 1 ? 'employee' : 'employees'}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Code</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Visa</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">WPS Entity</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Basic</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Allowances</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Total</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Payment</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {emps.map(emp => {
                      const st = STATUS_CONFIG[emp.status] || { label: emp.status, cls: 'bg-muted text-muted-foreground' };
                      return (
                        <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{emp.empCode}</td>
                          <td className="px-4 py-3 font-medium text-sm">{emp.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{emp.visaType}</td>
                          <td className="px-4 py-3 text-xs">{emp.wpsEntity}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmt(emp.basicSalary)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(emp.allowances)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(emp.totalSalary)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              emp.paymentMethod === 'Cash'
                                ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                                : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                            }`}>
                              {emp.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${st.cls}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/${locale}/payroll/employees/${emp.id}`}>
                                <button className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                                  <Pencil className="size-3.5" />
                                </button>
                              </Link>
                              <button
                                onClick={() => handleDelete(emp.id, emp.name)}
                                disabled={deleting === emp.id}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"
                              >
                                {deleting === emp.id
                                  ? <Loader2 className="size-3.5 animate-spin" />
                                  : <Trash2 className="size-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                        Subtotal — {emps.length} employees
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums">
                        {fmt(emps.reduce((s, e) => s + e.basicSalary, 0))}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                        {fmt(emps.reduce((s, e) => s + e.allowances, 0))}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold tabular-nums">
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
  );
}
