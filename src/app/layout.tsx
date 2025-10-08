import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { Providers } from '@/app/providers'
import { PerformanceMonitor } from '@/shared/lib/performance-monitor'
import { WebVitals } from '@/shared/lib/webvitals'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
})

export const metadata: Metadata = {
  title: 'Synapse - Ваш интерактивный мозг',
  description: 'Современное приложение для хранения заметок, файлов и идей',
  keywords: 'заметки, файлы, идеи, организация, productivity',
  authors: [{ name: 'Mike Vetkal\'' }],
  other: {
    'resource-timing': 'navigation',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'contain',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'development' && (
        <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
        )}
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
  )
}
