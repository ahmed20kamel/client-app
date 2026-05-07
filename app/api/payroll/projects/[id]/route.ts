import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const project = await prisma.payrollProject.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: project });
  } catch (error) {
    logError('Get payroll project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const project = await prisma.payrollProject.update({
      where: { id },
      data: {
        ...(body.projectCode   !== undefined ? { projectCode:   body.projectCode }   : {}),
        ...(body.projectName   !== undefined ? { projectName:   body.projectName }   : {}),
        ...(body.location      !== undefined ? { location:      body.location }      : {}),
        ...(body.completionPct !== undefined ? { completionPct: body.completionPct } : {}),
        ...(body.contractValue !== undefined ? { contractValue: body.contractValue } : {}),
        ...(body.consultant    !== undefined ? { consultant:    body.consultant }    : {}),
        ...(body.status        !== undefined ? { status:        body.status }        : {}),
        ...(body.revenue       !== undefined ? { revenue:       body.revenue }       : {}),
        ...(body.retention     !== undefined ? { retention:     body.retention }     : {}),
        ...(body.notes         !== undefined ? { notes:         body.notes }         : {}),
      },
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    logError('Update payroll project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.payrollProject.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    logError('Delete payroll project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
