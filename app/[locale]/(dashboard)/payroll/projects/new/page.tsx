'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const STATUSES = ['ONGOING', 'WORK_DONE', 'MOBILIZING', 'HOLD', 'CANCELLED'];
const STATUS_LABEL: Record<string, string> = {
  ONGOING: 'Ongoing', WORK_DONE: 'Work Done', MOBILIZING: 'Mobilizing', HOLD: 'On Hold', CANCELLED: 'Cancelled',
};

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

export default function NewProjectPage() {
  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projectCode: '', projectName: '', location: '', completionPct: '',
    contractValue: '', consultant: '', status: 'ONGOING',
    revenue: '', retention: '', notes: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectCode.trim() || !form.projectName.trim()) { toast.error('Code and name are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/payroll/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          completionPct:  form.completionPct  ? parseFloat(form.completionPct) / 100 : 0,
          contractValue:  form.contractValue  ? parseFloat(form.contractValue)  : null,
          revenue:        form.revenue        ? parseFloat(form.revenue)        : null,
          retention:      form.retention      ? parseFloat(form.retention)      : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Failed'); return; }
      toast.success('Project added');
      router.push(`/${locale}/payroll/projects`);
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Link href={`/${locale}/payroll/projects`}>
          <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add Project</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Fill in the project details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Details */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[13px] font-semibold">Project Details</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <F label="Project Code *"><input value={form.projectCode} onChange={e => set('projectCode', e.target.value)} placeholder="e.g. SC-P90" className={inp} required /></F>
            <F label="Project Name *"><input value={form.projectName} onChange={e => set('projectName', e.target.value)} placeholder="e.g. Client Name / Villa" className={inp} required /></F>
            <F label="Location"><input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Khalifa City" className={inp} /></F>
            <F label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)} className={sel}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </F>
            <F label="Consultant"><input value={form.consultant} onChange={e => set('consultant', e.target.value)} placeholder="e.g. CORREDERA ENGINEERING" className={inp} /></F>
            <F label="Completion (%)"><input type="number" min="0" max="100" step="1" value={form.completionPct} onChange={e => set('completionPct', e.target.value)} placeholder="0" className={inp} /></F>
          </div>
        </div>

        {/* Financials */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[13px] font-semibold">Financials (AED)</h3>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            <F label="Contract Value"><input type="number" min="0" step="0.01" value={form.contractValue} onChange={e => set('contractValue', e.target.value)} placeholder="0.00" className={inp} /></F>
            <F label="Revenue"><input type="number" min="0" step="0.01" value={form.revenue} onChange={e => set('revenue', e.target.value)} placeholder="0.00" className={inp} /></F>
            <F label="Retention"><input type="number" min="0" step="0.01" value={form.retention} onChange={e => set('retention', e.target.value)} placeholder="0.00" className={inp} /></F>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[13px] font-semibold">Notes</h3>
          </div>
          <div className="p-4">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              placeholder="Optional notes about this project…"
              className="w-full border border-input rounded-lg px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted-foreground/50" />
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1 pb-4">
          <Button type="submit" disabled={saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            {saving ? 'Saving…' : 'Add Project'}
          </Button>
          <Link href={`/${locale}/payroll/projects`}>
            <Button type="button" variant="outline" size="sm">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
