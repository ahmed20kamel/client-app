import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { updateQuotationSchema, rejectQuotationSchema } from '@/lib/validations/quotation';
import { z } from 'zod';

// ── Shared include for all responses ─────────────────────────────────────────
const QUOTATION_INCLUDE = {
  customer: { select: { id: true, fullName: true } },
  client: { select: { id: true, companyName: true, trn: true } },
  engineer: { select: { id: true, name: true, mobile: true } },
  createdBy: { select: { id: true, fullName: true } },
  confirmedBy: { select: { id: true, fullName: true } },
  clientApprovedBy: { select: { id: true, fullName: true } },
  items: { orderBy: { sortOrder: 'asc' as const } },
  taxInvoices: { select: { id: true, invoiceNumber: true, status: true, createdAt: true } },
  deliveryNotes: { select: { id: true, dnNumber: true, status: true, createdAt: true } },
};

// ── GET /api/quotations/[id] ──────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    // Any authenticated user can view quotations
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: QUOTATION_INCLUDE,
    });

    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    return NextResponse.json({ data: quotation });
  } catch (error) {
    logError('GET quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH /api/quotations/[id] ────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const canAdmin = true; // all authenticated users can perform actions

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    const body = await request.json();
    const { action } = body;

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: send  (DRAFT → SENT)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'send') {
      if (existing.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Only a DRAFT quotation can be sent.' }, { status: 400 });
      }
      const updated = await prisma.quotation.update({
        where: { id },
        data: { status: 'SENT', sentAt: new Date() },
        include: QUOTATION_INCLUDE,
      });
      return NextResponse.json({ data: updated });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: client_approve  (SENT → CLIENT_APPROVED)
    // Records that the client has reviewed and accepted the quotation.
    // Optionally captures the client's LPO number at this stage.
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'client_approve') {
      if (!canAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (existing.status !== 'SENT') {
        return NextResponse.json(
          { error: 'Quotation must be in SENT status for client approval.' },
          { status: 400 }
        );
      }
      const clientApproveSchema = z.object({
        lpoNumber: z.string().min(1, 'LPO Number is required'),
        clientNotes: z.string().optional().nullable(),
      });
      const parsed = clientApproveSchema.parse(body);
      const now = new Date();
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: 'CLIENT_APPROVED',
          clientApprovedAt: now,
          approvedAt: now,              // keep legacy field in sync
          clientApprovedById: session.user.id,
          lpoNumber: parsed.lpoNumber,
          clientNotes: parsed.clientNotes ?? null,
        },
        include: QUOTATION_INCLUDE,
      });
      return NextResponse.json({ data: updated });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: client_reject  (SENT → CLIENT_REJECTED)
    // Records that the client declined or requested revisions.
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'client_reject') {
      if (!canAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (existing.status !== 'SENT') {
        return NextResponse.json(
          { error: 'Quotation must be in SENT status to record client rejection.' },
          { status: 400 }
        );
      }
      const clientRejectSchema = z.object({
        clientNotes: z.string().optional().nullable(),
      });
      const parsed = clientRejectSchema.parse(body);
      const now = new Date();
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: 'CLIENT_REJECTED',
          clientRejectedAt: now,
          rejectedAt: now,              // keep legacy field in sync
          rejectionReason: parsed.clientNotes ?? null,
          clientNotes: parsed.clientNotes ?? null,
        },
        include: QUOTATION_INCLUDE,
      });
      return NextResponse.json({ data: updated });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: revert_to_draft  (CLIENT_REJECTED → DRAFT)
    // Allows the sales team to revise and re-send after client rejection.
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'revert_to_draft') {
      if (!canAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (existing.status !== 'CLIENT_REJECTED') {
        return NextResponse.json(
          { error: 'Only a CLIENT_REJECTED quotation can be reverted to draft.' },
          { status: 400 }
        );
      }
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: 'DRAFT',
          clientRejectedAt: null,
          rejectedAt: null,
          rejectionReason: null,
          clientNotes: null,
          sentAt: null,
        },
        include: QUOTATION_INCLUDE,
      });
      return NextResponse.json({ data: updated });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION: finance_confirm  (CLIENT_APPROVED → CONFIRMED)
    // Finance/Admin confirms payment arrangement → triggers production/order.
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'finance_confirm') {
      if (!canAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!['CLIENT_APPROVED', 'APPROVED'].includes(existing.status)) {
        return NextResponse.json(
          { error: 'Finance confirmation requires CLIENT_APPROVED status.' },
          { status: 400 }
        );
      }
      const financeConfirmSchema = z.object({
        paymentTerms: z.enum(['Cash', 'Cheque', 'Bank Transfer', 'Cash / Cheque / Bank Transfer']),
        paymentType: z.enum(['DEPOSIT', 'PARTIAL', 'FULL_ADVANCE', 'FULL_ON_DELIVERY']),
        depositPercent: z.number().min(0).max(100).optional().nullable(),
        depositAmount: z.number().min(0).optional().nullable(),
        paymentProofUrl: z.string().optional().nullable(),
        paymentNotes: z.string().optional().nullable(),
      });
      const parsed = financeConfirmSchema.parse(body);
      const now = new Date();
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
          confirmedById: session.user.id,
          paymentTerms: parsed.paymentTerms,
          paymentType: parsed.paymentType,
          depositPercent: parsed.depositPercent ?? null,
          depositAmount: parsed.depositAmount ?? null,
          paymentProofUrl: parsed.paymentProofUrl ?? null,
          paymentNotes: parsed.paymentNotes ?? null,
        },
        include: QUOTATION_INCLUDE,
      });
      return NextResponse.json({ data: updated });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LEGACY ACTION: approve  (SENT → CONFIRMED in one step)
    // Kept for backward compat with older records.
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'approve') {
      if (!canAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (existing.status !== 'SENT') {
        return NextResponse.json({ error: 'Only a SENT quotation can use the legacy approve action.' }, { status: 400 });
      }
      const legacyApproveSchema = z.object({
        lpoNumber: z.string().min(1, 'LPO Number is required'),
        paymentTerms: z.enum(['Cash', 'Cheque', 'Bank Transfer', 'Cash / Cheque / Bank Transfer']),
        paymentType: z.enum(['DEPOSIT', 'PARTIAL', 'FULL_ADVANCE', 'FULL_ON_DELIVERY']),
        depositPercent: z.number().min(0).max(100).optional().nullable(),
        depositAmount: z.number().min(0).optional().nullable(),
        paymentProofUrl: z.string().optional().nullable(),
        paymentNotes: z.string().optional().nullable(),
      });
      const parsed = legacyApproveSchema.parse(body);
      const now = new Date();
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          approvedAt: now,
          clientApprovedAt: now,
          confirmedAt: now,
          confirmedById: session.user.id,
          lpoNumber: parsed.lpoNumber,
          paymentTerms: parsed.paymentTerms,
          paymentType: parsed.paymentType,
          depositPercent: parsed.depositPercent ?? null,
          depositAmount: parsed.depositAmount ?? null,
          paymentProofUrl: parsed.paymentProofUrl ?? null,
          paymentNotes: parsed.paymentNotes ?? null,
        },
        include: QUOTATION_INCLUDE,
      });
      return NextResponse.json({ data: updated });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LEGACY ACTION: reject  (SENT or APPROVED → REJECTED)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'reject') {
      if (!canAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!['SENT', 'APPROVED', 'CLIENT_APPROVED'].includes(existing.status)) {
        return NextResponse.json({ error: 'Cannot reject a quotation in this status.' }, { status: 400 });
      }
      const { rejectionReason } = rejectQuotationSchema.parse(body);
      const now = new Date();
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: 'CLIENT_REJECTED',
          clientRejectedAt: now,
          rejectedAt: now,
          rejectionReason: rejectionReason ?? null,
          clientNotes: rejectionReason ?? null,
        },
        include: QUOTATION_INCLUDE,
      });
      return NextResponse.json({ data: updated });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LEGACY ACTION: confirm  (APPROVED → CONFIRMED, for old records)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'confirm') {
      if (!canAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!['APPROVED', 'CLIENT_APPROVED'].includes(existing.status)) {
        return NextResponse.json({ error: 'Quotation must be CLIENT_APPROVED to confirm.' }, { status: 400 });
      }
      const legacyConfirmSchema = z.object({
        paymentType: z.enum(['DEPOSIT', 'PARTIAL', 'FULL_ADVANCE', 'FULL_ON_DELIVERY']),
        depositPercent: z.number().min(0).max(100).optional().nullable(),
        depositAmount: z.number().min(0).optional().nullable(),
        paymentProofUrl: z.string().optional().nullable(),
        paymentNotes: z.string().optional().nullable(),
      });
      const parsed = legacyConfirmSchema.parse(body);
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmedById: session.user.id,
          paymentType: parsed.paymentType,
          depositPercent: parsed.depositPercent ?? null,
          depositAmount: parsed.depositAmount ?? null,
          paymentProofUrl: parsed.paymentProofUrl ?? null,
          paymentNotes: parsed.paymentNotes ?? null,
        },
        include: QUOTATION_INCLUDE,
      });
      return NextResponse.json({ data: updated });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Normal field update (no action)
    // ──────────────────────────────────────────────────────────────────────────
    if (body.status !== undefined) {
      return NextResponse.json(
        { error: 'Use explicit action param to change status.' },
        { status: 400 }
      );
    }

    const validatedData = updateQuotationSchema.parse(body);

    if (validatedData.items) {
      const itemsData = validatedData.items.map((item, index) => {
        const lineDiscount = item.discount || 0;
        const lm = item.linearMeters ?? (item.quantity * (item.length ?? 100) / 100);
        const lineTotal = lm * item.unitPrice * (1 - lineDiscount / 100);
        return {
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          length: item.length ?? null,
          linearMeters: item.unit === 'LM' ? lm : null,
          size: item.size ?? null,
          unit: item.unit ?? null,
          unitPrice: item.unitPrice,
          discount: lineDiscount,
          total: lineTotal,
          sortOrder: index,
        };
      });

      const subtotal = itemsData.reduce((sum, item) => sum + item.total, 0);
      const discountPercent = validatedData.discountPercent ?? existing.discountPercent;
      const discountAmount = subtotal * discountPercent / 100;
      const taxPercent = validatedData.taxPercent ?? existing.taxPercent;
      const deliveryCharges = validatedData.deliveryCharges ?? existing.deliveryCharges;
      const taxAmount = (subtotal - discountAmount + deliveryCharges) * taxPercent / 100;
      const total = subtotal - discountAmount + deliveryCharges + taxAmount;

      const result = await prisma.$transaction(async (tx) => {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        return tx.quotation.update({
          where: { id },
          data: {
            customerId: validatedData.customerId ?? undefined,
            clientId: validatedData.clientId ?? undefined,
            engineerId: validatedData.engineerId ?? undefined,
            engineerName: validatedData.engineerName,
            mobileNumber: validatedData.mobileNumber,
            projectName: validatedData.projectName,
            notes: validatedData.notes,
            terms: validatedData.terms,
            validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : undefined,
            subtotal, discountPercent, discountAmount, taxPercent, taxAmount, deliveryCharges, total,
            items: { create: itemsData },
          },
          include: QUOTATION_INCLUDE,
        });
      });
      return NextResponse.json({ data: result });
    }

    // Partial field update (no items)
    const updateData: Record<string, unknown> = {};
    if (validatedData.customerId !== undefined) updateData.customerId = validatedData.customerId;
    if (validatedData.clientId !== undefined) updateData.clientId = validatedData.clientId;
    if (validatedData.engineerId !== undefined) updateData.engineerId = validatedData.engineerId;
    if (validatedData.engineerName !== undefined) updateData.engineerName = validatedData.engineerName;
    if (validatedData.mobileNumber !== undefined) updateData.mobileNumber = validatedData.mobileNumber;
    if (validatedData.projectName !== undefined) updateData.projectName = validatedData.projectName;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.terms !== undefined) updateData.terms = validatedData.terms;
    if (validatedData.validUntil !== undefined) {
      updateData.validUntil = validatedData.validUntil ? new Date(validatedData.validUntil) : null;
    }
    if (validatedData.deliveryCharges !== undefined) {
      updateData.deliveryCharges = validatedData.deliveryCharges;
      const newDelivery = validatedData.deliveryCharges;
      const newTax = (existing.subtotal - existing.discountAmount + newDelivery) * (existing.taxPercent / 100);
      updateData.taxAmount = newTax;
      updateData.total = existing.subtotal - existing.discountAmount + newDelivery + newTax;
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: updateData,
      include: QUOTATION_INCLUDE,
    });
    return NextResponse.json({ data: updated });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    logError('PATCH quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE /api/quotations/[id] ───────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        taxInvoices: { select: { id: true } },
        deliveryNotes: { select: { id: true } },
      },
    });
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    if (quotation.taxInvoices.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete: this quotation has linked tax invoices. Delete them first.' },
        { status: 409 }
      );
    }
    if (quotation.deliveryNotes.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete: this quotation has linked delivery notes. Delete them first.' },
        { status: 409 }
      );
    }

    await prisma.quotation.delete({ where: { id } });
    return NextResponse.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    logError('DELETE quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
