import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const projects = await prisma.payrollProject.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search ? {
          OR: [
            { projectName: { contains: search, mode: 'insensitive' } },
            { projectCode: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { projectCode: 'asc' },
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    logError('Get payroll projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { projectCode, projectName, location, completionPct, contractValue, consultant, status, revenue, retention, notes } = body;

    if (!projectCode || !projectName) {
      return NextResponse.json({ error: 'projectCode and projectName are required' }, { status: 400 });
    }

    const project = await prisma.payrollProject.create({
      data: {
        projectCode, projectName,
        location:      location      || null,
        completionPct: completionPct ?? 0,
        contractValue: contractValue ?? null,
        consultant:    consultant    || null,
        status:        status        || 'ONGOING',
        revenue:       revenue       ?? null,
        retention:     retention     ?? null,
        notes:         notes         || null,
      },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Project code already exists' }, { status: 409 });
    }
    logError('Create payroll project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
