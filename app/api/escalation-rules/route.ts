import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { createEscalationRuleSchema } from '@/lib/validations/escalation';
import { z } from 'zod';

// GET /api/escalation-rules - List all escalation rules
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await can(session.user.id, 'user.manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rules = await prisma.escalationRule.findMany({
      include: {
        department: { select: { id: true, name: true, nameAr: true } },
      },
      orderBy: [{ departmentId: 'asc' }, { triggerValue: 'asc' }],
    });

    return NextResponse.json({ data: rules });
  } catch (error) {
    console.error('Get escalation rules error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/escalation-rules - Create escalation rule (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await can(session.user.id, 'user.manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createEscalationRuleSchema.parse(body);

    const rule = await prisma.escalationRule.create({
      data: validatedData,
      include: {
        department: { select: { id: true, name: true, nameAr: true } },
      },
    });

    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Create escalation rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
