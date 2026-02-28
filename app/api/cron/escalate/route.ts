import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { processEscalations } from '@/lib/escalation';

// POST /api/cron/escalate - Run escalation engine
// Can be triggered by cron job or manually by admin
export async function POST(request: NextRequest) {
  try {
    // Check for cron secret or authenticated admin
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      // Authenticated via cron secret
      const result = await processEscalations();
      return NextResponse.json({ data: result });
    }

    // Otherwise require admin auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await can(session.user.id, 'user.manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await processEscalations();
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Escalation cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
