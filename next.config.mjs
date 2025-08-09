// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's4.anilist.co', // Domínio principal para as imagens da API
      },
      {
        protocol: 'https',
        hostname: 'pub-92474f7785774e91a790e086dfa6b2ef.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Added for Google user avatars
      },
      // Se no futuro aparecerem imagens de outros domínios, é só adicionar aqui
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Suppress Supabase realtime warnings in development
    if (dev && !isServer) {
      config.ignoreWarnings = [
        { module: /node_modules\/@supabase\/realtime-js/ },
        /Critical dependency: the request of a dependency is an expression/,
      ];
    }
    return config;
  },
  // Improve development experience
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@supabase/ssr'],
  },
};

export default nextConfig;