'use client'

import { trpc } from '@/shared/api/trpc'
import { Skeleton } from '@/shared/ui/skeleton'

export default function GeneralTab() {
  const { data: user, isLoading } = trpc.user.getUser.useQuery()

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 bg-muted">
        <h2 className="text-2xl font-semibold mb-4">Main info</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Email</label>
            <Skeleton className="h-5 w-1/2" />
          </div>
          <div>
            <label className="block mb-1 font-medium">Thinking</label>
            <Skeleton className="h-5 w-1/3 mt-1" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-muted">
      <h2 className="text-2xl font-semibold mb-4">Main info</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <span>{user?.email}</span>
        </div>
        <div>
          <label className="block mb-1 font-medium">
            Thinking
            {' '}
            {new Date(user?.createdAt || '').toLocaleDateString()}
          </label>
        </div>
      </div>
    </div>
  )
}
