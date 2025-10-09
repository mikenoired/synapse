import { createContext } from './context'
import { appRouter } from './routers/_app'

export async function getServerCaller() {
  const ctx = await createContext({})
  return appRouter.createCaller(ctx)
}
