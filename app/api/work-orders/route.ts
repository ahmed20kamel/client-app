import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withUniqueRetry } from '@/lib/db-utils';
import { logError } from '@/lib/logger';
import { z } from 'zod';

const workOrderItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  length: z.number().optional().nullable(),
  linearMeters: z.number().optional().nullable(),
  size: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});

const createWorkOrderSchema = z.object({
  quotationId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  engineerName: z.string().optional().nullable(),
  mobileNumber: z.string().optional().nullable(),
  projectName: z.string().optional().nullable(),
  workingDays: z.number().int().min(1).default(1),
  notes: z.string().optional().nullable(),
  items: z.array(workOrderItemSchema).min(1),
});

async function generateWONumber(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const last = await tx.workOrder.findFirst({ orderBy: { createdAt: 'desc' }, select: { woNumber: true } });
  let seq = 1;
  if (last?.woNumber) {
    const parts = last.woNumber.split('-');
    const n = parseInt(parts[1]?.split('/')[0] || '0');
    if (!isNaN(n)) seq = n + 1;
  }
  return `WO-${seq}/${year}`;
}

// GET /api/work-orders
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const quotationId = searchParams.get('quotationId') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { woNumber: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { engineerName: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) where.status = status;
    if (quotationId) where.quotationId = quotationId;

    const [workOrders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true } },
          client: { select: { id: true, companyName: true } },
          quotation: { select: { id: true, quotationNumber: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workOrder.count({ where }),
    ]);

    return NextResponse.json({ data: workOrders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logError('Get work orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/work-orders
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const data = createWorkOrderSchema.parse(body);

    const result = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
      const woNumber = await generateWONumber(tx);
      return tx.workOrder.create({
        data: {
          woNumber,
          quotationId: data.quotationId || null,
          customerId: data.customerId || null,
          clientId: data.clientId || null,
          engineerName: data.engineerName || null,
          mobileNumber: data.mobileNumber || null,
          projectName: data.projectName || null,
          workingDays: data.workingDays ?? 1,
          notes: data.notes || null,
          createdById: session.user.id,
          items: {
            create: data.items.map((item, i) => ({
              description: item.description,
              quantity: item.quantity,
              length: item.length ?? null,
              linearMeters: item.linearMeters ?? null,
              size: item.size ?? null,
              unit: item.unit ?? null,
              sortOrder: item.sortOrder ?? i,
            })),
          },
        },
        include: {
          customer: { select: { id: true, fullName: true } },
          client: { select: { id: true, companyName: true } },
          quotation: { select: { id: true, quotationNumber: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
    }));

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    logError('Create work order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
