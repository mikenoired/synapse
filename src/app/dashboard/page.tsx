'use client'

import { AddContentDialog } from '@/components/add-content-dialog'
import Item from '@/components/item'
import { ContentModalManager } from '@/components/modals/content-modal-manager'
import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { Content } from '@/lib/schemas'
import { trpc } from '@/lib/trpc'
import { FileText, LogOut, Plus, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Masonry from 'react-masonry-css'

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Content | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { user, loading, signOut, session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('session', session)
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const {
    data: content = [],
    isLoading: contentLoading,
    refetch: refetchContent,
  } = trpc.content.getAll.useQuery({
    search: searchQuery || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  })

  const {
    data: allTags = [],
    isLoading: tagsLoading,
  } = trpc.content.getTags.useQuery()

  const deleteMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      handleContentChanged()
      setModalOpen(false)
    }
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'n') {
          e.preventDefault()
          setAddDialogOpen(true)
        }
        if (e.key === 'k') {
          e.preventDefault()
          document.getElementById('search')?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleContentChanged = () => {
    refetchContent()
  }

  const handleItemClick = (item: Content) => {
    setSelectedItem(item)
    setModalOpen(true)
  }

  const handleModalDelete = (id: string) => {
    deleteMutation.mutate({ id })
  }

  const isLoading = contentLoading || tagsLoading
  const hasContent = content.length > 0
  const showEmptyState = !isLoading && !hasContent && searchQuery === '' && selectedTags.length === 0

  const breakpointColumnsObj = {
    default: 4,
    2560: 6,
    1920: 5,
    1280: 4,
    1024: 3,
    768: 2,
    640: 1
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">Мой Мозг</h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and filters */}
        <div className="space-y-6 mb-8">
          {/* Search and add button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Поиск... (Cmd+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>

          {/* Tags filter */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content grid */}
        {isLoading ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : showEmptyState ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
              <div>
                <h3 className="text-lg font-medium mb-2">Добро пожаловать!</h3>
                <p className="text-muted-foreground mb-6">
                  Пока здесь пусто. Создайте свою первую запись!
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать первую запись
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : hasContent ? (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="masonry-grid"
            columnClassName="masonry-grid_column"
          >
            {content.map((item, index) => (
              <div key={item.id}>
                <Item
                  item={item}
                  index={index}
                  session={session}
                  onContentChanged={handleContentChanged}
                  onItemClick={handleItemClick}
                />
              </div>
            ))}
          </Masonry>
        ) : searchQuery || selectedTags.length > 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Ничего не найдено</p>
              <p className="text-sm">Попробуйте изменить параметры поиска</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedTags([])
                }}
                className="mt-4"
              >
                Сбросить фильтры
              </Button>
            </div>
          </div>
        ) : null}
      </main>

      <AddContentDialog
        open={addDialogOpen}
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
      />
    </div>
  )
} 