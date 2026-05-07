'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Project {
  id: string; projectCode: string; projectName: string; location?: string;
  completionPct?: number; contractValue?: number; consultant?: string;
  status: string;
}

const STATUSES = ['All', 'ONGOING', 'WORK_DONE', 'MOBILIZING', 'HOLD', 'CANCELLED'];
const STATUS_LABEL: Record<string, string> = {
  ONGOING: 'Ongoing', WORK_DONE: 'Work Done', MOBILIZING: 'Mobilizing', HOLD: 'On Hold', CANCELLED: 'Cancelled',
};
const STATUS_CLS: Record<string, string> = {
  ONGOING:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
  WORK_DONE:  'bg-blue-50 text-blue-700 ring-blue-200',
  MOBILIZING: 'bg-amber-50 text-amber-700 ring-amber-200',
  HOLD:       'bg-orange-50 text-orange-700 ring-orange-200',
  CANCELLED:  'bg-red-50 text-red-600 ring-red-200',
};

const fmt = (n?: number) => n != null ? n.toLocaleString('en-AE', { minimumFractionDigits: 0 }) : '—';

export default function ProjectsPage() {
  const { locale } = useParams() as { locale: string };
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('All');
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status !== 'All') p.set('status', status);
    const res = await fetch(`/api/payroll/projects?${p}`);
    const { data } = await res.json();
    setProjects(data || []);
    setLoading(false);
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/payroll/projects/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); load(); } else toast.error('Failed');
    setDeleting(null);
  };

  const ongoing  = projects.filter(p => p.status === 'ONGOING').length;
  const workDone = projects.filter(p => p.status === 'WORK_DONE').length;
  const total    = projects.reduce((s, p) => s + (p.contractValue ?? 0), 0);

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{projects.length} projects</p>
        </div>
        <Link href={`/${locale}/payroll/projects/new`}>
          <Button size="sm" className="gap-1.5"><Plus className="size-3.5" />Add Project</Button>
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Ongoing</p>
          <p className="text-2xl font-semibold mt-0.5">{ongoing}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Work Done</p>
          <p className="text-2xl font-semibold mt-0.5">{workDone}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Contract Value</p>
          <p className="text-lg font-semibold mt-0.5 tabular-nums">{fmt(total)} AED</p>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* Filter bar */}
        <div className="px-4 py-2.5 border-b border-border flex flex-wrap items-center gap-2.5 bg-muted/20">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search code or name…"
              className="w-full pl-8 pr-3 h-8 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                  status === s ? 'bg-primary text-white' : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                }`}>
                {s === 'All' ? 'All' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="size-8 mx-auto mb-2.5 text-muted-foreground/30" />
            <p className="text-[13px] text-muted-foreground">No projects found</p>
            <Link href={`/${locale}/payroll/projects/new`} className="mt-3 inline-block">
              <Button size="sm" variant="outline"><Plus className="size-3.5 me-1.5" />Add Project</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground w-8">#</th>
                  <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">Code</th>
                  <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">Project Name</th>
                  <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">Location</th>
                  <th className="px-4 h-9 text-center text-xs font-medium text-muted-foreground">Progress</th>
                  <th className="px-4 h-9 text-right text-xs font-medium text-muted-foreground">Contract (AED)</th>
                  <th className="px-4 h-9 text-left text-xs font-medium text-muted-foreground">Consultant</th>
                  <th className="px-4 h-9 text-center text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 h-9 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {projects.map((p, i) => (
                  <tr key={p.id} className="hover:bg-muted/25 transition-colors">
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{i + 1}</td>
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
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-right tabular-nums font-medium">{p.contractValue ? fmt(p.contractValue) : '—'}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground max-w-40 truncate">{p.consultant || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ${STATUS_CLS[p.status] ?? 'bg-muted text-muted-foreground ring-border'}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Link href={`/${locale}/payroll/projects/${p.id}`}>
                          <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="size-3.5" />
                          </button>
                        </Link>
                        <button onClick={() => remove(p.id, p.projectName)} disabled={deleting === p.id}
                          className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40">
                          {deleting === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
