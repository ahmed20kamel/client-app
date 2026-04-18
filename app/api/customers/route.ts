import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { createCustomerSchema, getProbabilityFromStatus, calculateWeightedValue, LeadStatus } from '@/lib/validations/customer';
import { z } from 'zod';

// GET /api/customers - List customers with filters, pagination, and scope
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const canViewAll = await can(session.user.id, 'customer.view.all');
    // Any authenticated user can view customers (own or all based on role)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const customerType = searchParams.get('customerType') || '';
    const status = searchParams.get('status') || '';
    const ownerId = searchParams.get('ownerId') || '';
    const showDeleted = searchParams.get('showDeleted') === 'true';
    const emirate = searchParams.get('emirate') || '';
    const leadSource = searchParams.get('leadSource') || '';
    const projectType = searchParams.get('projectType') || '';
    const productType = searchParams.get('productType') || '';

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Scope-based filtering
    if (!canViewAll) {
      where.ownerId = session.user.id;
    }

    // Soft delete filter
    if (showDeleted && canViewAll) {
      // Show all including deleted (Admin only)
    } else {
      where.deletedAt = null;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { fullNameAr: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { nationalId: { contains: search } },
        { company: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (customerType) {
      where.customerType = customerType;
    }

    if (status) {
      where.status = status;
    }

    if (ownerId && canViewAll) {
      where.ownerId = ownerId;
    }

    if (emirate) {
      where.emirate = emirate;
    }

    if (leadSource) {
      where.leadSource = leadSource;
    }

    if (projectType) {
      where.projectType = projectType;
    }

    if (productType) {
      where.productType = productType;
    }

    // Get total count
    const total = await prisma.customer.count({ where });

    // Get customers
    const customers = await prisma.customer.findMany({
      where,
      include: {
        owner: {
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
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await can(session.user.id, 'customer.create');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCustomerSchema.parse(body);

    // If ownerId is not provided or user is not Admin, assign to current user
    const canAssignOwner = await can(session.user.id, 'customer.assign-owner');
    const ownerId = (validatedData.ownerId && canAssignOwner)
      ? validatedData.ownerId
      : session.user.id;

    // Check if nationalId already exists (if provided)
    if (validatedData.nationalId) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { nationalId: validatedData.nationalId },
      });

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'National ID already exists' },
          { status: 400 }
        );
      }
    }

    // Auto-calculate probability from status
    const statusValue = (validatedData.status || 'NEW_INQUIRY') as LeadStatus;
    const probability = validatedData.probability ?? getProbabilityFromStatus(statusValue);
    const weightedValue = calculateWeightedValue(validatedData.estimatedValue, probability);

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        fullName: validatedData.fullName,
        fullNameAr: validatedData.fullNameAr || null,
        nationalId: validatedData.nationalId || null,
        phone: validatedData.phone && validatedData.phone !== '+971' ? validatedData.phone : null,
        email: validatedData.email || null,
        company: validatedData.company || null,
        contactPerson: validatedData.contactPerson || null,
        customerType: validatedData.customerType || 'NEW',
        status: statusValue,
        emirate: validatedData.emirate || null,
        city: validatedData.city || null,
        area: validatedData.area || null,
        basin: validatedData.basin || null,
        projectType: validatedData.projectType || null,
        productType: validatedData.productType || null,
        leadSource: validatedData.leadSource || null,
        estimatedValue: validatedData.estimatedValue ?? null,
        probability,
        weightedValue,
        consultant: validatedData.consultant || null,
        consultantContactPerson: validatedData.consultantContactPerson || null,
        consultantPhone: validatedData.consultantPhone && validatedData.consultantPhone !== '+971' ? validatedData.consultantPhone : null,
        paymentTerms: validatedData.paymentTerms || null,
        projectSize: validatedData.projectSize ?? null,
        notes: validatedData.notes,
        lastFollowUp: validatedData.lastFollowUp ? new Date(validatedData.lastFollowUp) : null,
        nextFollowUp: validatedData.nextFollowUp ? new Date(validatedData.nextFollowUp) : null,
        ownerId,
        createdById: session.user.id,
      },
      include: {
        owner: {
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

    // Log audit
    logAudit({
      actorUserId: session.user.id,
      action: 'customer.created',
      entityType: 'Customer',
      entityId: customer.id,
      after: {
        fullName: customer.fullName,
        phone: customer.phone,
        customerType: customer.customerType,
        owner: customer.owner.fullName,
      },
    }).catch((err) => console.error("Audit log error:", err));

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Create customer error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer. Please try again.' },
      { status: 500 }
    );
  }
}
