'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FolderPlus, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const STATUSES = ['ONGOING', 'WORK_DONE', 'MOBILIZING', 'HOLD', 'CANCELLED'];

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
    setSaving(true);
    try {
      const res = await fetch('/api/payroll/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          completionPct: form.completionPct ? parseFloat(form.completionPct) / 100 : 0,
          contractValue: form.contractValue ? parseFloat(form.contractValue) : null,
          revenue:       form.revenue       ? parseFloat(form.revenue)       : null,
          retention:     form.retention     ? parseFloat(form.retention)     : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Failed'); return; }
      toast.success('Project added');
      router.push(`/${locale}/payroll/projects`);
    } finally { setSaving(false); }
  };

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">{label}</label>
      <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
    </div>
  );

  return (
    <div className="p-3 md:p-3.5 max-w-3xl mx-auto">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <Link href={`/${locale}/payroll/projects`}>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="size-4" /></button>
          </Link>
          <FolderPlus className="size-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Add Project</h1>
            <p className="text-sm text-muted-foreground">إضافة مشروع جديد</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {field('Project Code *', 'projectCode', 'text', 'SC-P90')}
            {field('Project Name *', 'projectName', 'text', 'Client Name / Villa')}
            {field('Location', 'location', 'text', 'Khalifa City')}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            {field('Completion %', 'completionPct', 'number', '0')}
            {field('Contract Value (AED)', 'contractValue', 'number', '2000000')}
            {field('Consultant', 'consultant', 'text', 'CORREDERA ENGINEERING')}
            {field('Revenue (AED)', 'revenue', 'number')}
            {field('Retention (AED)', 'retention', 'number')}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="size-4 me-2 animate-spin" />Saving…</> : 'Add Project'}
            </Button>
            <Link href={`/${locale}/payroll/projects`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
