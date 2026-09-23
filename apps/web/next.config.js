/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fishmaster/shared-types'],
  // Quick tunnels (trycloudflare.com) and phone-on-same-Wi-Fi can open the dev app.
  allowedDevOrigins: ['*.trycloudflare.com'],
  // Browser always calls same-origin /api and /uploads. Next rewrites those
  // to the API host (local in dev, Render on Vercel) so we avoid cross-origin
  // TypeNetworkError when Render free tier is cold-starting.
  async rewrites() {
    const api = (
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://127.0.0.1:3001'
    ).replace(/\/+$/, '');
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
      { source: '/uploads/:path*', destination: `${api}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
