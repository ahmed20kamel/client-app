import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { createTaskSchema } from '@/lib/validations/task';
import { createTaskAssignedNotification } from '@/lib/notifications';
import { z } from 'zod';

// GET /api/tasks - List tasks with filters and scope
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const customerId = searchParams.get('customerId') || '';
    const assignedToId = searchParams.get('assignedToId') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const escalationLevel = searchParams.get('escalationLevel');

    // Check permissions
    const canViewAll = await can(session.user.id, 'task.view.all');
    const hasPageAccess = (session.user.pagePermissions ?? []).includes('page.tasks');

    // Build where clause
    const where: Record<string, unknown> = {};

    // Scope-based filtering — page access shows only assigned tasks
    if (!canViewAll) {
      where.assignedToId = session.user.id;
    }

    // Filters
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (assignedToId && canViewAll) {
      where.assignedToId = assignedToId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (escalationLevel !== null && escalationLevel !== undefined && escalationLevel !== '') {
      where.escalationLevel = parseInt(escalationLevel);
    }

    // Get tasks with pagination
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              color: true,
              icon: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: [{ escalationLevel: 'desc' }, { status: 'asc' }, { dueAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await can(session.user.id, 'task.create');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Check if customer exists and user has access
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if user can access this customer
    const canViewAll = await can(session.user.id, 'customer.view.all');
    if (!canViewAll && customer.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if assigned user exists
    const assignedUser = await prisma.user.findUnique({
      where: { id: validatedData.assignedToId },
    });

    if (!assignedUser) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 404 }
      );
    }

    // Determine status based on due date
    const dueDate = new Date(validatedData.dueAt);
    const now = new Date();
    const initialStatus = dueDate < now ? 'OVERDUE' : validatedData.status;

    // Create task
    const task = await prisma.task.create({
      data: {
        ...validatedData,
        dueAt: dueDate,
        status: initialStatus,
        createdById: session.user.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Audit log — fire and forget
    logAudit({
      actorUserId: session.user.id,
      action: 'task.created',
      entityType: 'Task',
      entityId: task.id,
      before: null,
      after: {
        title: task.title,
        customerId: task.customerId,
        assignedToId: task.assignedToId,
        status: task.status,
      },
    }).catch((err) => console.error('Audit log error:', err));

    // Send notification to assigned user — fire and forget
    if (task.assignedToId !== session.user.id) {
      createTaskAssignedNotification(
        task.assignedToId,
        task.title,
        task.id,
        'en'
      ).catch((err) => console.error('Notification error:', err));
    }

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
