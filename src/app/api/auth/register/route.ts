'use server';

import { NextResponse } from 'next/server';

const MODE = process.env.BACKEND_MODE || process.env.NEXT_PUBLIC_BACKEND_MODE || 'local';

export async function POST() {
  if (MODE !== 'neon') return new NextResponse('Auth disabled (mode=local)', { status: 501 });
  return new NextResponse('Not implemented yet: Neon + NextAuth/Prisma registration', { status: 501 });
}
