import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Clerk webhook handler for user sync
// Configure this webhook URL in Clerk Dashboard: https://your-domain.com/api/webhooks/clerk
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { type, data } = payload;

    switch (type) {
      case 'user.created': {
        const email = data.email_addresses?.[0]?.email_address;
        if (!email) break;

        // Check if user already exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          // Link existing user to Clerk
          await prisma.user.update({
            where: { email },
            data: { clerkId: data.id },
          });
        } else {
          // Create new user
          const employeeRole = await prisma.role.findUnique({
            where: { name: 'Employee' },
          });

          await prisma.user.create({
            data: {
              clerkId: data.id,
              email,
              fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || email,
              roles: employeeRole
                ? { create: { roleId: employeeRole.id } }
                : undefined,
            },
          });
        }
        break;
      }

      case 'user.updated': {
        const email = data.email_addresses?.[0]?.email_address;
        if (!email) break;

        const user = await prisma.user.findUnique({
          where: { clerkId: data.id },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || user.fullName,
              email,
            },
          });
        }
        break;
      }

      case 'user.deleted': {
        const user = await prisma.user.findUnique({
          where: { clerkId: data.id },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { status: 'DISABLED' },
          });
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
