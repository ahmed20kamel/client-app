import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const inv = await prisma.vendorInvoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: {
          include: {
            items: true,
            goodsReceipts: { include: { items: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: inv });
  } catch (error) {
    logError('Get vendor invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const updated = await prisma.vendorInvoice.update({
      where: { id },
      data: {
        status: body.status,
        matchedAt: body.status === 'MATCHED' ? new Date() : undefined,
        approvedAt: body.status === 'APPROVED' ? new Date() : undefined,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    logError('Update vendor invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
