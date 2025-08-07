'use client'

import Item from "@/entities/item/ui/item"
import { trpc } from '@/shared/api/trpc'
import { useAuth } from '@/shared/lib/auth-context'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { notFound, useRouter } from 'next/navigation'
import { use, useEffect } from 'react'

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const { data: item, isLoading, error } = trpc.content.getById.useQuery(
    { id },
    { enabled: !!id && !!user && !loading, retry: false }
  )

  useEffect(() => {
    if ((!loading && !user) || error) {
      router.push('/dashboard')
    }
  }, [user, loading, router, error])

  if (isLoading || loading) {
    return (
      <div className="p-4">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    )
  }

  if (!item) return notFound()

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => router.back()} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <Item item={item} session={session} index={0} />
    </div>
  )
} 