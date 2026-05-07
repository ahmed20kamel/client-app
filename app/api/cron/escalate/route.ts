import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { processEscalations } from '@/lib/escalation';
import { prisma } from '@/lib/prisma';
import { timingSafeEqual } from 'crypto';

async function runEscalation() {
  await prisma.task.updateMany({
    where: { status: 'OPEN', dueAt: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });
  return processEscalations();
}

// POST /api/cron/escalate - Run escalation engine
// Triggered by cron job (x-cron-secret header) or manually by admin
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    // Path 1: valid cron secret from external scheduler
    if (cronSecret && expectedSecret) {
      const valid =
        cronSecret.length === expectedSecret.length &&
        timingSafeEqual(Buffer.from(cronSecret), Buffer.from(expectedSecret));
      if (valid) {
        const result = await runEscalation();
        return NextResponse.json({ data: result });
      }
      // Wrong secret provided — reject immediately, don't fall through
      return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 });
    }

    // Path 2: no cron secret — require authenticated admin session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await can(session.user.id, 'user.manage'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await runEscalation();
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Escalation cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
