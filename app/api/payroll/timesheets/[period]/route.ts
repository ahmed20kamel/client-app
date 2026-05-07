import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

// period = "YYYY-MM"
function parsePeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  return { year, month };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { period } = await params;
    const { year, month } = parsePeriod(period);

    const timesheet = await prisma.payrollTimesheet.findUnique({
      where: { month_year: { month, year } },
      include: {
        entries: {
          include: {
            employee: true,
            project:  { select: { id: true, projectCode: true, projectName: true } },
          },
        },
      },
    });

    // Also return all active employees and projects for the grid
    const [employees, projects] = await Promise.all([
      prisma.payrollEmployee.findMany({
        where:   { status: { not: 'TERMINATED' } },
        orderBy: [{ costCenter: 'asc' }, { empCode: 'asc' }],
      }),
      prisma.payrollProject.findMany({
        where:   { status: { not: 'CANCELLED' } },
        orderBy: { projectCode: 'asc' },
        select:  { id: true, projectCode: true, projectName: true },
      }),
    ]);

    return NextResponse.json({ data: { timesheet, employees, projects } });
  } catch (error) {
    logError('Get timesheet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { period } = await params;
    const { year, month } = parsePeriod(period);
    const { status, notes } = await request.json();

    const ts = await prisma.payrollTimesheet.update({
      where: { month_year: { month, year } },
      data:  { ...(status !== undefined ? { status } : {}), ...(notes !== undefined ? { notes } : {}) },
    });
    return NextResponse.json({ data: ts });
  } catch (error) {
    logError('Update timesheet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
