import { Suspense } from 'react'
import { createContext } from '@/server/context'
import { getServerCaller } from '@/server/getServerCaller'
import { Skeleton } from '@/shared/ui/skeleton'
import DashboardClient from './page.client'

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-6">
        <Skeleton className="h-10 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

async function DashboardContent() {
  const ctx = await createContext({})
  if (!ctx.user) {
    return (
      <DashboardClient initial={{ items: [], nextCursor: undefined }} />
    )
  }

  const caller = await getServerCaller()
  const initial = await caller.content.getAll({ limit: 12 })

  return (
    <DashboardClient initial={initial} />
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
