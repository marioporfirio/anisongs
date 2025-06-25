// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's4.anilist.co', // Domínio principal para as imagens da API
      },
      // Se no futuro aparecerem imagens de outros domínios, é só adicionar aqui
    ],
  },
};

export default nextConfig;