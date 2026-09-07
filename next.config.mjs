/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
    outputFileTracingIncludes: {
      "/api/docs/extract": [
        "./node_modules/@napi-rs/canvas/**/*",
        "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
        "./node_modules/pdfjs-dist/**/*",
      ],
    },
  },
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
