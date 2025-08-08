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
import { DragEvent, useEffect, useRef, useState } from 'react'

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { isAddDialogOpen, setAddDialogOpen, setPreloadedFiles } = useDashboard()
  const [selectedItem, setSelectedItem] = useState<Content | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dragActive, setDragActive] = useState(false)
  const dragCounter = useRef(0)

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

  useEffect(() => {
    const handleWindowDragEnter = (e: Event) => {
      const event = e as unknown as DragEvent;
      event.preventDefault();
      event.stopPropagation();
      dragCounter.current++;
      setDragActive(true);
    };
    const handleWindowDragLeave = (e: Event) => {
      const event = e as unknown as DragEvent;
      event.preventDefault();
      event.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current === 0) setDragActive(false);
    };
    const handleWindowDragOver = (e: Event) => {
      const event = e as unknown as DragEvent;
      event.preventDefault();
      event.stopPropagation();
    };
    const handleWindowDrop = (e: Event) => {
      const event = e as unknown as DragEvent;
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      dragCounter.current = 0;
      const files = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
      if (files.length > 0) {
        setPreloadedFiles(files);
        setAddDialogOpen(true);
      }
    };
    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [setAddDialogOpen, setPreloadedFiles]);

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
    <div
      className="flex flex-col h-full relative"
    >
      {dragActive && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex flex-col items-center justify-center pointer-events-auto select-none transition-all animate-in fade-in-0"
          style={{ backdropFilter: 'blur(2px)' }}>
          <div className="flex flex-col items-center gap-4">
            <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-primary animate-bounce">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V6m0 0l-5 5m5-5l5 5" />
            </svg>
            <div className="bg-white/90 rounded-xl px-8 py-6 text-2xl font-semibold shadow-xl border-2 border-primary animate-in fade-in-0 text-center">
              Отпустите файлы для загрузки
              <div className="text-base font-normal mt-2 text-muted-foreground">Поддерживаются изображения и видео</div>
            </div>
          </div>
        </div>
      )}
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