import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { updateUserSchema } from '@/lib/validations/user';
import { hash } from 'bcryptjs';
import { z } from 'zod';

// GET /api/users/[id] - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await can(session.user.id, 'user.manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove passwordHash from response
    const { passwordHash, ...sanitizedUser } = user;

    return NextResponse.json({
      data: {
        ...sanitizedUser,
        role: user.roles[0]?.role || null,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await can(session.user.id, 'user.manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if email is being updated and if it already exists
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.fullName) updateData.fullName = validatedData.fullName;
    if (validatedData.jobTitle !== undefined) updateData.jobTitle = validatedData.jobTitle;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.status) updateData.status = validatedData.status;

    // Hash password if provided
    if (validatedData.password) {
      updateData.passwordHash = await hash(validatedData.password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Update role if provided
    if (validatedData.roleId && validatedData.roleId !== existingUser.roles[0]?.roleId) {
      // Delete old role assignment
      await prisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Create new role assignment
      await prisma.userRole.create({
        data: {
          userId: id,
          roleId: validatedData.roleId,
        },
      });

      // Fetch updated user with new role
      const updatedUser = await prisma.user.findUnique({
        where: { id },
        include: {
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (updatedUser) {
        const { passwordHash, ...sanitizedUser } = updatedUser;

        // Log audit
        await logAudit({
          actorUserId: session.user.id,
          action: 'user.updated',
          entityType: 'User',
          entityId: id,
          before: {
            email: existingUser.email,
            fullName: existingUser.fullName,
            status: existingUser.status,
            role: existingUser.roles[0]?.role.name,
          },
          after: {
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            status: updatedUser.status,
            role: updatedUser.roles[0]?.role.name,
          },
        });

        return NextResponse.json({
          data: {
            ...sanitizedUser,
            role: updatedUser.roles[0]?.role || null,
          },
        });
      }
    }

    // Remove passwordHash from response
    const { passwordHash, ...sanitizedUser } = user;

    // Log audit
    await logAudit({
      actorUserId: session.user.id,
      action: 'user.updated',
      entityType: 'User',
      entityId: id,
      before: {
        email: existingUser.email,
        fullName: existingUser.fullName,
        status: existingUser.status,
        role: existingUser.roles[0]?.role.name,
      },
      after: {
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        role: user.roles[0]?.role.name,
      },
    });

    return NextResponse.json({
      data: {
        ...sanitizedUser,
        role: user.roles[0]?.role || null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Disable user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await can(session.user.id, 'user.manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot disable your own account' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Disable user
    await prisma.user.update({
      where: { id },
      data: { status: 'DISABLED' },
    });

    // Log audit
    await logAudit({
      actorUserId: session.user.id,
      action: 'user.disabled',
      entityType: 'User',
      entityId: id,
      before: { status: user.status },
      after: { status: 'DISABLED' },
    });

    return NextResponse.json({
      message: 'User disabled successfully',
    });
  } catch (error) {
    console.error('Disable user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
