import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { readFile, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const maxDuration = 120;

// POST /api/attachments/chunk/complete - Reassemble chunks and upload to Cloudinary
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      uploadId,
      totalChunks,
      customerId,
      tempSessionId,
      category,
      subcategory,
      originalName,
      fileSize,
      mimeType,
    } = body;

    if (!uploadId || !totalChunks || !category || !originalName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!customerId && !tempSessionId) {
      return NextResponse.json({ error: 'Customer ID or temp session ID required' }, { status: 400 });
    }

    const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
    const chunkDir = join(tmpdir(), 'crm-chunks', safeUploadId);

    // Read and sort all chunks
    const files = await readdir(chunkDir);
    files.sort(); // chunk_00000, chunk_00001, ...

    if (files.length !== totalChunks) {
      return NextResponse.json(
        { error: `Expected ${totalChunks} chunks, found ${files.length}` },
        { status: 400 }
      );
    }

    // Reassemble the file
    const chunks: Buffer[] = [];
    for (const file of files) {
      const chunkBuffer = await readFile(join(chunkDir, file));
      chunks.push(chunkBuffer);
    }
    const fullBuffer = Buffer.concat(chunks);

    // Upload to Cloudinary via server SDK (no size limit from Cloudinary API with server SDK)
    const { url, publicId } = await uploadToCloudinary(fullBuffer, originalName, 'crm/attachments');

    // Save attachment record
    const attachment = await prisma.attachment.create({
      data: {
        customerId: customerId || null,
        tempSessionId: tempSessionId || null,
        category,
        subcategory: subcategory || null,
        fileName: publicId,
        originalName,
        fileSize,
        mimeType,
        filePath: url,
        uploadedById: session.user.id,
      },
    });

    // Cleanup temp chunks
    await rm(chunkDir, { recursive: true, force: true }).catch(() => {});

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    console.error('Chunk complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
