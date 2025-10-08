import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import localFont from 'next/font/local'
import { Providers } from '@/app/providers'
import { PerformanceMonitor } from '@/shared/lib/performance-monitor'
import { WebVitals } from '@/shared/lib/webvitals'
import './globals.css'

const nonBureau = localFont({
  src: [
    {
      path: 'fonts/NonBureau-Black.woff2',
      weight: '900',
    },
    {
      path: 'fonts/NonBureau-BlackItalic.woff2',
      weight: '900',
      style: 'italic',
    },
    {
      path: 'fonts/NonBureau-Bold.woff2',
      weight: '700',
    },
    {
      path: 'fonts/NonBureau-BoldItalic.woff2',
      weight: '700',
      style: 'italic',
    },
    {
      path: 'fonts/NonBureau-Light.woff2',
      weight: '300',
    },
    {
      path: 'fonts/NonBureau-LightItalic.woff2',
      weight: '300',
      style: 'italic',
    },
    {
      path: 'fonts/NonBureau-Medium.woff2',
      weight: '500',
    },
    {
      path: 'fonts/NonBureau-MediumItalic.woff2',
      weight: '500',
      style: 'italic',
    },
    {
      path: 'fonts/NonBureau-Regular.woff2',
      weight: '400',
    },
    {
      path: 'fonts/NonBureau-RegularItalic.woff2',
      weight: '400',
      style: 'italic',
    },
    {
      path: 'fonts/NonBureau-SemiBold.woff2',
      weight: '600',
    },
    {
      path: 'fonts/NonBureau-SemiBoldItalic.woff2',
      weight: '600',
      style: 'italic',
    },
    {
      path: 'fonts/NonBureau-Thin.woff2',
      weight: '200',
    },
    {
      path: 'fonts/NonBureau-ThinItalic.woff2',
      weight: '200',
      style: 'italic',
    },
  ],
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
      <body className={nonBureau.className}>
        <WebVitals />
        <PerformanceMonitor />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
