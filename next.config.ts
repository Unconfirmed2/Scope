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
  // Prevent bundling Node-only/optional deps; let Node resolve at runtime
  serverExternalPackages: [
    '@anthropic-ai/sdk',
    '@opentelemetry/api',
    '@opentelemetry/sdk-node',
    '@opentelemetry/resources',
    '@opentelemetry/semantic-conventions',
  ],
  // Fine-tune Webpack to avoid resolving optional packages that cause build errors
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {} as any;
    (config.resolve.alias as Record<string, any>) = {
      ...(config.resolve.alias || {}),
      // Optional/peer deps that shouldn't be bundled in Next
      '@opentelemetry/exporter-jaeger': false,
    };

    // Some packages reference Node built-ins; ensure they're not polyfilled on the client
    if (!isServer) {
      (config.resolve.fallback as Record<string, any>) = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
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