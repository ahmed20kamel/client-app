import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/quotations/renumber
// One-time migration: renumber existing quotations to SC-133-26 style
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const yy = new Date().getFullYear().toString().slice(-2);

  // Fetch all quotations ordered by creation date
  const quotations = await prisma.quotation.findMany({
    select: { id: true, quotationNumber: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const updates: { id: string; old: string; new: string }[] = [];
  let counter = 133;

  for (const q of quotations) {
    const newNumber = `SC-${counter}-${yy}`;
    updates.push({ id: q.id, old: q.quotationNumber, new: newNumber });
    counter++;
  }

  // Apply updates in a transaction
  await prisma.$transaction(
    updates.map((u) =>
      prisma.quotation.update({
        where: { id: u.id },
        data: { quotationNumber: u.new },
      })
    )
  );

  return NextResponse.json({ updated: updates });
}
