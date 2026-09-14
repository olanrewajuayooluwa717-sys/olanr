/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fishmaster/shared-types'],
  // Quick tunnels (trycloudflare.com) and phone-on-same-Wi-Fi can open the dev app.
  allowedDevOrigins: ['*.trycloudflare.com'],
  // Phone/tablet browsers must not call localhost. /api and /uploads are proxied
  // to the local API so sign-in stays on the same address.
  async rewrites() {
    // Vercel sets NEXT_PUBLIC_API_URL to the Render API. Do not proxy /api
    // to this machine — there is no API process on the Vercel host.
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    const api = process.env.API_INTERNAL_URL || 'http://127.0.0.1:3001';
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
      { source: '/uploads/:path*', destination: `${api}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
