import { NextResponse } from 'next/server';

// Login is handled by NextAuth's [...nextauth] route via the Credentials provider.
// This route exists only for backwards compatibility.
export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/auth/signin for authentication' },
    { status: 308 }
  );
}
