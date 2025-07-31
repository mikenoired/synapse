'use client'

import { trpc } from '@/shared/api/trpc'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Editor } from '@/widgets/editor/ui/editor'
import { ArrowLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function EditPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [editorData, setEditorData] = useState<any>(null)
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')

  const { data: item, isLoading } = trpc.content.getById.useQuery({ id })

  const updateContentMutation = trpc.content.update.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
    },
    onError: (error) => {
      alert(`Ошибка обновления контента: ${error.message}`)
    },
  })

  useEffect(() => {
    if (item) {
      setTitle(item.title || '')
      setTags(item.tags || [])

      try {
        const parsedData = JSON.parse(item.content)
        if (parsedData.blocks) {
          setEditorData(parsedData)
        } else {
          setEditorData({
            time: Date.now(),
            blocks: [{
              type: 'paragraph',
              data: { text: item.content }
            }],
            version: '2.30.8'
          })
        }
      } catch {
        setEditorData({
          time: Date.now(),
          blocks: [{
            type: 'paragraph',
            data: { text: item.content }
          }],
          version: '2.30.8'
        })
      }
    }
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editorData || !editorData.blocks || editorData.blocks.length === 0) return

    try {
      const finalContent = JSON.stringify(editorData)

      updateContentMutation.mutate({
        id,
        type: 'note',
        title: title.trim() || undefined,
        content: finalContent,
        tags,
      })
    } catch (error) {
      alert(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => setTags(tags.filter(tag => tag !== tagToRemove))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addTag()
    }
  }

  const isLoadingState = updateContentMutation.isPending || isLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <p>Контент не найден</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                disabled={isLoadingState}
                className="text-muted-foreground hover:text-foreground"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                form="editor-form"
                size="sm"
                disabled={isLoadingState || !editorData || !editorData.blocks || editorData.blocks.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoadingState ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <form id="editor-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Без названия"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoadingState}
              className="text-4xl font-bold border-none shadow-none px-0 py-2 h-auto bg-transparent placeholder:text-muted-foreground/60 focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 py-2">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-2 py-1 text-xs">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  disabled={isLoadingState}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <Input
              placeholder="Добавить тег..."
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoadingState}
              className="inline-flex w-auto min-w-[120px] max-w-[200px] h-6 px-2 py-1 text-xs border-none shadow-none bg-transparent placeholder:text-muted-foreground/60 focus-visible:ring-0"
            />
          </div>

          <div className="min-h-[500px]">
            <Editor
              data={editorData}
              onChange={setEditorData}
              placeholder="Начните писать..."
              readOnly={isLoadingState}
            />
          </div>
        </form>
      </div>
    </div>
  )
} 