'use client'

import { trpc } from '@/shared/api/trpc'
import { AuthProvider, useAuth } from '@/shared/lib/auth-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@/server/routers/_app'
import superjson from 'superjson'
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
        staleTime: 60 * 1000, // 1 minute for better performance
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
        retry: 1, // Reduce retries for faster failure
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      mutations: {
        retry: 1,
      },
    },
  }))

  const trpcClient = useMemo(
    () =>
      createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
            transformer: superjson,
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