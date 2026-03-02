/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin', '@supabase/supabase-js', 'firebase'],
  }
};

export default nextConfig;
