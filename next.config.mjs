/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/advisor", destination: "/start", permanent: false },
      { source: "/intake", destination: "/start", permanent: false },
      { source: "/intake/:path*", destination: "/start", permanent: false },
      { source: "/products", destination: "/start", permanent: false },
      { source: "/products/:path*", destination: "/start", permanent: false },
    ];
  },
};

export default nextConfig;
