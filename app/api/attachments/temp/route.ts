import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';

export const maxDuration = 120;

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.dwg', 'application/x-dwg', 'image/vnd.dwg',
  'application/dxf', 'image/vnd.dxf',
  'application/zip', 'application/x-rar-compressed',
  'application/gzip', 'application/x-gzip',
];

// POST /api/attachments/temp - Upload file with a temp sessionId (no customer yet)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string;
    const subcategory = formData.get('subcategory') as string | null;
    const tempSessionId = formData.get('tempSessionId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (!tempSessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { url, publicId } = await uploadToCloudinary(buffer, file.name, 'crm/attachments');

    // Save to database with tempSessionId instead of customerId
    const attachment = await prisma.attachment.create({
      data: {
        tempSessionId,
        category,
        subcategory: subcategory || null,
        fileName: publicId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        filePath: url,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    console.error('Temp upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/attachments/temp?sessionId=xxx - List temp attachments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tempSessionId = searchParams.get('sessionId');

    if (!tempSessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { tempSessionId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: attachments });
  } catch (error) {
    console.error('Get temp attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/attachments/temp?attachmentId=xxx - Delete a temp attachment
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(attachment.fileName);

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete temp attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
