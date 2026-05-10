import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const loans = await prisma.payrollLoan.findMany({
      include: {
        employee: { select: { id: true, empCode: true, name: true, costCenter: true } },
        deductions: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ data: loans });
  } catch (error) {
    logError('Get all loans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
