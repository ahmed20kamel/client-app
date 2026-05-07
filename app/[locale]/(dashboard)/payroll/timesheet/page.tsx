'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function TimesheetIndexPage() {
  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year,  setYear]  = useState(String(now.getFullYear()));

  const go = () => router.push(`/${locale}/payroll/timesheet/${year}-${month}`);

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  const recent = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  const inp = "w-full h-9 border border-input rounded-lg px-3 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow appearance-none";

  return (
    <div className="max-w-lg space-y-4">

      {/* ── Unified card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/40">
          <h1 className="text-[15px] font-semibold tracking-tight">Timesheet</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Enter monthly attendance — days worked, absences, overtime
          </p>
        </div>

        {/* Period selector */}
        <div className="p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Select period</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)} className={inp}>
                {MONTHS.map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Year</label>
              <select value={year} onChange={e => setYear(e.target.value)} className={inp}>
                {years.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <Button onClick={go} size="sm" className="w-full gap-1.5">
            Open {MONTHS[parseInt(month) - 1]} {year}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>

        {/* Recent periods */}
        <div className="border-t border-border">
          <div className="px-5 py-3 border-b border-border/60 bg-muted/20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recent periods</p>
          </div>
          <div className="divide-y divide-border/50">
            {recent.map(r => (
              <button
                key={r.period}
                onClick={() => router.push(`/${locale}/payroll/timesheet/${r.period}`)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors group"
              >
                <span className="text-[13px] font-medium">{r.label}</span>
                <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
