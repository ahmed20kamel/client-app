import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

// GET /api/attachments/download?id=xxx - Download attachment via server proxy
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('id');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Fetch the file from Cloudinary using the stored URL
    const fileRes = await fetch(attachment.filePath);
    if (!fileRes.ok) {
      console.error('Failed to fetch from Cloudinary:', fileRes.status, attachment.filePath);
      return NextResponse.json({ error: 'Failed to download file' }, { status: 502 });
    }

    const blob = await fileRes.blob();

    return new NextResponse(blob, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
        'Content-Length': String(blob.size),
      },
    });
  } catch (error) {
    console.error('Download attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
