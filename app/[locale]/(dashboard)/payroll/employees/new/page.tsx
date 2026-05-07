'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const COST_CENTERS = ['Stride Office', 'Stride Main', 'National Factory', 'Maisan Carpentry', 'Outside Visa'];
const VISA_TYPES   = ['SC-MAIN', 'NF', 'ALUM', 'MAISAN', 'Outside', 'NW'];
const WPS_ENTITIES = ['SC', 'SC-RAK', 'Maisan', 'NF', 'Cash'];
const STATUSES     = ['ACTIVE', 'HOLD', 'VACATION', 'TERMINATED'];
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Active', HOLD: 'On Hold', VACATION: 'Vacation', TERMINATED: 'Terminated' };

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function NewEmployeePage() {
  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    empCode: '', name: '', visaType: 'SC-MAIN', costCenter: 'Stride Main',
    wpsEntity: 'SC', paymentMethod: 'WPS', status: 'ACTIVE', startDate: '',
    basicSalary: '', allowances: '', otherAllowance: '', hoursPerDay: '9', remarks: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const total = (parseFloat(form.basicSalary) || 0) + (parseFloat(form.allowances) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.empCode.trim() || !form.name.trim()) { toast.error('Code and name are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/payroll/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          basicSalary: parseFloat(form.basicSalary) || 0,
          allowances: parseFloat(form.allowances) || 0,
          otherAllowance: parseFloat(form.otherAllowance) || 0,
          hoursPerDay: parseFloat(form.hoursPerDay) || 9,
          startDate: form.startDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Failed'); return; }
      toast.success('Employee added');
      router.push(`/${locale}/payroll/employees`);
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Link href={`/${locale}/payroll/employees`}>
          <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add Employee</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Fill in the details to add an employee</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Section title="Identity">
          <div className="grid grid-cols-2 gap-3">
            <F label="Employee Code *"><input value={form.empCode} onChange={e => set('empCode', e.target.value)} placeholder="e.g. SC47" className={inp} required /></F>
            <F label="Full Name *"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Mohamed Al Rashidi" className={inp} required /></F>
            <F label="Visa Type">
              <select value={form.visaType} onChange={e => set('visaType', e.target.value)} className={sel}>
                {VISA_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </F>
            <F label="Start Date"><input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inp} /></F>
          </div>
        </Section>

        <Section title="Assignment">
          <div className="grid grid-cols-2 gap-3">
            <F label="Cost Center">
              <select value={form.costCenter} onChange={e => set('costCenter', e.target.value)} className={sel}>
                {COST_CENTERS.map(c => <option key={c}>{c}</option>)}
              </select>
            </F>
            <F label="WPS Entity">
              <select value={form.wpsEntity} onChange={e => set('wpsEntity', e.target.value)} className={sel}>
                {WPS_ENTITIES.map(w => <option key={w}>{w}</option>)}
              </select>
            </F>
            <F label="Payment Method">
              <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className={sel}>
                {['WPS','Cash'].map(p => <option key={p}>{p}</option>)}
              </select>
            </F>
            <F label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)} className={sel}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </F>
          </div>
        </Section>

        <Section title="Salary Structure (AED)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <F label="Basic Salary"><input type="number" min="0" step="0.01" value={form.basicSalary} onChange={e => set('basicSalary', e.target.value)} placeholder="0.00" className={inp} /></F>
            <F label="Allowances"><input type="number" min="0" step="0.01" value={form.allowances} onChange={e => set('allowances', e.target.value)} placeholder="0.00" className={inp} /></F>
            <F label="Total Salary">
              <div className="h-9 px-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center text-[13px] font-semibold text-primary tabular-nums">
                {total.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
              </div>
            </F>
            <F label="Other Allowance"><input type="number" min="0" step="0.01" value={form.otherAllowance} onChange={e => set('otherAllowance', e.target.value)} placeholder="0.00" className={inp} /></F>
          </div>
        </Section>

        <Section title="Additional">
          <div className="grid grid-cols-2 gap-3">
            <F label="Hours Per Day"><input type="number" min="1" max="24" step="0.5" value={form.hoursPerDay} onChange={e => set('hoursPerDay', e.target.value)} className={inp} /></F>
            <F label="Remarks"><input value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes" className={inp} /></F>
          </div>
        </Section>

        <div className="flex items-center gap-2.5 pt-1 pb-4">
          <Button type="submit" disabled={saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            {saving ? 'Saving…' : 'Add Employee'}
          </Button>
          <Link href={`/${locale}/payroll/employees`}>
            <Button type="button" variant="outline" size="sm">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
