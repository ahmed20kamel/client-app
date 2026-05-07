import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const timesheets = await prisma.payrollTimesheet.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return NextResponse.json({ data: timesheets });
  } catch (error) {
    logError('Get timesheets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { month, year, notes } = await request.json();
    if (!month || !year) return NextResponse.json({ error: 'month and year required' }, { status: 400 });

    const ts = await prisma.payrollTimesheet.upsert({
      where:  { month_year: { month, year } },
      update: { notes: notes || null },
      create: { month, year, notes: notes || null, status: 'OPEN' },
    });
    return NextResponse.json({ data: ts }, { status: 201 });
  } catch (error) {
    logError('Create timesheet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
