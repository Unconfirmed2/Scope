'use server';

import { NextResponse } from 'next/server';

// Placeholder to satisfy Next.js type generation when NextAuth is not configured.
// Returns a 501 for both GET and POST requests.
export async function GET() {
	return new NextResponse('NextAuth is disabled in this build.', { status: 501 });
}

export async function POST() {
	return new NextResponse('NextAuth is disabled in this build.', { status: 501 });
}

