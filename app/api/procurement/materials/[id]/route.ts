import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, unitOfMeasure } = body;

    const material = await prisma.procurementMaterial.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(unitOfMeasure !== undefined && { unitOfMeasure }),
      },
    });

    return NextResponse.json({ data: material });
  } catch (error) {
    console.error('Update procurement material error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.procurementMaterial.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete procurement material error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
