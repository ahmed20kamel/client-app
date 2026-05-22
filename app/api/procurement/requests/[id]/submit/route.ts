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
    if (pr.status !== 'DRAFT') return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    logError('Submit PR error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
