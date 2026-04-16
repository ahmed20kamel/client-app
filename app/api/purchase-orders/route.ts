import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { createPurchaseOrderSchema } from '@/lib/validations/purchase-order';
import { withUniqueRetry } from '@/lib/db-utils';
import { z } from 'zod';

// GET /api/purchase-orders - List purchase orders with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canView = await can(session.user.id, 'reports.view.all');
    const canViewOwn = await can(session.user.id, 'reports.view.own');
    if (!canView && !canViewOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const supplierId = searchParams.get('supplierId') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    const total = await prisma.purchaseOrder.count({ where });

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: purchaseOrders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError('Get purchase orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/purchase-orders - Create new purchase order
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createPurchaseOrderSchema.parse(body);

    // Calculate totals
    const items = validatedData.items.map((item, index) => ({
      productId: item.productId ?? null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
      sortOrder: index,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = validatedData.discountPercent || 0;
    const discountAmount = subtotal * discountPercent / 100;
    const taxPercent = validatedData.taxPercent ?? 5;
    const taxAmount = (subtotal - discountAmount) * taxPercent / 100;
    const total = subtotal - discountAmount + taxAmount;

    const purchaseOrder = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const lastRecord = await tx.purchaseOrder.findFirst({ orderBy: { createdAt: 'desc' }, select: { poNumber: true } });
      let seq = 1;
      if (lastRecord?.poNumber) {
        const parts = lastRecord.poNumber.split('-');
        if (parts[1] === String(year)) seq = parseInt(parts[2]) + 1;
      }
      const poNumber = `PO-${year}-${String(seq).padStart(4, '0')}`;
      return tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: validatedData.supplierId,
        subject: validatedData.subject ?? null,
        notes: validatedData.notes ?? null,
        terms: validatedData.terms ?? null,
        expectedDate: validatedData.expectedDate ? new Date(validatedData.expectedDate) : null,
        subtotal,
        discountPercent,
        discountAmount,
        taxPercent,
        taxAmount,
        total,
        createdById: session.user.id,
        items: {
          create: items,
        },
      },
      include: {
        supplier: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: true,
      },
      });
    }));

    return NextResponse.json({ data: purchaseOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    logError('Create purchase order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
