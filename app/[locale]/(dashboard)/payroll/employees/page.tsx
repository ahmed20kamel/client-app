'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Plus, Search, Pencil, Trash2, Loader2,
  UserCheck, UserX, CreditCard, Banknote,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  X, Trash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';

interface Employee {
  id: string; empCode: string; name: string; visaType: string;
  costCenter: string; wpsEntity: string; paymentMethod: string;
  basicSalary: number; allowances: number; totalSalary: number; status: string;
}

// ── Options ─────────────────────────────────────────────────────────
const CENTER_OPTS = [
  { value: '', label: 'All Cost Centers' },
  ...['Stride Office','Stride Main','National Factory','Maisan Carpentry','Outside Visa']
    .map(c => ({ value: c, label: c })),
];
const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE',     label: 'Active' },
  { value: 'HOLD',       label: 'On Hold' },
  { value: 'VACATION',   label: 'Vacation' },
  { value: 'TERMINATED', label: 'Terminated' },
];
const PAY_OPTS = [
  { value: '', label: 'All Payments' },
  { value: 'WPS',  label: 'WPS' },
  { value: 'Cash', label: 'Cash' },
];
const PAGE_SIZES = [25, 50, 100];

const STATUS_CLS: Record<string, string> = {
  ACTIVE:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  HOLD:       'bg-amber-50 text-amber-700 ring-amber-200',
  VACATION:   'bg-sky-50 text-sky-700 ring-sky-200',
  TERMINATED: 'bg-red-50 text-red-600 ring-red-200',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', HOLD: 'On Hold', VACATION: 'Vacation', TERMINATED: 'Terminated',
};

const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Sort helper ──────────────────────────────────────────────────────
type SortCol = 'empCode' | 'name' | 'costCenter' | 'basicSalary' | 'totalSalary';
type SortDir = 'asc' | 'desc';

function SortTh({ col, label, sort, onSort, className = '' }: {
  col: SortCol; label: string;
  sort: { col: SortCol; dir: SortDir } | null;
  onSort: (col: SortCol) => void;
  className?: string;
}) {
  const active = sort?.col === col;
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={`px-4 h-9 text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap ${className}`}
      onClick={() => onSort(col)}
    >
      <div className={`inline-flex items-center gap-1 group ${className.includes('text-right') ? 'flex-row-reverse' : ''}`}>
        {label}
        <Icon className={`size-3 transition-opacity ${active ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-50'}`} />
      </div>
    </th>
  );
}

