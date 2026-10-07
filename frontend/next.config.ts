import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Pins the workspace root to this folder. Without it, Next.js walks up
  // looking for a lockfile to guess the root and can land on an unrelated
  // one outside the project (e.g. a stray package-lock.json in a home dir),
  // which then throws off file tracing for dev (Turbopack) and prod builds.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
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
