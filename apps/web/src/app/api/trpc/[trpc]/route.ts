import type { NextRequest } from 'next/server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createContext } from '@/server/context'
import { appRouter } from '@/server/routers/_app'

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req: req as NextRequest }),
  })
}

export { handler as GET, handler as POST }
