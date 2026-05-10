import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const loan = await prisma.payrollLoan.findUnique({ where: { id } });
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const updated = await prisma.payrollLoan.update({
      where: { id },
      data: {
        description:       body.description       !== undefined ? body.description       : loan.description,
        totalAmount:       body.totalAmount        !== undefined ? parseFloat(body.totalAmount)       : loan.totalAmount,
        installmentAmount: body.installmentAmount  !== undefined ? parseFloat(body.installmentAmount) : loan.installmentAmount,
        status:            body.status             !== undefined ? body.status             : loan.status,
        paidAmount:        body.paidAmount         !== undefined ? parseFloat(body.paidAmount)        : loan.paidAmount,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logError('Update loan error:', error);
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
    await prisma.payrollLoan.delete({ where: { id } });

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    logError('Delete loan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
