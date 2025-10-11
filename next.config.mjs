/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "5000", pathname: "/**" },
    ],
  },
  transpilePackages: ["react-big-calendar"], // 👈 added this
};

export default nextConfig;
