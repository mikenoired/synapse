'use client'

import { AddContentDialog } from '@/features/add-content/ui/add-content-dialog'
import { ContentGrid } from '@/features/content-grid/content-grid'
import { trpc } from '@/shared/api/trpc'
import { useAuth } from '@/shared/lib/auth-context'
import { useDashboard } from '@/shared/lib/dashboard-context'
import { Content } from '@/shared/lib/schemas'
import { ContentModalManager } from '@/widgets/content-viewer/ui/content-modal-manager'
import { Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function TagPage({ params }: { params: { tag: string } }) {
  const { tag: encodedTag } = params
  const decodedTag = decodeURIComponent(encodedTag)
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
    tags: [decodedTag],
  }, {
    enabled: !!user && !loading,
    retry: false,
  })

  const content: Content[] = queryData?.items ?? []

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
      },
    })
  }

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragActive(true);
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragActive(false);
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }
  const handleDrop = (e: React.DragEvent) => {
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
        <Tag className="size-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold capitalize">{decodedTag}</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <ContentGrid
          items={content}
          isLoading={contentLoading}
          session={session}
          onContentChanged={handleContentChanged}
          onItemClick={handleItemClick}
          excludedTag={decodedTag}
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
        initialTags={[decodedTag]}
      />
    </div>
  )
} 