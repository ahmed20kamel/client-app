import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';

export const maxDuration = 30;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-rar-compressed',
  'video/mp4', 'video/quicktime',
];

// GET /api/internal-tasks/[id]/attachments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: internalTaskId } = await params;
    const attachments = await prisma.attachment.findMany({
      where: { internalTaskId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
    });
    return NextResponse.json({ data: attachments });
  } catch (error) {
    console.error('Get task attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/internal-tasks/[id]/attachments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: internalTaskId } = await params;

    const task = await prisma.internalTask.findUnique({
      where: { id: internalTaskId },
      select: { id: true, assignedToId: true, createdById: true },
    });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const isAdmin = session.user.role === 'Admin';
    const isRelated = task.assignedToId === session.user.id || task.createdById === session.user.id;
    if (!isAdmin && !isRelated) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const { url, publicId } = await uploadToCloudinary(Buffer.from(bytes), file.name, 'crm/task-attachments');

    const attachment = await prisma.attachment.create({
      data: {
        internalTaskId,
        category: 'TASK_FILE',
        fileName: publicId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        filePath: url,
        uploadedById: session.user.id,
      },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    console.error('Upload task attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/internal-tasks/[id]/attachments?attachmentId=xxx
export async function DELETE(
  request: NextRequest,
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
    if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = session.user.role === 'Admin';
    const isOwner = attachment.uploadedById === session.user.id;
    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await deleteFromCloudinary(attachment.fileName);
    await prisma.attachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
