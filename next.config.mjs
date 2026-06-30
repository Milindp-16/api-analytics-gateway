/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["geoip-lite", "socket.io"],
};

export default nextConfig;
