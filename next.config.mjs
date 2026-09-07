const canvasTrace = [
  "./node_modules/@napi-rs/canvas/**/*",
  "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
  "./node_modules/pdfjs-dist/**/*",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
    outputFileTracingIncludes: {
      "/api/docs/extract": canvasTrace,
      "/app/api/docs/extract/route": canvasTrace,
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
