import type { NextConfig } from 'next';

const backend = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:8080'
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@twilio/voice-sdk'],
  async rewrites() {
    return [{ source: '/backend/:path*', destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
