import type { Metadata } from "next";
import "./globals.css";
import CatalogShell from './catalog-shell';

export const metadata: Metadata = {
  title: "CINE — Filmes e séries",
  description: "Descubra lançamentos e obras selecionadas, com elenco e trailers oficiais.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body className="antialiased"><CatalogShell>{children}</CatalogShell></body>
    </html>
  );
}
