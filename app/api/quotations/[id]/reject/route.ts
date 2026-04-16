import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { z } from 'zod';

const rejectBodySchema = z.object({
  rejectionReason: z.string().max(500).optional().nullable(),
});

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
    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    if (!['SENT', 'CLIENT_APPROVED'].includes(quotation.status)) {
      return NextResponse.json(
        { error: 'Only SENT or CLIENT_APPROVED quotations can be rejected' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rejectionReason } = rejectBodySchema.parse(body);

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'CLIENT_REJECTED',
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    logError('Reject quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
