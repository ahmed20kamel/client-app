'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Plus, Search, Pencil, Trash2, Loader2, FolderOpen,
  ArrowUp, ArrowDown, ArrowUpDown, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Project {
  id: string; projectCode: string; projectName: string; location?: string;
  completionPct?: number; contractValue?: number; revenue?: number;
  retention?: number; consultant?: string; status: string; notes?: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ONGOING',    label: 'Ongoing' },
  { value: 'WORK_DONE',  label: 'Work Done' },
  { value: 'MOBILIZING', label: 'Mobilizing' },
  { value: 'HOLD',       label: 'On Hold' },
  { value: 'CANCELLED',  label: 'Cancelled' },
];

const STATUS_LABEL: Record<string, string> = {
  ONGOING: 'Ongoing', WORK_DONE: 'Work Done', MOBILIZING: 'Mobilizing',
  HOLD: 'On Hold', CANCELLED: 'Cancelled',
};
const STATUS_CLS: Record<string, string> = {
  ONGOING:    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800',
  WORK_DONE:  'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800',
  MOBILIZING: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800',
  HOLD:       'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:ring-orange-800',
  CANCELLED:  'bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800',
};

const fmt = (n?: number) => n != null ? n.toLocaleString('en-AE', { minimumFractionDigits: 0 }) : '—';

type SortKey = 'projectCode' | 'projectName' | 'location' | 'completionPct' | 'contractValue' | 'status';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [25, 50, 100];

