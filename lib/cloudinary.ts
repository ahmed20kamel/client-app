import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  buffer: Buffer,
  originalName: string,
  folder: string = 'attachments'
): Promise<{ url: string; publicId: string }> {
  const mimeType = getMimeType(originalName);
  const publicId = `${Date.now()}-${originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}`;

  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const resourceType = isImage ? 'image' : isVideo ? 'video' : 'raw';

  // Use stream upload for large files (> 5MB) to avoid base64 memory issues
  if (buffer.length > 5 * 1024 * 1024) {
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: publicId,
          use_filename: false,
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error('Upload failed'));
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  // Small files: use base64 data URI (faster)
  const base64 = buffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: resourceType,
    public_id: publicId,
    use_filename: false,
    access_mode: 'public',
  });

  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  // Try all resource types since we don't store the type separately
  const types = ['image', 'video', 'raw'] as const;
  for (const resourceType of types) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      if (result.result === 'ok') return;
    } catch {
      // try next type
    }
  }
  console.warn('deleteFromCloudinary: could not delete', publicId);
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };
  return map[ext || ''] || 'application/octet-stream';
}
