import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claudio — Inteligência de Campanha 360°",
  description: "Plataforma SaaS de inteligência de campanha para operações de direct response",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
