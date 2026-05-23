import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!['DRAFT', 'REJECTED'].includes(pr.status)) return NextResponse.json({ error: 'Cannot submit from current status' }, { status: 400 });

    // On resubmit, cancel pending quotations from the previous cycle
    if (pr.status === 'REJECTED') {
      await prisma.supplierQuotation.updateMany({
        where: { purchaseRequestId: id, status: 'RECEIVED' },
        data: { status: 'REJECTED', rejectedAt: new Date() },
      });
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null,
        approvedById: null,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    logError('Submit PR error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
