import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendQuotationEmail } from '@/lib/email';

// POST /api/quotations/[id]/send - Mark quotation as sent + email client
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
      include: {
        client: true,
        engineer: true,
        customer: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: true,
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    if (quotation.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only DRAFT quotations can be sent' },
        { status: 400 }
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: {
        customer: true,
        createdBy: { select: { id: true, fullName: true } },
        items: true,
      },
    });

    // Send email to client if email available (fire-and-forget)
    const clientName = quotation.client?.companyName || quotation.customer?.fullName || 'Valued Client';
    const clientEmail = quotation.client?.email || quotation.customer?.email;

    if (clientEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      sendQuotationEmail({
        to: clientEmail,
        clientName,
        quotationNumber: quotation.quotationNumber,
        projectName: quotation.projectName,
        engineerName: quotation.engineer?.name || quotation.engineerName,
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        total: quotation.total,
        quotationUrl: `${appUrl}/en/quotations/${id}`,
        companyName: 'LitBeam',
      }).catch(err => console.error('Failed to send quotation email:', err));
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    logError('Send quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
