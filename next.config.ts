import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@twilio/voice-sdk'],
};

export default nextConfig;
