// src/app/layout.tsx
import type { Metadata } from "next";
// Corrected imports for Geist font
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import Header from "@/components/Header";

// Corrected variable assignments
const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: "AniSongs - Plataforma de Músicas de Anime",
  description: "Descubra, ouça, avalie e organize as melhores músicas de animes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}