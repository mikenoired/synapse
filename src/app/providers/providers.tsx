'use client'

import { trpc } from '@/shared/api/trpc'
import { AuthProvider, useAuth } from '@/shared/lib/auth-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { ThemeProvider } from 'next-themes'
import { useMemo, useState } from 'react'
import { Toaster } from 'react-hot-toast'

function getBaseUrl() {
  if (typeof window !== 'undefined') return ''
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [queryClient] = useState(() => new QueryClient())

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
            headers() {
              console.log('Получаем headers, session:', session?.access_token ? 'есть' : 'нет')
              return {
                authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
              }
            },
          }),
        ],
      }),
    [session?.access_token] // Пересоздаем клиент при изменении токена
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TRPCProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </ThemeProvider>
      </TRPCProvider>
    </AuthProvider>
  )
} 