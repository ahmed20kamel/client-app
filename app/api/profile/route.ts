import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { hash, compare } from 'bcryptjs';
import { z } from 'zod';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profiles');

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
}).refine(data => {
  if (data.newPassword && !data.currentPassword) return false;
  return true;
}, { message: 'Current password is required to set a new password' });

// GET /api/profile - Get current user's profile
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        roles: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
        departments: {
          where: { isPrimary: true },
          include: {
            department: { select: { id: true, name: true, nameAr: true } },
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...sanitizedUser } = user;

    return NextResponse.json({
      data: {
        ...sanitizedUser,
        role: user.roles[0]?.role || null,
        department: user.departments[0]?.department || null,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // Handle image upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('profileImage') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files allowed' }, { status: 400 });
      }

      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }

      const ext = path.extname(file.name) || '.jpg';
      const fileName = `${randomUUID()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));

      const profileImage = `/uploads/profiles/${fileName}`;

      const user = await prisma.user.update({
        where: { id: session.user.id },
        data: { profileImage },
      });

      return NextResponse.json({ data: { profileImage: user.profileImage } });
    }

    // Handle JSON update
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const updateData: Record<string, string> = {};

    if (validatedData.fullName) updateData.fullName = validatedData.fullName;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.jobTitle !== undefined) updateData.jobTitle = validatedData.jobTitle;

    // Handle password change
    if (validatedData.newPassword && validatedData.currentPassword) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { passwordHash: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isValid = await compare(validatedData.currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      updateData.passwordHash = await hash(validatedData.newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      include: {
        roles: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
        departments: {
          where: { isPrimary: true },
          include: {
            department: { select: { id: true, name: true, nameAr: true } },
          },
          take: 1,
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...sanitizedUser } = updatedUser;

    return NextResponse.json({
      data: {
        ...sanitizedUser,
        role: updatedUser.roles[0]?.role || null,
        department: updatedUser.departments[0]?.department || null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
