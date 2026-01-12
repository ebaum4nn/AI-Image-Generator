/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force dynamic rendering for development
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
};

module.exports = nextConfig;