import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

function resolveTurbopackRoot(): string {
  const env = process.env.NEXT_TURBOPACK_ROOT;
  if (env && existsSync(env)) return env;
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = join(dir, '..');
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

const turbopackRoot = resolveTurbopackRoot();

function requiredOrigin(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  const url = new URL(value);
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function convexConnectSources() {
  const rawUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!rawUrl) return [];

  try {
    const url = new URL(rawUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return [url.origin, `${wsProtocol}//${url.host}`];
  } catch {
    return [];
  }
}

const connectSrc = [
  "'self'",
  requiredOrigin('TELEGRAM_API_ORIGIN'),
  ...convexConnectSources(),
].join(' ');

// CSP tuned for TaskLabs: no third-party scripts, Telegram bot link is the
// only outbound destination outside same-origin. Inline styles are required
// by Next.js streaming + shadcn (next/font emits inline <style>).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isProd ? '' : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  ...{ turbopack: { root: turbopackRoot } },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ];
    if (isProd) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }
    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