/* ── Sortable th ── */
function SortTh({ label, col, sort, onSort, className }: {
  label: string; col: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={cn('px-4 h-9 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap group', className)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? (sort.dir === 'asc'
            ? <ArrowUp className="size-3 text-primary" />
            : <ArrowDown className="size-3 text-primary" />)
          : <ArrowUpDown className="size-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
      </span>
    </th>
  );
}

/* ── Skeleton rows ── */
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border/40">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3 rounded-full bg-muted animate-pulse" style={{ width: `${55 + ((i * 7 + j * 13) % 40)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function ProjectsPage() {
  const { locale } = useParams() as { locale: string };

  /* ── Remote data ── */
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);

  /* ── Filters ── */
  const [search,    setSearch]    = useState('');
  const [statusF,   setStatusF]   = useState('');

  /* ── Sort ── */
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'projectCode', dir: 'asc' });
  const toggleSort = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

  /* ── Pagination ── */
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* ── Selection ── */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkDel,  setBulkDel]  = useState(false);

  const selectAllRef = useRef<HTMLInputElement>(null);

  /* ── Fetch ── */
  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const res = await fetch('/api/payroll/projects?limit=9999');
      const { data } = await res.json();
      setProjects(data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Filter → sort → paginate ── */
  const filtered = useMemo(() => {
    let rows = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(p =>
        p.projectCode.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        (p.location ?? '').toLowerCase().includes(q) ||
        (p.consultant ?? '').toLowerCase().includes(q),
      );
    }
    if (statusF) rows = rows.filter(p => p.status === statusF);

    rows.sort((a, b) => {
      let av: string | number = '', bv: string | number = '';
      if (sort.key === 'completionPct') { av = a.completionPct ?? -1; bv = b.completionPct ?? -1; }
      else if (sort.key === 'contractValue') { av = a.contractValue ?? -1; bv = b.contractValue ?? -1; }
      else { av = (a[sort.key] ?? '') as string; bv = (b[sort.key] ?? '') as string; }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [projects, search, statusF, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => { setPage(1); }, [search, statusF, pageSize]);

  /* ── Select-all indeterminate ── */
  const pageIds    = pageRows.map(p => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const someChecked = !allChecked && pageIds.some(id => selected.has(id));

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allChecked) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };
  const toggleRow = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ── Delete single ── */
  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/payroll/projects/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); load(); } else toast.error('Failed to delete');
    setDeleting(null);
  };

  /* ── Bulk delete ── */
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} project${selected.size > 1 ? 's' : ''}?`)) return;
    setBulkDel(true);
    try {
      await Promise.all([...selected].map(id => fetch(`/api/payroll/projects/${id}`, { method: 'DELETE' })));
      toast.success(`Deleted ${selected.size} projects`);
      load();
    } finally { setBulkDel(false); }
  };

  /* ── Clear filters ── */
  const activeFilters = [statusF].filter(Boolean).length + (search.trim() ? 1 : 0);
  const clearFilters = () => { setSearch(''); setStatusF(''); };

  /* ── KPIs ── */
  const ongoing  = projects.filter(p => p.status === 'ONGOING').length;
  const workDone = projects.filter(p => p.status === 'WORK_DONE').length;
  const total    = projects.reduce((s, p) => s + (p.contractValue ?? 0), 0);

  /* ── Pagination pages ── */
  const pageNums = useMemo(() => {
    const nums: (number | '…')[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) nums.push(i); return nums; }
    nums.push(1);
    if (safePage > 3) nums.push('…');
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) nums.push(i);
    if (safePage < totalPages - 2) nums.push('…');
    nums.push(totalPages);
    return nums;
  }, [totalPages, safePage]);

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href={`/${locale}/payroll/projects/new`}>
          <Button size="sm" className="gap-1.5"><Plus className="size-3.5" />Add Project</Button>
        </Link>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex items-stretch divide-x divide-border border border-border rounded-xl bg-card overflow-hidden">
        <div className="flex-1 px-5 py-4 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ongoing</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">{ongoing}</p>
        </div>
        <div className="flex-1 px-5 py-4 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Work Done</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">{workDone}</p>
        </div>
        <div className="flex-1 px-5 py-4 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total Projects</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">{projects.length}</p>
        </div>
        <div className="flex-1 px-5 py-4 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total Contract Value</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {fmt(total)} <span className="text-sm font-normal text-muted-foreground">AED</span>
          </p>
        </div>
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
              placeholder="Search code, name, location…"
              className="w-full pl-8 pr-3 h-8 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>

          {/* Status */}
          <Combobox
            options={STATUS_OPTIONS}
            value={statusF}
            onChange={setStatusF}
            placeholder="All Statuses"
            className="w-40"
            clearable
          />

          {/* Clear */}
          {activeFilters > 0 && (
            <button onClick={clearFilters}
              className="h-8 px-2.5 flex items-center gap-1.5 text-[12px] text-muted-foreground border border-border rounded-lg bg-background hover:bg-muted/40 transition-colors">
              <X className="size-3" />
              Clear ({activeFilters})
            </button>
          )}

          <div className="flex-1" />

          {/* Page size */}
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span>Show</span>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
              className="h-8 px-2 border border-border rounded-lg bg-background text-[12px] focus:outline-none">
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="px-4 py-2 border-b border-border bg-primary/5 flex items-center gap-3">
            <span className="text-[13px] font-medium">{selected.size} selected</span>
            <button onClick={bulkDelete} disabled={bulkDel}
              className="flex items-center gap-1.5 h-7 px-2.5 text-[12px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
              {bulkDel ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
              Delete selected
            </button>
            <button onClick={() => setSelected(new Set())}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors ml-auto">
              Deselect all
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-4 h-9" />
                  <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground w-8">#</th>
                  <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">Code</th>
                  <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">Project Name</th>
                  <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">Location</th>
                  <th className="px-4 h-9 text-center text-xs font-medium text-muted-foreground">Progress</th>
                  <th className="px-4 h-9 text-right text-xs font-medium text-muted-foreground">Contract (AED)</th>
                  <th className="px-4 h-9 text-center text-xs font-medium text-muted-foreground">Status</th>
                  <th className="w-16 px-4 h-9" />
                </tr>
              </thead>
              <tbody><SkeletonRows cols={9} /></tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="size-8 mx-auto mb-2.5 text-muted-foreground/30" />
            <p className="text-[13px] text-muted-foreground">
              {activeFilters > 0 ? 'No projects match your filters' : 'No projects yet'}
            </p>
            {activeFilters > 0 ? (
              <button onClick={clearFilters} className="mt-3 text-[13px] text-primary hover:underline">Clear filters</button>
            ) : (
              <Link href={`/${locale}/payroll/projects/new`} className="mt-3 inline-block">
                <Button size="sm" variant="outline"><Plus className="size-3.5 me-1.5" />Add Project</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {/* Checkbox */}
                    <th className="w-10 px-4 h-9">
                      <input
                        type="checkbox"
                        ref={selectAllRef}
                        checked={allChecked}
                        onChange={toggleAll}
                        className="size-3.5 rounded border-border cursor-pointer accent-primary"
                      />
                    </th>
                    <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground w-8">#</th>
                    <SortTh label="Code"         col="projectCode"   sort={sort} onSort={toggleSort} />
                    <SortTh label="Project Name" col="projectName"   sort={sort} onSort={toggleSort} />
                    <SortTh label="Location"     col="location"      sort={sort} onSort={toggleSort} />
                    <th className="px-4 h-9 text-center text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap group"
                      onClick={() => toggleSort('completionPct')}>
                      <span className="inline-flex items-center gap-1">
                        Progress
                        {sort.key === 'completionPct'
                          ? (sort.dir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />)
                          : <ArrowUpDown className="size-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
                      </span>
                    </th>
                    <th className="px-4 h-9 text-right text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap group"
                      onClick={() => toggleSort('contractValue')}>
                      <span className="inline-flex items-center justify-end gap-1">
                        Contract (AED)
                        {sort.key === 'contractValue'
                          ? (sort.dir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />)
                          : <ArrowUpDown className="size-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
                      </span>
                    </th>
                    <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">Consultant</th>
                    <SortTh label="Status" col="status" sort={sort} onSort={toggleSort} className="text-center" />
                    <th className="w-16 px-4 h-9" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {pageRows.map((p, i) => {
                    const isSelected = selected.has(p.id);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => toggleRow(p.id)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/25',
                        )}
                      >
                        <td className="w-10 px-4 py-2.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(p.id)}
                            className="size-3.5 rounded border-border cursor-pointer accent-primary"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                          {(safePage - 1) * pageSize + i + 1}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[12px] font-semibold text-primary whitespace-nowrap">{p.projectCode}</td>
                        <td className="px-4 py-2.5 text-[13px] font-medium">{p.projectName}</td>
                        <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{p.location || '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          {p.completionPct != null ? (
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(p.completionPct * 100, 100)}%` }} />
                              </div>
                              <span className="text-[12px] tabular-nums">{Math.round(p.completionPct * 100)}%</span>
                            </div>
                          ) : <span className="text-muted-foreground text-[12px]">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-right tabular-nums font-medium">
                          {p.contractValue ? fmt(p.contractValue) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-muted-foreground max-w-40 truncate">{p.consultant || '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1', STATUS_CLS[p.status] ?? 'bg-muted text-muted-foreground ring-border')}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-0.5">
                            <Link href={`/${locale}/payroll/projects/${p.id}`}>
                              <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                <Pencil className="size-3.5" />
                              </button>
                            </Link>
                            <button
                              onClick={() => remove(p.id, p.projectName)}
                              disabled={deleting === p.id}
                              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40">
                              {deleting === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
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
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3 bg-muted/10">
                <p className="text-[12px] text-muted-foreground">
                  Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="h-7 px-2.5 text-[12px] border border-border rounded-md bg-background hover:bg-muted disabled:opacity-40 transition-colors">
                    ‹
                  </button>
                  {pageNums.map((n, i) =>
                    n === '…' ? (
                      <span key={`e${i}`} className="h-7 px-1.5 text-[12px] text-muted-foreground flex items-center">…</span>
                    ) : (
                      <button key={n} onClick={() => setPage(n as number)}
                        className={cn('h-7 min-w-7 px-2 text-[12px] border rounded-md transition-colors',
                          n === safePage ? 'bg-primary text-white border-primary' : 'border-border bg-background hover:bg-muted')}>
                        {n}
                      </button>
                    )
                  )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="h-7 px-2.5 text-[12px] border border-border rounded-md bg-background hover:bg-muted disabled:opacity-40 transition-colors">
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
