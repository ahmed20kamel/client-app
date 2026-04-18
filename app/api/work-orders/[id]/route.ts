import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';
import { z } from 'zod';

const WO_INCLUDE = {
  customer: { select: { id: true, fullName: true } },
  client: { select: { id: true, companyName: true } },
  quotation: { select: { id: true, quotationNumber: true } },
  createdBy: { select: { id: true, fullName: true } },
  items: { orderBy: { sortOrder: 'asc' as const } },
};

// GET /api/work-orders/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const wo = await prisma.workOrder.findUnique({ where: { id }, include: WO_INCLUDE });
    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    return NextResponse.json({ data: wo });
  } catch (error) {
    logError('GET work order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/work-orders/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const schema = z.object({
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
      workingDays: z.number().int().min(1).optional(),
      notes: z.string().optional().nullable(),
      engineerName: z.string().optional().nullable(),
      mobileNumber: z.string().optional().nullable(),
    });

    const data = schema.parse(body);
    const updated = await prisma.workOrder.update({ where: { id }, data, include: WO_INCLUDE });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    logError('PATCH work order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/work-orders/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.workOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('DELETE work order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
