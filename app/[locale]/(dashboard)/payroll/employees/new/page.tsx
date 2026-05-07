'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const COST_CENTERS  = ['Stride Office', 'Stride Main', 'National Factory', 'Maisan Carpentry', 'Outside Visa'];
const VISA_TYPES    = ['SC-MAIN', 'NF', 'ALUM', 'MAISAN', 'Outside', 'NW'];
const WPS_ENTITIES  = ['SC', 'SC-RAK', 'Maisan', 'NF', 'Cash'];
const STATUSES      = ['ACTIVE', 'HOLD', 'VACATION', 'TERMINATED'];

export default function NewEmployeePage() {
  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    empCode: '', name: '', visaType: 'SC-MAIN', costCenter: 'Stride Main',
    wpsEntity: 'SC', paymentMethod: 'WPS',
    basicSalary: '', allowances: '', otherAllowance: '',
    hoursPerDay: '9', status: 'ACTIVE', remarks: '', startDate: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const totalSalary = (parseFloat(form.basicSalary) || 0) + (parseFloat(form.allowances) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          startDate: form.startDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Failed'); return; }
      toast.success('Employee added');
      router.push(`/${locale}/payroll/employees`);
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

  const select = (label: string, key: string, options: string[]) => (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">{label}</label>
      <select value={(form as any)[key]} onChange={e => set(key, e.target.value)}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-3 md:p-3.5 max-w-3xl mx-auto">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <Link href={`/${locale}/payroll/employees`}>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="size-4" /></button>
          </Link>
          <UserPlus className="size-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Add Employee</h1>
            <p className="text-sm text-muted-foreground">إضافة موظف جديد</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wide">Employee Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {field('EMP Code *', 'empCode', 'text', 'SC47')}
              {field('Full Name *', 'name', 'text', 'Mohamed Elsayed')}
              {select('VISA Type *', 'visaType', VISA_TYPES)}
              {select('Cost Center *', 'costCenter', COST_CENTERS)}
              {select('WPS Entity *', 'wpsEntity', WPS_ENTITIES)}
              {select('Payment Method', 'paymentMethod', ['WPS', 'Cash'])}
              {select('Status', 'status', STATUSES)}
              {field('Start Date', 'startDate', 'date')}
              {field('Hours / Day', 'hoursPerDay', 'number', '9')}
            </div>
          </div>

          {/* Salary */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wide">Salary Structure</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {field('Basic Salary (AED) *', 'basicSalary', 'number', '2000')}
              {field('Allowances (AED)', 'allowances', 'number', '1000')}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Total Salary (AED)</label>
                <div className="border border-border rounded-lg px-3 py-2 text-sm bg-muted/30 font-bold text-primary">
                  {totalSalary.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                </div>
              </div>
              {field('Other Allowance (AED)', 'otherAllowance', 'number', '0')}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Remarks</label>
            <input value={form.remarks} onChange={e => set('remarks', e.target.value)}
              placeholder="Optional notes…"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="size-4 me-2 animate-spin" />Saving…</> : 'Add Employee'}
            </Button>
            <Link href={`/${locale}/payroll/employees`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
