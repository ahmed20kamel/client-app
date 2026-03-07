import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/attachments/link - Link temp attachments to a real customer
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tempSessionId, customerId } = await request.json();

    if (!tempSessionId || !customerId) {
      return NextResponse.json({ error: 'tempSessionId and customerId are required' }, { status: 400 });
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Update all temp attachments to point to real customer
    const result = await prisma.attachment.updateMany({
      where: { tempSessionId },
      data: { customerId, tempSessionId: null },
    });

    return NextResponse.json({ data: { linked: result.count } });
  } catch (error) {
    console.error('Link attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
