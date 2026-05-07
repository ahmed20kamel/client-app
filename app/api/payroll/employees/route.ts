import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const costCenter = searchParams.get('costCenter');
    const status     = searchParams.get('status');
    const search     = searchParams.get('search');

    const employees = await prisma.payrollEmployee.findMany({
      where: {
        ...(costCenter ? { costCenter } : {}),
        ...(status     ? { status }     : {}),
        ...(search     ? {
          OR: [
            { name:    { contains: search, mode: 'insensitive' } },
            { empCode: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: [{ costCenter: 'asc' }, { empCode: 'asc' }],
    });

    return NextResponse.json({ data: employees });
  } catch (error) {
    logError('Get payroll employees error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      empCode, name, visaType, costCenter, wpsEntity, paymentMethod,
      basicSalary, allowances, otherAllowance, hoursPerDay,
      status, remarks, startDate,
    } = body;

    if (!empCode || !name || !visaType || !costCenter || !wpsEntity) {
      return NextResponse.json({ error: 'empCode, name, visaType, costCenter, wpsEntity are required' }, { status: 400 });
    }

    const totalSalary = (basicSalary || 0) + (allowances || 0);

    const employee = await prisma.payrollEmployee.create({
      data: {
        empCode, name, visaType, costCenter,
        wpsEntity, paymentMethod: paymentMethod || 'WPS',
        basicSalary: basicSalary || 0,
        allowances:  allowances  || 0,
        totalSalary,
        otherAllowance: otherAllowance || 0,
        hoursPerDay: hoursPerDay || 9,
        status: status || 'ACTIVE',
        remarks: remarks || null,
        startDate: startDate ? new Date(startDate) : null,
      },
    });

    return NextResponse.json({ data: employee }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Employee code already exists' }, { status: 409 });
    }
    logError('Create payroll employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
