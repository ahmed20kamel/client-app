// This route is kept for backward compatibility.
// Authentication is now handled by Clerk.
// See /app/[locale]/(auth)/sign-in and /app/[locale]/(auth)/sign-up

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Authentication is handled by Clerk. Use /sign-in instead.' });
}

export async function POST() {
  return NextResponse.json({ message: 'Authentication is handled by Clerk. Use /sign-in instead.' });
}
