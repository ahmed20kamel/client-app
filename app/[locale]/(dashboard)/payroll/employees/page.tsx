'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Users, Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Employee {
  id: string; empCode: string; name: string; visaType: string;
  costCenter: string; wpsEntity: string; paymentMethod: string;
  basicSalary: number; allowances: number; totalSalary: number;
  otherAllowance: number; hoursPerDay: number; status: string; remarks?: string;
}

const COST_CENTERS = ['All', 'Stride Office', 'Stride Main', 'National Factory', 'Maisan Carpentry', 'Outside Visa'];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:     'bg-emerald-100 text-emerald-700',
  HOLD:       'bg-amber-100 text-amber-700',
  VACATION:   'bg-blue-100 text-blue-700',
  TERMINATED: 'bg-red-100 text-red-700',
};

export default function EmployeesPage() {
  const { locale } = useParams() as { locale: string };
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [center,    setCenter]    = useState('All');
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
    if (!confirm(`Delete employee ${name}? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/payroll/employees/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Employee deleted'); load(); }
    else        { toast.error('Failed to delete'); }
    setDeleting(null);
  };

  // Group by cost center
  const grouped: Record<string, Employee[]> = {};
  for (const e of employees) {
    if (!grouped[e.costCenter]) grouped[e.costCenter] = [];
    grouped[e.costCenter].push(e);
  }

  return (
    <div className="p-3 md:p-3.5 space-y-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Users className="size-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Payroll Employees</h1>
              <p className="text-sm text-muted-foreground">موظفو كشف الرواتب</p>
            </div>
          </div>
          <Link href={`/${locale}/payroll/employees/new`}>
            <Button size="sm"><Plus className="size-4 me-1" />Add Employee</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-border bg-muted/30 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or code…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {COST_CENTERS.map(c => (
              <button key={c} onClick={() => setCenter(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${center === c ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="size-10 mx-auto mb-2 opacity-20" />
            <p>No employees found</p>
            <Link href={`/${locale}/payroll/employees/new`} className="mt-3 inline-block">
              <Button size="sm" variant="outline"><Plus className="size-4 me-1" />Add First Employee</Button>
            </Link>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.entries(grouped).map(([cc, emps]) => (
              <div key={cc}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider px-3 py-1 bg-primary/10 rounded-full">{cc} — {emps.length}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground">
                        <th className="px-3 py-2.5 text-left font-semibold text-xs">Code</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-xs">Name</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-xs">VISA</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-xs">WPS Entity</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-xs">Basic</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-xs">Allowances</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-xs">Total</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-xs">Pay</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-xs">Status</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emps.map((emp, i) => (
                        <tr key={emp.id} className={i % 2 === 0 ? 'bg-white dark:bg-background' : 'bg-muted/20'}>
                          <td className="px-3 py-2.5 font-mono text-xs text-primary font-semibold">{emp.empCode}</td>
                          <td className="px-3 py-2.5 font-medium">{emp.name}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{emp.visaType}</td>
                          <td className="px-3 py-2.5 text-xs">{emp.wpsEntity}</td>
                          <td className="px-3 py-2.5 text-right">{fmt(emp.basicSalary)}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(emp.allowances)}</td>
                          <td className="px-3 py-2.5 text-right font-bold">{fmt(emp.totalSalary)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.paymentMethod === 'Cash' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {emp.paymentMethod}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[emp.status] || 'bg-muted text-muted-foreground'}`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/${locale}/payroll/employees/${emp.id}`}>
                                <button className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                                  <Edit className="size-3.5" />
                                </button>
                              </Link>
                              <button onClick={() => handleDelete(emp.id, emp.name)}
                                disabled={deleting === emp.id}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50">
                                {deleting === emp.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 border-t border-border font-bold">
                        <td colSpan={4} className="px-3 py-2 text-right text-xs text-muted-foreground uppercase">Subtotal ({emps.length})</td>
                        <td className="px-3 py-2 text-right text-xs">{fmt(emps.reduce((s, e) => s + e.basicSalary, 0))}</td>
                        <td className="px-3 py-2 text-right text-xs">{fmt(emps.reduce((s, e) => s + e.allowances, 0))}</td>
                        <td className="px-3 py-2 text-right text-xs">{fmt(emps.reduce((s, e) => s + e.totalSalary, 0))}</td>
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
