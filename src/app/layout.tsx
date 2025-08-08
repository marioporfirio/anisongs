// src/app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import Header from "@/components/Header";
import PageWrapper from "@/components/PageWrapper"; // Importa o wrapper

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <PageWrapper>{children}</PageWrapper> 
      </body>
    </html>
  );
}