import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const securityHeaders = [
  // Prevent clickjacking — no embedding in iframes
  { key: 'X-Frame-Options', value: 'DENY' },
  // Block MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy — don't leak URL path to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HSTS — force HTTPS for 2 years (only active in production)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Disable browser features not used by the app
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Content Security Policy — allow Next.js + Tailwind inline styles + Cloudinary images
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // Next.js requires unsafe-inline/eval
      "style-src 'self' 'unsafe-inline'",                   // Tailwind inline styles
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com",
      "font-src 'self' data:",
      "connect-src 'self' wss: https://soketi.app https://*.pusher.com https://*.pusherapp.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    serverActions: {
      // Reduced from 100mb — uploads go through /api/upload (10mb limit there)
      bodySizeLimit: '5mb',
    },
  },
};

export default withNextIntl(nextConfig);
