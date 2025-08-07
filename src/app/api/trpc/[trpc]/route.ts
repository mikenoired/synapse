import { createContext } from '@/server/context'
import { appRouter } from '@/server/routers/_app'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { NextRequest } from 'next/server'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req: req as NextRequest }),
  })

export { handler as GET, handler as POST }
