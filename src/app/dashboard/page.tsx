import { createContext } from '@/server/context'
import { getServerCaller } from '@/server/trpc'
import DashboardClient from './page.client'

export default async function DashboardPage() {
  const ctx = await createContext({})
  if (!ctx.user) {
    return (
      <DashboardClient initial={{ items: [], nextCursor: undefined }} />
    )
  }

  const caller = await getServerCaller()
  const initial = await caller.content.getAll({ limit: 20 })

  return (
    <DashboardClient initial={initial} />
  )
}