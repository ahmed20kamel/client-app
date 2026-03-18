import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const maxDuration = 60;

// POST /api/attachments/chunk - Receive a file chunk and store temporarily
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const chunk = formData.get('chunk') as File | null;
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = formData.get('chunkIndex') as string;

    if (!chunk || !uploadId || chunkIndex === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Sanitize uploadId to prevent path traversal
    const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
    const chunkDir = join(tmpdir(), 'crm-chunks', safeUploadId);
    await mkdir(chunkDir, { recursive: true });

    const buffer = Buffer.from(await chunk.arrayBuffer());
    const chunkPath = join(chunkDir, `chunk_${chunkIndex.padStart(5, '0')}`);
    await writeFile(chunkPath, buffer);

    return NextResponse.json({ success: true, chunkIndex: Number(chunkIndex) });
  } catch (error) {
    console.error('Chunk upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
