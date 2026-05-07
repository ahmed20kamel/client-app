'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const COST_CENTERS   = ['Stride Office', 'Stride Main', 'National Factory', 'Maisan Carpentry', 'Outside Visa'];
const VISA_TYPES     = ['SC-MAIN', 'NF', 'ALUM', 'MAISAN', 'Outside', 'NW'];
const WPS_ENTITIES   = ['SC', 'SC-RAK', 'Maisan', 'NF', 'Cash'];
const STATUSES       = ['ACTIVE', 'HOLD', 'VACATION', 'TERMINATED'];
const PAY_METHODS    = ['WPS', 'Cash'];

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', HOLD: 'On Hold', VACATION: 'Vacation', TERMINATED: 'Terminated',
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full h-9 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";
const selectCls = "w-full h-9 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow appearance-none";

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
  const basic  = parseFloat(form.basicSalary)  || 0;
  const allow  = parseFloat(form.allowances)   || 0;
  const total  = basic + allow;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.empCode.trim() || !form.name.trim()) {
      toast.error('Employee code and name are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/payroll/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          basicSalary:    parseFloat(form.basicSalary)    || 0,
          allowances:     parseFloat(form.allowances)     || 0,
          otherAllowance: parseFloat(form.otherAllowance) || 0,
          hoursPerDay:    parseFloat(form.hoursPerDay)    || 9,
          startDate:      form.startDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Failed to save'); return; }
      toast.success('Employee added successfully');
      router.push(`/${locale}/payroll/employees`);
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/payroll/employees`}>
          <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Employee</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fill in the details to add an employee to payroll</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identity */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">1</span>
            Identity
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Employee Code *">
              <input value={form.empCode} onChange={e => set('empCode', e.target.value)}
                placeholder="e.g. SC47" className={inputCls} required />
            </Field>
            <Field label="Full Name *">
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Mohamed Al Rashidi" className={inputCls} required />
            </Field>
            <Field label="Visa Type">
              <select value={form.visaType} onChange={e => set('visaType', e.target.value)} className={selectCls}>
                {VISA_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Assignment */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">2</span>
            Assignment
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cost Center">
              <select value={form.costCenter} onChange={e => set('costCenter', e.target.value)} className={selectCls}>
                {COST_CENTERS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="WPS Entity">
              <select value={form.wpsEntity} onChange={e => set('wpsEntity', e.target.value)} className={selectCls}>
                {WPS_ENTITIES.map(w => <option key={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Payment Method">
              <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className={selectCls}>
                {PAY_METHODS.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Salary */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">3</span>
            Salary Structure <span className="text-xs text-muted-foreground font-normal">(AED)</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Basic Salary">
              <input type="number" min="0" step="0.01" value={form.basicSalary}
                onChange={e => set('basicSalary', e.target.value)}
                placeholder="0.00" className={inputCls} />
            </Field>
            <Field label="Allowances">
              <input type="number" min="0" step="0.01" value={form.allowances}
                onChange={e => set('allowances', e.target.value)}
                placeholder="0.00" className={inputCls} />
            </Field>
            <Field label="Total Salary">
              <div className="h-9 border border-primary/30 rounded-lg px-3 flex items-center bg-primary/5 text-primary font-bold text-sm">
                {total.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
              </div>
            </Field>
            <Field label="Other Allowance">
              <input type="number" min="0" step="0.01" value={form.otherAllowance}
                onChange={e => set('otherAllowance', e.target.value)}
                placeholder="0.00" className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Additional */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">4</span>
            Additional
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hours Per Day" hint="Used for overtime calculations">
              <input type="number" min="1" max="24" step="0.5" value={form.hoursPerDay}
                onChange={e => set('hoursPerDay', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Remarks">
              <input value={form.remarks} onChange={e => set('remarks', e.target.value)}
                placeholder="Optional notes" className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-6">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {saving ? 'Saving…' : 'Add Employee'}
          </Button>
          <Link href={`/${locale}/payroll/employees`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
