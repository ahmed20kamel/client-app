import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

function parsePeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  return { year, month };
}

function getDubaiTime() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dubai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0');
  return {
    hour:   get('hour') % 24,
    minute: get('minute'),
    day:    get('day'),
    month:  get('month'),
    year:   get('year'),
  };
}

type EntryInput = {
  employeeId: string;
  day: number;
  hours?: number | null;
  dayStatus: string;
  projectId?: string | null;
  notes?: string | null;
};

// POST — upsert bulk entries for a timesheet
// Body: { entries: EntryInput[] }
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

    // ── Attendance window check ──────────────────────────────────────────────
    let blockedCount = 0;
    let entriesToSave: EntryInput[] = entries;

    try {
      const settings = await prisma.attendanceSetting.findUnique({ where: { id: 'singleton' } });
      if (settings) {
        const dubai = getDubaiTime();
        const windowStartMin = settings.checkInStart * 60;
        const windowEndMin   = settings.checkInEnd   * 60 + (settings.graceMinutes ?? 0);
        const currentMin     = dubai.hour * 60 + dubai.minute;
        const windowOpen     = currentMin >= windowStartMin && currentMin <= windowEndMin;
        const isTodayPeriod  = dubai.year === year && dubai.month === month;

        if (!windowOpen && isTodayPeriod) {
          // Filter out P entries for today's calendar day in the daily site log (day = 300 + calDay)
          entriesToSave = entries.filter((e: EntryInput) => {
            if (e.day >= 300 && e.dayStatus === 'P' && (e.day - 300) === dubai.day) {
              blockedCount++;
              return false;
            }
            return true;
          });
        }
      }
    } catch {
      // AttendanceSetting table may not exist yet — proceed without restriction
    }
    // ────────────────────────────────────────────────────────────────────────

    // Ensure timesheet exists
    const ts = await prisma.payrollTimesheet.upsert({
      where:  { month_year: { month, year } },
      update: {},
      create: { month, year, status: 'OPEN' },
    });

    // Upsert all allowed entries in a transaction
    if (entriesToSave.length > 0) {
      await prisma.$transaction(
        entriesToSave.map((e: EntryInput) =>
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
    }

    return NextResponse.json({
      message: blockedCount > 0
        ? `Saved. ${blockedCount} today's P entr${blockedCount === 1 ? 'y was' : 'ies were'} skipped — check-in window is closed.`
        : 'Saved',
      count:   entriesToSave.length,
      blocked: blockedCount,
    });
  } catch (error) {
    logError('Upsert timesheet entries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
