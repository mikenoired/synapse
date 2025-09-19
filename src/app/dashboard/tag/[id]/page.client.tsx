'use client'

import { AddContentDialog } from '@/features/add-content/ui/add-content-dialog'
import { ContentGrid } from '@/features/content-grid/content-grid'
import { trpc } from '@/shared/api/trpc'
import { useAuth } from '@/shared/lib/auth-context'
import { useDashboard } from '@/shared/lib/dashboard-context'
import { Content } from '@/shared/lib/schemas'
import { ContentModalManager } from '@/widgets/content-viewer/ui/content-modal-manager'
import { useRouter } from 'next/navigation'
import { DragEvent, useEffect, useRef, useState } from 'react'

interface Props {
  tagId: string
  tagTitle: string
  initial: { items: Content[]; nextCursor: string | undefined }
}

export default function TagClient({ tagId, tagTitle, initial }: Props) {
  const [selectedItem, setSelectedItem] = useState<Content | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { isAddDialogOpen, setAddDialogOpen, setPreloadedFiles } = useDashboard()
  const [dragActive, setDragActive] = useState(false)
  const dragCounter = useRef(0)
  const { user, loading, session } = useAuth()
  const router = useRouter()

  const {
    data: queryData,
    isLoading: contentLoading,
    refetch: refetchContent,
  } = trpc.content.getAll.useQuery({
    tagIds: [tagId],
    limit: 20,
  }, {
    enabled: !!user || initial.items.length > 0,
    retry: false,
    initialData: initial,
  })

  const content: Content[] = queryData?.items ?? []

  useEffect(() => {
    if (!loading && !user && !initial.items.length) router.push('/')
  }, [user, loading, router, initial.items.length])

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
      },
    })
  }

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragActive(true);
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragActive(false);
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      setPreloadedFiles(files);
      setAddDialogOpen(true);
    }
  }

  if (loading && initial.items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center pointer-events-none select-none">
          <div className="bg-white/90 rounded-xl px-8 py-6 text-2xl font-semibold shadow-xl border-2 border-primary animate-in fade-in-0">
            Отпустите изображения для загрузки
          </div>
        </div>
      )}
      <header className="flex items-center gap-2 px-6 py-4">
        <h1 className="text-2xl font-semibold capitalize">{tagTitle}</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <ContentGrid
          items={content}
          isLoading={contentLoading && content.length === 0}
          session={session}
          onContentChanged={handleContentChanged}
          onItemClick={handleItemClick}
          excludedTag={tagTitle}
        />
      </main>

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
      <AddContentDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onContentAdded={handleContentChanged}
        initialTags={[tagTitle]}
      />
    </div>
  )
}


