'use client'

import { AddContentDialog } from '@/features/add-content/ui/add-content-dialog'
import { ContentFilter } from '@/features/content-filter/content-filter'
import { ContentGrid } from '@/features/content-grid/content-grid'
import { trpc } from '@/shared/api/trpc'
import { useAuth } from '@/shared/lib/auth-context'
import { useDashboard } from '@/shared/lib/dashboard-context'
import { Content } from '@/shared/lib/schemas'
import { ContentModalManager } from '@/widgets/content-viewer/ui/content-modal-manager'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { isAddDialogOpen, setAddDialogOpen } = useDashboard()
  const [selectedItem, setSelectedItem] = useState<Content | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    data: pages,
    isLoading: contentLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchContent,
  } = trpc.content.getAll.useInfiniteQuery({
    search: searchQuery || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    limit: 20,
  }, {
    getNextPageParam: last => last.nextCursor,
    enabled: !!user && !loading,
    retry: false,
  })

  const content: Content[] = pages?.pages.flatMap(p => p.items) ?? []

  useEffect(() => {
    if (!searchParams) return
    const tagsFromUrl = searchParams.get('tags');
    if (tagsFromUrl) {
      setSelectedTags(tagsFromUrl.split(','));
    } else {
      setSelectedTags([]);
    }
  }, [searchParams]);


  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleContentChanged = () => refetchContent()

  const handleItemClick = (item: Content) => {
    setSelectedItem(item)
    setModalOpen(true)
  }

  const handleModalDelete = (id: string) => {
    trpc.content.delete.useMutation().mutate({ id }, {
      onSuccess: () => {
        handleContentChanged()
        setModalOpen(false)
      }
    })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTags([])
    router.push('/dashboard')
  }

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto p-6">
        <ContentFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <ContentGrid
          items={content}
          isLoading={contentLoading}
          session={session}
          onContentChanged={handleContentChanged}
          onItemClick={handleItemClick}
          searchQuery={searchQuery}
          selectedTags={selectedTags}
          onClearFilters={clearFilters}
          fetchNext={hasNextPage ? fetchNextPage : undefined}
          hasNext={hasNextPage}
          isFetchingNext={isFetchingNextPage}
        />
      </main>

      <AddContentDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onContentAdded={handleContentChanged}
      />
      <ContentModalManager
        open={modalOpen}
        onOpenChange={setModalOpen}
        item={selectedItem}
        allItems={content}
        session={session}
        onEdit={(id: string) => {
          router.push(`/edit/${id}`)
          setModalOpen(false)
        }}
        onDelete={handleModalDelete}
        onContentChanged={handleContentChanged}
      />
    </div>
  )
} 