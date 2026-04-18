import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { linkProductSupplierSchema } from '@/lib/validations/inventory';
import { z } from 'zod';

// POST /api/inventory/[id]/suppliers - Link supplier to product
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

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = linkProductSupplierSchema.parse(body);

    // Check supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: validatedData.supplierId },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Check if link already exists
    const existingLink = await prisma.productSupplier.findUnique({
      where: {
        productId_supplierId: {
          productId: id,
          supplierId: validatedData.supplierId,
        },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'Supplier already linked to this product' },
        { status: 400 }
      );
    }

    const productSupplier = await prisma.productSupplier.create({
      data: {
        productId: id,
        supplierId: validatedData.supplierId,
        supplierSku: validatedData.supplierSku || null,
        unitCost: validatedData.unitCost ?? null,
        leadTimeDays: validatedData.leadTimeDays ?? null,
      },
      include: {
        supplier: true,
      },
    });

    return NextResponse.json({ data: productSupplier }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Link supplier error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/[id]/suppliers - Unlink supplier from product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const { supplierId } = body;

    if (!supplierId) {
      return NextResponse.json(
        { error: 'supplierId is required' },
        { status: 400 }
      );
    }

    const existingLink = await prisma.productSupplier.findUnique({
      where: {
        productId_supplierId: {
          productId: id,
          supplierId,
        },
      },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: 'Supplier link not found' },
        { status: 404 }
      );
    }

    await prisma.productSupplier.delete({
      where: {
        productId_supplierId: {
          productId: id,
          supplierId,
        },
      },
    });

    return NextResponse.json({ message: 'Supplier unlinked successfully' });
  } catch (error) {
    console.error('Unlink supplier error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
