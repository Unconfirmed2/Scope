import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Align x-forwarded-host with the request Origin host to avoid Next.js
// Server Actions "Invalid request" errors when behind proxies/tunnels
// (e.g., Codespaces app.github.dev vs localhost previews).
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host');

  // Limit normalization to development environments
  if (process.env.NODE_ENV === 'development' && origin && forwardedHost) {
    try {
      const url = new URL(origin);
      if (url.host !== forwardedHost) {
        const headers = new Headers(request.headers);
        headers.set('x-forwarded-host', url.host);
        return NextResponse.next({ request: { headers } });
      }
    } catch {
      // If Origin is not a valid URL, skip modification
    }
  }

  return NextResponse.next();
}

// Skip Next internals for perf
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
