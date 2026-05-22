import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await prisma.purchaseRequest.findMany({
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        _count: { select: { items: true, supplierQuotes: true, purchaseOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data });
  } catch (error) {
    logError('Get PRs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const count = await prisma.purchaseRequest.count();
    const year = new Date().getFullYear().toString().slice(-2);
    const prNumber = `PR-${year}-${String(count + 1).padStart(3, '0')}`;
    const pr = await prisma.purchaseRequest.create({
      data: {
        prNumber,
        title: body.title,
        description: body.description || null,
        requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
        projectRef: body.projectRef || null,
        notes: body.notes || null,
        requestedById: session.user.id,
        items: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: (body.items || []).map((item: any, i: number) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unit: item.unit || null,
            estimatedPrice: item.estimatedPrice ? parseFloat(item.estimatedPrice) : null,
            notes: item.notes || null,
            sortOrder: i,
          })),
        },
      },
      include: { items: true },
    });
    return NextResponse.json({ data: pr }, { status: 201 });
  } catch (error) {
    logError('Create PR error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
