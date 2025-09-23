import { Providers } from "@/app/providers";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import { WebVitals } from "@/shared/lib/webvitals";
import { PerformanceMonitor } from "@/shared/lib/performance-monitor";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  title: "Synapse - Ваш интерактивный мозг",
  description: "Современное приложение для хранения заметок, файлов и идей",
  keywords: "заметки, файлы, идеи, организация, productivity",
  authors: [{ name: "Mike Vetkal'" }],
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  other: {
    'resource-timing': 'navigation',
  }
};

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="http://localhost:9000" />
        <link rel="dns-prefetch" href="http://localhost:9000" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className}>
        <WebVitals />
        <PerformanceMonitor />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
