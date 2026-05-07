'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Banknote, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PayrollIndexPage() {
  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year,  setYear]  = useState(String(now.getFullYear()));

  const go = () => router.push(`/${locale}/payroll/monthly/${year}-${month}`);

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  return (
    <div className="p-3 md:p-3.5 flex items-center justify-center min-h-[60vh]">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-10 max-w-md w-full text-center">
        <Banknote className="size-12 text-primary mx-auto mb-4 opacity-80" />
        <h1 className="text-2xl font-bold mb-1">Monthly Payroll</h1>
        <p className="text-muted-foreground text-sm mb-8">كشف الرواتب الشهري — اختر الشهر والسنة</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Month</label>
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium">
              {MONTHS.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Year</label>
            <select value={year} onChange={e => setYear(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <Button onClick={go} className="w-full py-3 text-base font-semibold">
          Open Payroll <ArrowRight className="size-4 ms-2" />
        </Button>
      </div>
    </div>
  );
}
