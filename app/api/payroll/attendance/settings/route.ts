import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const settings = await prisma.attendanceSetting.upsert({
      where:  { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
    return NextResponse.json(settings);
  } catch (error) {
    logError('GET attendance settings error:', error);
    return NextResponse.json(
      { id: 'singleton', checkInStart: 6, checkInEnd: 8, graceMinutes: 0, timezone: 'Asia/Dubai' }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { checkInStart, checkInEnd, graceMinutes } = await request.json();

    if (
      typeof checkInStart !== 'number' || checkInStart < 0 || checkInStart > 23 ||
      typeof checkInEnd   !== 'number' || checkInEnd   < 0 || checkInEnd   > 23 ||
      checkInEnd < checkInStart
    ) {
      return NextResponse.json({ error: 'Invalid window times' }, { status: 400 });
    }

    const settings = await prisma.attendanceSetting.upsert({
      where:  { id: 'singleton' },
      update: { checkInStart, checkInEnd, graceMinutes: graceMinutes ?? 0 },
      create: { id: 'singleton', checkInStart, checkInEnd, graceMinutes: graceMinutes ?? 0 },
    });
    return NextResponse.json(settings);
  } catch (error) {
    logError('PUT attendance settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
