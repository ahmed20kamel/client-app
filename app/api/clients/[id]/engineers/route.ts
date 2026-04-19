import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const engineerSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
});

// GET /api/clients/[id]/engineers
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const engineers = await prisma.engineer.findMany({
      where: { clientId: id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: engineers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clients/[id]/engineers
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: clientId } = await params;

    const body = await request.json();
    const data = engineerSchema.parse(body);

    const engineer = await prisma.engineer.create({
      data: {
        clientId,
        name: data.name,
        nameAr: data.nameAr || null,
        mobile: data.mobile || null,
        email: data.email || null,
      },
    });

    return NextResponse.json({ data: engineer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
