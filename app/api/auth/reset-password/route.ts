import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { resetPasswordLimiter } from '@/lib/rate-limit';

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
    try {
      await resetPasswordLimiter.check(5, identifier);
    } catch {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Find token
    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists
    if (!passwordResetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (passwordResetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (passwordResetToken.usedAt) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hash(password, 10);

    // Atomically mark token as used — updateMany with usedAt: null guard prevents
    // double-use in a race condition; if count=0 someone else already consumed it.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.passwordResetToken.updateMany({
        where: { id: passwordResetToken.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (result.count === 0) return null;
      await tx.user.update({
        where: { id: passwordResetToken.userId },
        data: { passwordHash },
      });
      return result;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Password reset successful',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    logError('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
