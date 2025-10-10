'use server'

import { Suspense } from 'react'
import { ItemSkeleton } from '@/entities/item/ui/skeleton'
import { ContentFilterSkeleton } from '@/features/content-filter/skeleton'
import { getServerCaller } from '@/server/getServerCaller'
import DashboardClient from './page.client'

function DashboardContentSkeleton() {
  return (
    <div
      className="flex flex-col h-full relative"
    >
      <ContentFilterSkeleton />
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <ItemSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const caller = await getServerCaller()
  const initial = await caller.content.getAll({
    limit: 12,
  })
  return (
    <Suspense fallback={<DashboardContentSkeleton />}>
      <DashboardClient initial={initial} />
    </Suspense>
  )
}
