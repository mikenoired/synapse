import { trpc } from '@/shared/api/trpc'
import { useAuth } from '@/shared/lib/auth-context'
import { Content } from '@/shared/lib/schemas'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Editor } from '@/widgets/editor/ui/editor'
import { JSONContent } from '@tiptap/core'
import { Maximize, Minimize, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface EditContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: Content
  onContentUpdated?: () => void
}

export function EditContentDialog({ open, onOpenChange, content, onContentUpdated }: EditContentDialogProps) {
  const { session } = useAuth()
  const [title, setTitle] = useState(content.title || '')
  const [editorData, setEditorData] = useState<JSONContent>(content.content ? JSON.parse(content.content) : { type: 'doc', content: [] })
  const [tags, setTags] = useState<string[]>(content.tags || [])
  const [currentTag, setCurrentTag] = useState('')
  const [isFullScreen, setIsFullScreen] = useState(false)
  // touch gesture support for mobile (swipe down to close)
  const [startY, setStartY] = useState<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY !== null) {
      const deltaY = e.touches[0].clientY - startY
      if (deltaY > 120) {
        onOpenChange(false)
        setStartY(null)
      }
    }
  }
  const handleTouchEnd = () => setStartY(null)

  useEffect(() => {
    setTitle(content.title || '')
    setTags(content.tags || [])
  }, [content])

  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [open])

  const updateContentMutation = trpc.content.update.useMutation({
    onSuccess: () => {
      toast.success('Сохранено')
      onOpenChange(false)
      onContentUpdated?.()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления: ${error.message}`)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editorData || !editorData.content || editorData.content.length === 0) return
    try {
      const finalContent = JSON.stringify(editorData)
      updateContentMutation.mutate({
        id: content.id,
        type: 'note',
        title: title.trim() || undefined,
        content: finalContent,
        tags,
      })
    } catch (error) {
      toast.error(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addTag()
    }
  }

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center animate-in fade-in-0 transition-all duration-300 ease-in-out ${isFullScreen ? 'p-5' : ''}`}
      onClick={() => onOpenChange(false)}
    >
      <div
        className={`bg-background shadow-lg relative ${isFullScreen ? 'w-full h-full max-w-none rounded-none' : 'max-w-3xl w-[95vw] h-[90vh] rounded-lg'} p-0 gap-0 flex flex-col transition-all duration-300 ease-in-out animate-in fade-in-0 zoom-in-95`}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-4 border-b flex flex-row items-center justify-between">
          <div className="text-lg font-semibold">Редактировать заметку</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsFullScreen(!isFullScreen)}>
              {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-col h-full">
            <div className="p-6 pb-4 border-b">
              <div className="max-w-[700px] mx-auto w-full">
                <Input
                  id="title"
                  placeholder="Заголовок (опционально)..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={updateContentMutation.isPending}
                  className="!text-2xl font-bold border-none shadow-none !bg-transparent focus-visible:ring-0 h-auto px-0"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        disabled={updateContentMutation.isPending}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    id="tags"
                    placeholder="+ Добавить тег"
                    value={currentTag}
                    onChange={e => setCurrentTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="border-none shadow-none focus-visible:ring-0 h-auto flex-1"
                    disabled={updateContentMutation.isPending}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 p-6 pt-2 overflow-y-auto">
              <div className="max-w-[700px] mx-auto w-full">
                <Editor
                  data={editorData}
                  onChange={setEditorData}
                  readOnly={updateContentMutation.isPending}
                />
              </div>
            </div>
          </div>
          <div className="p-6 pt-4 border-t bg-background mt-auto sticky bottom-0 z-10">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateContentMutation.isPending}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={
                  updateContentMutation.isPending ||
                  !editorData || !editorData.content || editorData.content.length === 0
                }
              >
                {updateContentMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}