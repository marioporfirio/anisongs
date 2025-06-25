// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // NOME CORRIGIDO AQUI
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({ // NOME CORRIGIDO AQUI
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnimeMusic - Plataforma de Músicas de Anime",
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