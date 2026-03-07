import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/quotations/[id]/reject - Reject quotation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    if (quotation.status !== 'SENT') {
      return NextResponse.json(
        { error: 'Only SENT quotations can be rejected' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const rejectionReason = body.rejectionReason || null;

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason,
      },
      include: {
        customer: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Reject quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
