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

// GET /api/customers/[id]/attachments - List attachments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const attachments = await prisma.attachment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/customers/[id]/attachments - Upload attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string;
    const subcategory = formData.get('subcategory') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!category) return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const { url, publicId } = await uploadToCloudinary(Buffer.from(bytes), file.name, 'crm/attachments');

    const attachment = await prisma.attachment.create({
      data: {
        customerId,
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
    console.error('Upload attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/customers/[id]/attachments - Delete attachment
export async function DELETE(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });

    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });

    if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });

    // Only uploader or Admin can delete
    if (attachment.uploadedById !== session.user.id && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteFromCloudinary(attachment.fileName);
    await prisma.attachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
