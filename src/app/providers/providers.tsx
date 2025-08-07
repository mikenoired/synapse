'use client'

import { trpc } from '@/shared/api/trpc'
import { AuthProvider, useAuth } from '@/shared/lib/auth-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { ThemeProvider } from 'next-themes'
import { ReactNode, useMemo, useState } from 'react'
import { Toaster } from 'react-hot-toast'

function getBaseUrl() {
  if (typeof window !== 'undefined') return ''
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

function TRPCProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 минут
        gcTime: 10 * 60 * 1000, // 10 минут (ранее cacheTime)
      },
    },
  }))

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
            headers() {
              return {
                authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
              }
            },
          }),
        ],
      }),
    [session?.access_token]
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
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
              className: 'bg-background border border-border text-foreground shadow-lg',
            }}
          />
        </ThemeProvider>
      </TRPCProvider>
    </AuthProvider>
  )
} 