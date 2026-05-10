import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const loans = await prisma.payrollLoan.findMany({
      where:   { employeeId: id },
      include: { deductions: { orderBy: [{ year: 'desc' }, { month: 'desc' }] } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: loans });
  } catch (error) {
    logError('Get employee loans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { description, totalAmount, installmentAmount, startMonth, startYear } = body;

    if (!totalAmount || !installmentAmount || !startMonth || !startYear) {
      return NextResponse.json({ error: 'totalAmount, installmentAmount, startMonth, startYear required' }, { status: 400 });
    }

    const loan = await prisma.payrollLoan.create({
      data: {
        employeeId: id,
        description:       description       || null,
        totalAmount:       parseFloat(totalAmount),
        installmentAmount: parseFloat(installmentAmount),
        startMonth:        parseInt(startMonth),
        startYear:         parseInt(startYear),
        status:            'ACTIVE',
        paidAmount:        0,
      },
    });

    return NextResponse.json({ data: loan }, { status: 201 });
  } catch (error) {
    logError('Create loan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
