import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

function workingDays(year: number, month: number) {
  const total = new Date(year, month, 0).getDate();
  let c = 0;
  for (let d = 1; d <= total; d++) if (new Date(year, month - 1, d).getDay() !== 5) c++;
  return c;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const entries = await prisma.payrollTimesheetEntry.findMany({
      where: { employeeId: id },
      include: {
        timesheet: { select: { month: true, year: true } },
        project:   { select: { id: true, projectCode: true, projectName: true } },
      },
    });

    // Group by period key "YYYY-MM"
    type Row = (typeof entries)[number];
    const periodMap: Record<string, { year: number; month: number; daily: Row[]; old: Row[] }> = {};

    for (const e of entries) {
      const key = `${e.timesheet.year}-${String(e.timesheet.month).padStart(2, '0')}`;
      if (!periodMap[key]) periodMap[key] = { year: e.timesheet.year, month: e.timesheet.month, daily: [], old: [] };
      if (e.day >= 300)       periodMap[key].daily.push(e);
      else if (e.day < 200)   periodMap[key].old.push(e);
    }

    const periods = Object.entries(periodMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([period, { year, month, daily, old }]) => {
        const src = daily.length > 0 ? 'daily' : 'summary';
        const rows = src === 'daily' ? daily : old;

        let present = 0, absent = 0, sick = 0, annualLeave = 0, publicHoliday = 0, otHours = 0;
        const projMap: Record<string, { id: string; code: string; name: string }> = {};

        for (const e of rows) {
          if (e.dayStatus === 'P') {
            present++;
            if ((e.hours ?? 8) > 8) otHours += (e.hours! - 8);
            if (e.project) projMap[e.project.id] = { id: e.project.id, code: e.project.projectCode, name: e.project.projectName };
          } else if (e.dayStatus === 'A')    absent++;
          else if (e.dayStatus === 'SICK')   sick++;
          else if (e.dayStatus === 'AL')     annualLeave++;
          else if (e.dayStatus === 'PH')     publicHoliday++;
        }

        // Old summary format: P count = working days − deductions
        if (src === 'summary') {
          present = Math.max(0, workingDays(year, month) - absent - sick - annualLeave - publicHoliday);
        }

        return {
          period, year, month, src,
          present, absent, sick, annualLeave, publicHoliday,
          otHours: Math.round(otHours * 10) / 10,
          projects: Object.values(projMap),
        };
      });

    return NextResponse.json({
      data: {
        periods,
        totalPresent: periods.reduce((s, p) => s + p.present, 0),
        totalAbsent:  periods.reduce((s, p) => s + p.absent,  0),
        totalOt:      Math.round(periods.reduce((s, p) => s + p.otHours, 0) * 10) / 10,
      },
    });
  } catch (error) {
    logError('Get employee attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
