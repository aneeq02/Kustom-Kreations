import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
  // One address for search engines: www.kustomkreations.online -> kustomkreations.online
  // (permanent 308, path and query kept). Without this Google indexes both as
  // separate sites, each with its own cached favicon and snippet.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.kustomkreations.online' }],
        destination: 'https://kustomkreations.online/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
