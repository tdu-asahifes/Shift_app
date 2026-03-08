/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// next-pwa は Next.js 15 と互換性の問題があるため
// @ducanh2912/next-pwa に切り替え
try {
  const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  });
  module.exports = withPWA(nextConfig);
} catch {
  // PWAパッケージ未インストール時はそのまま動作
  module.exports = nextConfig;
}
