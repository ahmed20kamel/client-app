import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { updateCustomerSchema, getProbabilityFromStatus, calculateWeightedValue, LeadStatus } from '@/lib/validations/customer';
import { z } from 'zod';

// GET /api/customers/[id] - Get single customer
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

    const customer = await prisma.customer.findUnique({
      where: { id },
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
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            assignedTo: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check permission (scope-based)
    const canViewAll = await can(session.user.id, 'customer.view.all');
    const canViewOwn = await can(session.user.id, 'customer.view.own', customer);

    if (!canViewAll && !canViewOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: customer });
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/customers/[id] - Update customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check permission (scope-based)
    const canEditAll = await can(session.user.id, 'customer.edit.all');
    const canEditOwn = await can(session.user.id, 'customer.edit.own', existingCustomer);

    if (!canEditAll && !canEditOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCustomerSchema.parse(body);

    // Check if nationalId is being updated and if it already exists
    if (validatedData.nationalId && validatedData.nationalId !== existingCustomer.nationalId) {
      const nationalIdExists = await prisma.customer.findUnique({
        where: { nationalId: validatedData.nationalId },
      });

      if (nationalIdExists) {
        return NextResponse.json(
          { error: 'National ID already exists' },
          { status: 400 }
        );
      }
    }

    // Auto-calculate probability and weighted value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...validatedData };

    // If status changed, auto-update probability
    if (validatedData.status) {
      const newProbability = validatedData.probability ?? getProbabilityFromStatus(validatedData.status as LeadStatus);
      updateData.probability = newProbability;
      const estValue = validatedData.estimatedValue ?? existingCustomer.estimatedValue;
      updateData.weightedValue = calculateWeightedValue(estValue, newProbability);
    } else if (validatedData.estimatedValue !== undefined || validatedData.probability !== undefined) {
      // Recalculate weighted value if estimated value or probability changed
      const prob = validatedData.probability ?? existingCustomer.probability;
      const estVal = validatedData.estimatedValue ?? existingCustomer.estimatedValue;
      updateData.weightedValue = calculateWeightedValue(estVal, prob);
    }

    // Handle date fields
    if (validatedData.lastFollowUp !== undefined) {
      updateData.lastFollowUp = validatedData.lastFollowUp ? new Date(validatedData.lastFollowUp) : null;
    }
    if (validatedData.nextFollowUp !== undefined) {
      updateData.nextFollowUp = validatedData.nextFollowUp ? new Date(validatedData.nextFollowUp) : null;
    }

    // Handle empty string → null for optional string fields
    if (validatedData.email === '') updateData.email = null;
    if (validatedData.city === '') updateData.city = null;
    if (validatedData.area === '') updateData.area = null;
    if (validatedData.basin === '') updateData.basin = null;
    if (validatedData.consultantContactPerson === '') updateData.consultantContactPerson = null;
    if (validatedData.consultantPhone === '' || validatedData.consultantPhone === '+971') updateData.consultantPhone = null;

    // Update customer
    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
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
    await logAudit({
      actorUserId: session.user.id,
      action: 'customer.updated',
      entityType: 'Customer',
      entityId: id,
      before: {
        fullName: existingCustomer.fullName,
        phone: existingCustomer.phone,
        customerType: existingCustomer.customerType,
        status: existingCustomer.status,
      },
      after: {
        fullName: customer.fullName,
        phone: customer.phone,
        customerType: customer.customerType,
        status: customer.status,
      },
    });

    return NextResponse.json({ data: customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Update customer error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message.includes('Unknown arg') ? 'Please restart the server to apply database changes' : 'Failed to update customer. Please try again.' },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Soft delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check permission
    const hasPermission = await can(session.user.id, 'customer.delete.all');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete customer
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log audit
    await logAudit({
      actorUserId: session.user.id,
      action: 'customer.deleted',
      entityType: 'Customer',
      entityId: id,
      before: {
        fullName: customer.fullName,
        deletedAt: customer.deletedAt,
      },
      after: {
        fullName: customer.fullName,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
