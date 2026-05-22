import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const grn = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            items: { orderBy: { sortOrder: 'asc' } },
          },
        },
        receivedBy: { select: { id: true, fullName: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!grn) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: grn });
  } catch (error) {
    logError('Get GRN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
