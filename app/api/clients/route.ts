import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { z } from 'zod';

const createClientSchema = z.object({
  companyName: z.string().min(1),
  trn: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/clients
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Any authenticated user can view clients

    const search = request.nextUrl.searchParams.get('search') || '';
    const includeEngineers = request.nextUrl.searchParams.get('engineers') === 'true';

    const clients = await prisma.client.findMany({
      where: search ? {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
        status: 'ACTIVE',
      } : { status: 'ACTIVE' },
      include: {
        engineers: includeEngineers,
        _count: { select: { quotations: true, taxInvoices: true } },
      },
      orderBy: { companyName: 'asc' },
      take: 200,
    });

    return NextResponse.json({ data: clients });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clients
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Any authenticated user can create clients

    const body = await request.json();
    const data = createClientSchema.parse(body);

    const client = await prisma.client.create({
      data: {
        companyName: data.companyName,
        trn: data.trn || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
        createdById: session.user.id,
      },
      include: { engineers: true },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
