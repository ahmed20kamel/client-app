import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

// period = "YYYY-MM"
function parsePeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  return { year, month };
}

// POST — upsert bulk entries for a timesheet
// Body: { entries: [{ employeeId, day, hours, dayStatus, projectId? }] }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { period } = await params;
    const { year, month } = parsePeriod(period);
    const { entries } = await request.json();

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: 'entries must be an array' }, { status: 400 });
    }

    // Ensure timesheet exists
    const ts = await prisma.payrollTimesheet.upsert({
      where:  { month_year: { month, year } },
      update: {},
      create: { month, year, status: 'OPEN' },
    });

    // Upsert all entries in a transaction
    await prisma.$transaction(
      entries.map((e: { employeeId: string; day: number; hours?: number | null; dayStatus: string; projectId?: string | null; notes?: string | null }) =>
        prisma.payrollTimesheetEntry.upsert({
          where: {
            timesheetId_employeeId_day: {
              timesheetId: ts.id,
              employeeId:  e.employeeId,
              day:         e.day,
            },
          },
          update: {
            hours:     e.hours     ?? null,
            dayStatus: e.dayStatus || 'P',
            projectId: e.projectId ?? null,
            notes:     e.notes     ?? null,
          },
          create: {
            timesheetId: ts.id,
            employeeId:  e.employeeId,
            day:         e.day,
            hours:       e.hours     ?? null,
            dayStatus:   e.dayStatus || 'P',
            projectId:   e.projectId ?? null,
            notes:       e.notes     ?? null,
          },
        })
      )
    );

    return NextResponse.json({ message: 'Saved', count: entries.length });
  } catch (error) {
    logError('Upsert timesheet entries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
