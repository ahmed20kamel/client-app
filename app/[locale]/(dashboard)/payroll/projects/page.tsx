'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FolderOpen, Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Project {
  id: string; projectCode: string; projectName: string; location?: string;
  completionPct?: number; contractValue?: number; consultant?: string;
  status: string; revenue?: number; retention?: number; notes?: string;
}

const STATUSES = ['All', 'ONGOING', 'WORK_DONE', 'MOBILIZING', 'HOLD', 'CANCELLED'];

const STATUS_STYLE: Record<string, string> = {
  ONGOING:    'bg-emerald-100 text-emerald-700',
  WORK_DONE:  'bg-blue-100 text-blue-700',
  MOBILIZING: 'bg-amber-100 text-amber-700',
  HOLD:       'bg-orange-100 text-orange-700',
  CANCELLED:  'bg-red-100 text-red-700',
};

export default function ProjectsPage() {
  const { locale } = useParams() as { locale: string };
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('All');
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const fmt = (n?: number) => n != null ? n.toLocaleString('en-AE', { minimumFractionDigits: 0 }) : '—';
  const pct = (n?: number) => n != null ? `${n}%` : '—';

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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project ${name}?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/payroll/projects/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Project deleted'); load(); }
    else        { toast.error('Failed to delete'); }
    setDeleting(null);
  };

  return (
    <div className="p-3 md:p-3.5 space-y-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <FolderOpen className="size-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Projects</h1>
            </div>
          </div>
          <Link href={`/${locale}/payroll/projects/new`}>
            <Button size="sm"><Plus className="size-4 me-1" />Add Project</Button>
          </Link>
        </div>

        <div className="px-6 py-3 border-b border-border bg-muted/30 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search project code or name…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="size-10 mx-auto mb-2 opacity-20" />
            <p>No projects found</p>
            <Link href={`/${locale}/payroll/projects/new`} className="mt-3 inline-block">
              <Button size="sm" variant="outline"><Plus className="size-4 me-1" />Add First Project</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                  <th className="px-4 py-3 text-left font-semibold text-xs">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Project Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Location</th>
                  <th className="px-4 py-3 text-center font-semibold text-xs">Completion</th>
                  <th className="px-4 py-3 text-right font-semibold text-xs">Contract Value</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Consultant</th>
                  <th className="px-4 py-3 text-center font-semibold text-xs">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-white dark:bg-background' : 'bg-muted/20'}`}>
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary font-bold">{p.projectCode}</td>
                    <td className="px-4 py-3 font-medium">{p.projectName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.location || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {p.completionPct != null ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-16 bg-muted rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(p.completionPct * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs">{pct(p.completionPct * 100)}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{p.contractValue ? `${fmt(p.contractValue)} AED` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-40 truncate">{p.consultant || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[p.status] || 'bg-muted text-muted-foreground'}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/${locale}/payroll/projects/${p.id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"><Edit className="size-3.5" /></button>
                        </Link>
                        <button onClick={() => handleDelete(p.id, p.projectName)}
                          disabled={deleting === p.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
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
