import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createStockMovementSchema } from '@/lib/validations/inventory';
import { z } from 'zod';

// POST /api/inventory/[id]/stock-movement - Create stock movement
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
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createStockMovementSchema.parse(body);

    const previousStock = product.currentStock;
    let newStock: number;

    switch (validatedData.type) {
      case 'IN':
      case 'RETURN':
        newStock = previousStock + validatedData.quantity;
        break;

      case 'OUT':
      case 'TRANSFER':
        if (previousStock < validatedData.quantity) {
          return NextResponse.json(
            { error: 'Insufficient stock' },
            { status: 400 }
          );
        }
        newStock = previousStock - validatedData.quantity;
        break;

      case 'ADJUSTMENT':
        newStock = validatedData.quantity;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid movement type' },
          { status: 400 }
        );
    }

    // Create movement and update stock atomically
    const [stockMovement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId: id,
          type: validatedData.type,
          quantity: validatedData.quantity,
          previousStock,
          newStock,
          reason: validatedData.reason || null,
          reference: validatedData.reference || null,
          createdById: session.user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.product.update({
        where: { id },
        data: { currentStock: newStock },
      }),
    ]);

    return NextResponse.json({ data: stockMovement }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Create stock movement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
