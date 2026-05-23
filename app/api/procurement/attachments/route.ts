import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entityType = request.nextUrl.searchParams.get('entityType') || '';
    const entityId = request.nextUrl.searchParams.get('entityId') || '';

    if (!entityType || !entityId) return NextResponse.json({ data: [] });

    const attachments = await prisma.procurementAttachment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { entityType, entityId, title, url, notes } = body;

    if (!entityType || !entityId || !title?.trim())
      return NextResponse.json({ error: 'entityType, entityId, and title are required' }, { status: 400 });

    const attachment = await prisma.procurementAttachment.create({
      data: {
        entityType,
        entityId,
        title: title.trim(),
        url: url?.trim() || null,
        notes: notes?.trim() || null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    console.error('Create attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
