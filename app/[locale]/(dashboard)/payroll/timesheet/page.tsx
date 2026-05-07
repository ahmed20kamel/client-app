'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Calendar, ArrowRight, Clock, Users, BarChart2 } from 'lucide-react';
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

  // Quick-access: last 3 months
  const recent = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timesheet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track daily attendance, hours worked, absences, and overtime for all employees.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center space-y-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
            <Calendar className="size-4 text-primary" />
          </div>
          <p className="text-xs font-semibold">1. Pick a month</p>
          <p className="text-xs text-muted-foreground">Select the period you want to fill in</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center space-y-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
            <Users className="size-4 text-primary" />
          </div>
          <p className="text-xs font-semibold">2. Fill attendance</p>
          <p className="text-xs text-muted-foreground">Mark each employee's daily status and hours</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center space-y-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
            <BarChart2 className="size-4 text-primary" />
          </div>
          <p className="text-xs font-semibold">3. Generate payroll</p>
          <p className="text-xs text-muted-foreground">Auto-calculate salaries from attendance data</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Open a timesheet period</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Month</label>
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              {MONTHS.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Year</label>
            <select value={year} onChange={e => setYear(e.target.value)}
              className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <Button onClick={go} className="w-full gap-2">
          Open {MONTHS[parseInt(month) - 1]} {year}
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {/* Quick access */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent periods</h2>
        <div className="space-y-2">
          {recent.map(r => (
            <button key={r.period}
              onClick={() => router.push(`/${locale}/payroll/timesheet/${r.period}`)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all text-sm font-medium group">
              <span>{r.label}</span>
              <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
