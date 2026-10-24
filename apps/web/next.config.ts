import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@vid-edi/ui', '@vid-edi/shared-types'],
};

export default nextConfig;
