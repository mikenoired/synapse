'use client'

import { AddContentDialog } from '@/components/add-content-dialog'
import { ContentFilter } from '@/features/content-filter/ui/content-filter'
import { ContentGrid } from '@/features/content-grid/ui/content-grid'
import { useAuth } from '@/lib/auth-context'
import { useDashboard } from '@/lib/dashboard-context'
import { Content } from '@/lib/schemas'
import { trpc } from '@/lib/trpc'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { isAddDialogOpen, setAddDialogOpen, setPreloadedFiles } = useDashboard()
  const [selectedItem, setSelectedItem] = useState<Content | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    data: content = [],
    isLoading: contentLoading,
    refetch: refetchContent,
  } = trpc.content.getAll.useQuery({
    search: searchQuery || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  })

  useEffect(() => {
    const tagsFromUrl = searchParams.get('tags');
    if (tagsFromUrl) {
      setSelectedTags(tagsFromUrl.split(','));
    } else {
      setSelectedTags([]);
    }
  }, [searchParams]);

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length > 0) {
      setPreloadedFiles(fileArray)
      setAddDialogOpen(true)
    }
  }, [setPreloadedFiles, setAddDialogOpen])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])


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
    // Эта логика будет вынесена в хук или сервис в будущем
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
    <div className="flex flex-col h-full" onDragEnter={handleDrag}>
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
        />
      </main>

      <AddContentDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onContentAdded={handleContentChanged}
      />
      {/* Drag overlay и ModalManager остаются здесь */}
    </div>
  )
} 