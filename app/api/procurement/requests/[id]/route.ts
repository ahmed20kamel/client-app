import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        supplierQuotes: {
          include: {
            supplier: { select: { id: true, name: true } },
            items: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
        purchaseOrders: {
          select: { id: true, poNumber: true, status: true, total: true },
        },
      },
    });
    if (!pr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: pr });
  } catch (error) {
    logError('Get PR error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (pr.status !== 'DRAFT') return NextResponse.json({ error: 'Can only edit DRAFT requests' }, { status: 400 });
    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        title: body.title ?? pr.title,
        description: body.description !== undefined ? body.description : pr.description,
        requiredDate: body.requiredDate ? new Date(body.requiredDate) : pr.requiredDate,
        projectRef: body.projectRef !== undefined ? body.projectRef : pr.projectRef,
        notes: body.notes !== undefined ? body.notes : pr.notes,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    logError('Update PR error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (pr.status !== 'DRAFT') return NextResponse.json({ error: 'Can only delete DRAFT requests' }, { status: 400 });
    await prisma.purchaseRequest.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    logError('Delete PR error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
