/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fishmaster/shared-types'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  },
};

if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    '[fishmaster/web] NEXT_PUBLIC_API_URL is not set — client will fall back to localhost:3001',
  );
}

module.exports = nextConfig;