// ── Skeleton rows ────────────────────────────────────────────────────
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border/40 animate-pulse">
          <td className="px-4 py-3"><div className="size-4 rounded bg-muted" /></td>
          {Array.from({ length: cols - 1 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className={`h-3.5 rounded bg-muted ${j === 1 ? 'w-32' : j === 0 ? 'w-14' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function EmployeesPage() {
  const { locale } = useParams() as { locale: string };

  // ── Data ──
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  // ── Filters ──
  const [search,  setSearch]  = useState('');
  const [center,  setCenter]  = useState('');
  const [status,  setStatus]  = useState('');
  const [payment, setPayment] = useState('');

  // ── Sort ──
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir } | null>(null);

  // ── Pagination ──
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Selection ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/payroll/employees');
    const { data } = await res.json();
    setEmployees(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filter + Sort + Paginate ──
  const filtered = useMemo(() => {
    let list = employees;
    if (search)  list = list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.empCode.toLowerCase().includes(search.toLowerCase()));
    if (center)  list = list.filter(e => e.costCenter  === center);
    if (status)  list = list.filter(e => e.status       === status);
    if (payment) list = list.filter(e => e.paymentMethod === payment);
    if (sort) {
      list = [...list].sort((a, b) => {
        const av = a[sort.col], bv = b[sort.col];
        const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [employees, search, center, status, payment, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, center, status, payment, sort]);

  // ── Selection helpers ──
  const allOnPage   = paginated.length > 0 && paginated.every(e => selected.has(e.id));
  const someOnPage  = paginated.some(e => selected.has(e.id));
  const toggleAll   = () => {
    setSelected(prev => {
      const next = new Set(prev);
      allOnPage ? paginated.forEach(e => next.delete(e.id)) : paginated.forEach(e => next.add(e.id));
      return next;
    });
  };
  const toggleOne = (id: string) =>
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  // ── Sort handler ──
  const handleSort = (col: SortCol) =>
    setSort(s => s?.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });

  // ── Delete ──
  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/payroll/employees/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Removed'); load(); } else toast.error('Failed');
    setDeleting(null);
  };

  // ── Bulk delete ──
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} employee(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    await Promise.all([...selected].map(id => fetch(`/api/payroll/employees/${id}`, { method: 'DELETE' })));
    toast.success(`${selected.size} employees removed`);
    setSelected(new Set());
    load();
    setBulkDeleting(false);
  };

  // ── Clear filters ──
  const activeFilters = [center, status, payment].filter(Boolean).length + (search ? 1 : 0);
  const clearFilters  = () => { setSearch(''); setCenter(''); setStatus(''); setPayment(''); };

  // ── Stats ──
  const active   = employees.filter(e => e.status === 'ACTIVE').length;
  const inactive = employees.filter(e => e.status !== 'ACTIVE' && e.status !== 'TERMINATED').length;
  const wpsTotal = employees.filter(e => e.paymentMethod === 'WPS').reduce((s, e) => s + e.totalSalary, 0);
  const cashTotal = employees.filter(e => e.paymentMethod === 'Cash').reduce((s, e) => s + e.totalSalary, 0);

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Employees</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{employees.length} employees total</p>
        </div>
        <Link href={`/${locale}/payroll/employees/new`}>
          <Button size="sm" className="gap-1.5"><Plus className="size-3.5" />Add Employee</Button>
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: UserCheck, label: 'Active',           value: active,        cls: 'bg-emerald-50 text-emerald-600' },
          { icon: UserX,     label: 'Hold / Vacation',  value: inactive,      cls: 'bg-amber-50 text-amber-600' },
          { icon: CreditCard,label: 'WPS Total',        value: fmt(wpsTotal), cls: 'bg-primary/10 text-primary' },
          { icon: Banknote,  label: 'Cash Total',       value: fmt(cashTotal),cls: 'bg-orange-50 text-orange-600' },
        ].map(({ icon: Icon, label, value, cls }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
              <p className="text-lg font-semibold leading-tight tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* Filter bar */}
        <div className="px-4 py-2.5 border-b border-border flex flex-wrap items-center gap-2 bg-muted/20">
          {/* Search */}
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or code…"
              className="w-full pl-8 pr-3 h-9 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          {/* Comboboxes */}
          <Combobox options={CENTER_OPTS}  value={center}  onChange={setCenter}  placeholder="Cost Center" className="w-44" clearable />
          <Combobox options={STATUS_OPTS}  value={status}  onChange={setStatus}  placeholder="Status"      className="w-36" clearable />
          <Combobox options={PAY_OPTS}     value={payment} onChange={setPayment} placeholder="Payment"     className="w-32" clearable />
          {/* Clear filters */}
          {activeFilters > 0 && (
            <button onClick={clearFilters}
              className="h-9 px-3 flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <X className="size-3.5" /> Clear ({activeFilters})
            </button>
          )}
          {/* Page size */}
          <div className="ms-auto flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Rows:</span>
            {PAGE_SIZES.map(s => (
              <button key={s} onClick={() => { setPageSize(s); setPage(1); }}
                className={`h-7 w-9 rounded-md text-[12px] font-medium transition-colors ${pageSize === s ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="px-4 py-2 border-b border-border bg-primary/5 flex items-center gap-3">
            <span className="text-[13px] font-medium text-primary">{selected.size} selected</span>
            <div className="h-4 w-px bg-border" />
            <button onClick={bulkDelete} disabled={bulkDeleting}
              className="flex items-center gap-1.5 text-[12px] text-red-600 hover:text-red-700 font-medium disabled:opacity-50 transition-colors">
              {bulkDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash className="size-3.5" />}
              Delete selected
            </button>
            <button onClick={() => setSelected(new Set())}
              className="ms-auto text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Deselect all
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 h-9 w-10">
                  <input type="checkbox" checked={allOnPage} ref={el => { if (el) el.indeterminate = someOnPage && !allOnPage; }}
                    onChange={toggleAll}
                    className="rounded border-border text-primary focus:ring-primary/25 cursor-pointer" />
                </th>
                <SortTh col="empCode"     label="Code"     sort={sort} onSort={handleSort} className="text-left" />
                <SortTh col="name"        label="Name"     sort={sort} onSort={handleSort} className="text-left" />
                <SortTh col="costCenter"  label="Cost Center" sort={sort} onSort={handleSort} className="text-left" />
                <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">Visa</th>
                <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">WPS Entity</th>
                <SortTh col="basicSalary"  label="Basic"  sort={sort} onSort={handleSort} className="text-right" />
                <th className="px-4 h-9 text-right text-xs font-medium text-muted-foreground">Allow.</th>
                <SortTh col="totalSalary" label="Total"   sort={sort} onSort={handleSort} className="text-right" />
                <th className="px-4 h-9 text-center text-xs font-medium text-muted-foreground">Payment</th>
                <th className="px-4 h-9 text-center text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 h-9 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <SkeletonRows cols={12} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16">
                    <p className="text-[13px] text-muted-foreground">
                      {activeFilters > 0 ? 'No employees match the current filters.' : 'No employees yet.'}
                    </p>
                    {activeFilters > 0 ? (
                      <button onClick={clearFilters} className="mt-2 text-[12px] text-primary hover:underline">Clear filters</button>
                    ) : (
                      <Link href={`/${locale}/payroll/employees/new`} className="mt-3 inline-block">
                        <Button size="sm" variant="outline"><Plus className="size-3.5 me-1.5" />Add Employee</Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ) : paginated.map(emp => {
                const st = STATUS_CLS[emp.status] ?? 'bg-muted text-muted-foreground ring-border';
                const isSelected = selected.has(emp.id);
                return (
                  <tr key={emp.id}
                    className={`hover:bg-muted/25 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={e => { if ((e.target as HTMLElement).tagName !== 'A' && (e.target as HTMLElement).tagName !== 'BUTTON') toggleOne(emp.id); }}
                  >
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(emp.id)}
                        className="rounded border-border text-primary focus:ring-primary/25 cursor-pointer" />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px] font-semibold text-primary whitespace-nowrap">{emp.empCode}</td>
                    <td className="px-4 py-2.5 text-[13px] font-medium whitespace-nowrap">{emp.name}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{emp.costCenter}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{emp.visaType}</td>
                    <td className="px-4 py-2.5 text-[12px]">{emp.wpsEntity}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right tabular-nums">{fmt(emp.basicSalary)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right tabular-nums text-muted-foreground">{fmt(emp.allowances)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right tabular-nums font-semibold">{fmt(emp.totalSalary)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ${emp.paymentMethod === 'Cash' ? 'bg-orange-50 text-orange-700 ring-orange-200' : 'bg-blue-50 text-blue-700 ring-blue-200'}`}>
                        {emp.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ${st}`}>
                        {STATUS_LABEL[emp.status] ?? emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
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
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between gap-4 bg-muted/10">
            <p className="text-[12px] text-muted-foreground shrink-0">
              Showing <span className="font-medium text-foreground">{Math.min((page - 1) * pageSize + 1, filtered.length)}</span>–<span className="font-medium text-foreground">{Math.min(page * pageSize, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronLeft className="size-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pg = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-md text-[12px] font-medium transition-colors ${pg === page ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground border border-border'}`}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
