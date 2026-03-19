import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@/lib/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PRESET_NAME = 'crm_public_upload';

// Ensure the unsigned upload preset exists
async function ensurePreset() {
  try {
    await cloudinary.api.upload_preset(PRESET_NAME);
  } catch {
    // Preset doesn't exist, create it
    await cloudinary.api.create_upload_preset({
      name: PRESET_NAME,
      unsigned: true,
      folder: 'crm/attachments',
    });
  }
}

// GET /api/attachments/sign - Return cloud name and upload preset for unsigned upload
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensurePreset();

    return NextResponse.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadPreset: PRESET_NAME,
    });
  } catch (error) {
    console.error('Sign upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
