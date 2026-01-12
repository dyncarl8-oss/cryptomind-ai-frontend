import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@livekit/components-react', '@livekit/components-core'],
};

export default nextConfig;
