'use client'

import { TagStack } from '@/entities/item/ui/tag-stack'
import { useAuth } from '@/shared/lib/auth-context'
import { Skeleton } from '@/shared/ui/skeleton'
import Link from 'next/link'

interface Props {
  initial: { tag: string; items: any[] }[]
}

export default function TagsClient({ initial }: Props) {
  const { session, loading } = useAuth()

  const tagsWithContent = initial
  const isLoading = loading && tagsWithContent.length === 0

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Теги</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-1/3 rounded-md" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!tagsWithContent || tagsWithContent.length === 0) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">Теги</h1>
        <p className="text-muted-foreground">У вас пока нет тегов. Добавьте их к своим записям.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-8">Теги</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-x-6 gap-y-12">
        {tagsWithContent.map(({ tag, items }) => (
          <Link key={tag} href={`/dashboard/tag/${encodeURIComponent(tag)}`} className="group">
            <h2 className="text-lg font-medium mb-3 capitalize group-hover:text-primary transition-colors">{tag}</h2>
            <TagStack items={items} session={session} />
          </Link>
        ))}
      </div>
    </div>
  )
}


