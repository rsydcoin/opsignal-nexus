/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Next.js Image component to load coin logos from CoinGecko CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
