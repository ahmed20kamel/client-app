import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';

export const maxDuration = 30;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// GET /api/tax-invoices/[id]/attachments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const invoice = await prisma.taxInvoice.findUnique({ where: { id }, select: { id: true } });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const attachments = await prisma.attachment.findMany({
      where: { taxInvoiceId: id },
      include: { uploadedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: attachments });
  } catch (error) {
    logError('Get invoice attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tax-invoices/[id]/attachments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: taxInvoiceId } = await params;

    const invoice = await prisma.taxInvoice.findUnique({ where: { id: taxInvoiceId }, select: { id: true } });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'document';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const { url, publicId } = await uploadToCloudinary(Buffer.from(bytes), file.name, 'crm/tax-invoices');

    const attachment = await prisma.attachment.create({
      data: {
        taxInvoiceId,
        category,
        fileName: publicId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        filePath: url,
        uploadedById: session.user.id,
      },
      include: { uploadedBy: { select: { fullName: true } } },
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    logError('Upload invoice attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tax-invoices/[id]/attachments?attachmentId=xxx
export async function DELETE(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const attachmentId = new URL(request.url).searchParams.get('attachmentId');
    if (!attachmentId) return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });

    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });

    if (attachment.uploadedById !== session.user.id && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteFromCloudinary(attachment.fileName);
    await prisma.attachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Delete invoice attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
