export const BACKEND_MODE = process.env.NEXT_PUBLIC_BACKEND_MODE || 'local';
// 'local' (default) uses in-memory/localStorage only.
// Set to 'neon' to enable server-backed auth and storage (requires env setup).
