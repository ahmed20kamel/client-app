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
    const employee = await prisma.payrollEmployee.findUnique({ where: { id } });
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: employee });
  } catch (error) {
    logError('Get payroll employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const basicSalary  = body.basicSalary  ?? undefined;
    const allowances   = body.allowances   ?? undefined;
    const totalSalary  = (basicSalary !== undefined || allowances !== undefined)
      ? ((basicSalary ?? 0) + (allowances ?? 0))
      : undefined;

    const employee = await prisma.payrollEmployee.update({
      where: { id },
      data: {
        ...(body.empCode        !== undefined ? { empCode:        body.empCode }        : {}),
        ...(body.name           !== undefined ? { name:           body.name }           : {}),
        ...(body.visaType       !== undefined ? { visaType:       body.visaType }       : {}),
        ...(body.costCenter     !== undefined ? { costCenter:     body.costCenter }     : {}),
        ...(body.wpsEntity      !== undefined ? { wpsEntity:      body.wpsEntity }      : {}),
        ...(body.paymentMethod  !== undefined ? { paymentMethod:  body.paymentMethod }  : {}),
        ...(basicSalary         !== undefined ? { basicSalary }                         : {}),
        ...(allowances          !== undefined ? { allowances }                          : {}),
        ...(totalSalary         !== undefined ? { totalSalary }                         : {}),
        ...(body.otherAllowance !== undefined ? { otherAllowance: body.otherAllowance } : {}),
        ...(body.hoursPerDay    !== undefined ? { hoursPerDay:    body.hoursPerDay }    : {}),
        ...(body.status         !== undefined ? { status:         body.status }         : {}),
        ...(body.remarks        !== undefined ? { remarks:        body.remarks }        : {}),
        ...(body.startDate      !== undefined ? { startDate:      body.startDate ? new Date(body.startDate) : null } : {}),
      },
    });

    return NextResponse.json({ data: employee });
  } catch (error) {
    logError('Update payroll employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.payrollEmployee.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    logError('Delete payroll employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
