import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const { action, reason } = await req.json();
    const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (pr.status !== 'SUBMITTED') return NextResponse.json({ error: 'Request must be SUBMITTED' }, { status: 400 });
    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        approvedById: session.user.id,
        approvedAt: action === 'approve' ? new Date() : null,
        rejectedAt: action === 'reject' ? new Date() : null,
        rejectionReason: reason || null,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    logError('Approve PR error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
