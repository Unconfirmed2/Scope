import type { NextConfig } from 'next';

// Compute allowed origins for Next.js Server Actions when running locally or in GitHub Codespaces
const DEV_PORT = Number(process.env.PORT) || 3000;
const codespaceName = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
const codespaceOrigin = codespaceName
  ? `https://${codespaceName}-${DEV_PORT}.${forwardingDomain}`
  : undefined;

const allowedOrigins = [
  `http://localhost:${DEV_PORT}`,
  `http://127.0.0.1:${DEV_PORT}`,
  ...(codespaceOrigin ? [codespaceOrigin] : []),
  // Add the specific Codespace hostname for current error
  'https://cautious-telegram-r7g6q97wvx4cxq44-3000.app.github.dev',
];

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Enable Server Actions from allowed origins (fixes 500 in Codespaces/app.github.dev)
  experimental: {
    serverActions: {
      allowedOrigins: [
        `http://localhost:${DEV_PORT}`,
        `http://127.0.0.1:${DEV_PORT}`,
        `http://0.0.0.0:${DEV_PORT}`,
        ...(codespaceOrigin ? [codespaceOrigin] : []),
        'https://cautious-telegram-r7g6q97wvx4cxq44-3000.app.github.dev',
      ],
    },
  },
  // Add headers to handle CORS and MIME types in Codespaces
  ...(codespaceName && process.env.NODE_ENV === 'development' ? {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              value: codespaceOrigin || '*',
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET, POST, PUT, DELETE, OPTIONS',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'Content-Type, Authorization, x-forwarded-host, origin',
            },
          ],
        },
        {
          source: '/_next/static/chunks/(.*)\\.css',
          headers: [
            {
              key: 'Content-Type',
              value: 'text/css',
            },
          ],
        },
        {
          source: '/_next/static/chunks/(.*)\\.js',
          headers: [
            {
              key: 'Content-Type',
              value: 'application/javascript',
            },
          ],
        },
        {
          source: '/_next/static/(.*)\\.css',
          headers: [
            {
              key: 'Content-Type',
              value: 'text/css',
            },
          ],
        },
        {
          source: '/_next/static/(.*)\\.js',
          headers: [
            {
              key: 'Content-Type',
              value: 'application/javascript',
            },
          ],
        },
      ];
    },
  } : {}),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;