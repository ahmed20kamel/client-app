import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/attachments/save - Save attachment record after direct Cloudinary upload
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      tempSessionId,
      category,
      subcategory,
      fileName,
      originalName,
      fileSize,
      mimeType,
      filePath,
    } = body;

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (!customerId && !tempSessionId) {
      return NextResponse.json({ error: 'Customer ID or temp session ID required' }, { status: 400 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        customerId: customerId || null,
        tempSessionId: tempSessionId || null,
        category,
        subcategory: subcategory || null,
        fileName,
        originalName,
        fileSize,
        mimeType,
        filePath,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    console.error('Save attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
