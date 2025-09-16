import { createContext } from '@/server/context'
import { appRouter } from '@/server/routers/_app'
import DashboardClient from './page.client'

export default async function DashboardPage() {
  const ctx = await createContext({})
  if (!ctx.user) {
    return (
      <DashboardClient initial={{ items: [], nextCursor: undefined }} />
    )
  }

  const caller = appRouter.createCaller(ctx)
  const initial = await caller.content.getAll({ limit: 20 })

  return (
    <DashboardClient initial={initial} />
  )
}