import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { updateDepartmentSchema } from '@/lib/validations/escalation';
import { z } from 'zod';

// GET /api/departments/[id] - Get single department with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, nameAr: true } },
        manager: { select: { id: true, fullName: true, email: true } },
        children: { select: { id: true, name: true, nameAr: true } },
        users: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, jobTitle: true, status: true },
            },
          },
        },
        _count: { select: { users: true, tasks: true, internalTasks: true } },
      },
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json({ data: department });
  } catch (error) {
    console.error('Get department error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/departments/[id] - Update department
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await can(session.user.id, 'user.manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateDepartmentSchema.parse(body);

    // Prevent circular parent reference
    if (validatedData.parentId === id) {
      return NextResponse.json(
        { error: 'Department cannot be its own parent' },
        { status: 400 }
      );
    }

    // Check name uniqueness if changed
    if (validatedData.name && validatedData.name !== existing.name) {
      const nameExists = await prisma.department.findUnique({
        where: { name: validatedData.name },
      });
      if (nameExists) {
        return NextResponse.json(
          { error: 'Department name already exists' },
          { status: 400 }
        );
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: validatedData,
      include: {
        parent: { select: { id: true, name: true, nameAr: true } },
        manager: { select: { id: true, fullName: true } },
        _count: { select: { users: true, tasks: true } },
      },
    });

    await logAudit({
      actorUserId: session.user.id,
      action: 'department.updated',
      entityType: 'Department',
      entityId: id,
      before: { name: existing.name, managerId: existing.managerId, parentId: existing.parentId },
      after: { name: department.name, managerId: department.managerId, parentId: department.parentId },
    });

    return NextResponse.json({ data: department });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Update department error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/departments/[id] - Delete department
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await can(session.user.id, 'user.manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, tasks: true, children: true, internalTasks: true } },
      },
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Prevent deletion if department has members, tasks, or children
    if (department._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with assigned employees. Remove employees first.' },
        { status: 400 }
      );
    }

    if (department._count.tasks > 0 || department._count.internalTasks > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with assigned tasks. Remove tasks first.' },
        { status: 400 }
      );
    }

    if (department._count.children > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with sub-departments. Remove sub-departments first.' },
        { status: 400 }
      );
    }

    await prisma.department.delete({ where: { id } });

    await logAudit({
      actorUserId: session.user.id,
      action: 'department.deleted',
      entityType: 'Department',
      entityId: id,
      before: { name: department.name },
      after: null,
    });

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
