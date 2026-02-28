import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPusher } from '@/lib/pusher-server';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pusher = getPusher();
  if (!pusher) {
    return NextResponse.json({ error: 'Pusher not configured' }, { status: 503 });
  }

  const formData = await request.formData();
  const socketId = formData.get('socket_id') as string;
  const channel = formData.get('channel_name') as string;

  // Validate channel access
  const userId = session.user.id;
  const userRole = session.user.role;

  // Users can only subscribe to their own private channel
  if (channel === `private-user-${userId}`) {
    const authResponse = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  }

  // Only admins can subscribe to admin channel
  if (channel === 'private-admin' && userRole === 'Admin') {
    const authResponse = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
