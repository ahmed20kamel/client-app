import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const sq = await prisma.supplierQuotation.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseRequest: { include: { items: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        purchaseOrder: { select: { id: true, poNumber: true, status: true } },
      },
    });
    if (!sq) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: sq });
  } catch (error) {
    logError('Get supplier quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const sq = await prisma.supplierQuotation.findUnique({ where: { id } });
    if (!sq) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (sq.status !== 'RECEIVED') return NextResponse.json({ error: 'Cannot delete processed quotation' }, { status: 400 });
    await prisma.supplierQuotation.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    logError('Delete supplier quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
