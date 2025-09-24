import type { JSONContent } from '@tiptap/core'
import type { Content } from '@/shared/lib/schemas'
import { Maximize, Minimize, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { trpc } from '@/shared/api/trpc'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Editor } from '@/widgets/editor/ui/editor'

interface EditContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: Content
  onContentUpdated?: () => void
}

export function EditContentDialog({ open, onOpenChange, content, onContentUpdated }: EditContentDialogProps) {
  const [title, setTitle] = useState(content.title || '')
  const [editorData, setEditorData] = useState<JSONContent>(content.content ? JSON.parse(content.content) : { type: 'doc', content: [] })
  const [tags, setTags] = useState<string[]>(content.tags || [])
  const [currentTag, setCurrentTag] = useState('')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [startY, setStartY] = useState<number | null>(null)
  const [todoItems, setTodoItems] = useState<{ text: string, marked: boolean }[]>([])
  const [todoInput, setTodoInput] = useState('')
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [hasUnsaved, setHasUnsaved] = useState(false)
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

  useEffect(() => {
    if (content.type === 'todo') {
      try {
        setTodoItems(JSON.parse(content.content))
      }
      catch {
        setTodoItems([])
      }
    }
  }, [content])

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
    if (content.type === 'todo') {
      if (todoItems.length === 0 || todoItems.some(item => !item.text.trim()))
        return
      try {
        updateContentMutation.mutate({
          id: content.id,
          type: 'todo',
          title: title.trim() || undefined,
          content: JSON.stringify(todoItems),
          tags,
        })
        setHasUnsaved(false)
      }
      catch (error) {
        toast.error(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      return
    }
    if (!editorData || !editorData.content || editorData.content.length === 0)
      return
    try {
      const finalContent = JSON.stringify(editorData)
      updateContentMutation.mutate({
        id: content.id,
        type: 'note',
        title: title.trim() || undefined,
        content: finalContent,
        tags,
      })
    }
    catch (error) {
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

  const handleAddTodo = () => {
    const value = todoInput.trim()
    if (value) {
      setTodoItems([...todoItems, { text: value, marked: false }])
      setTodoInput('')
      setHasUnsaved(true)
    }
  }
  const handleRemoveTodo = (idx: number) => {
    setTodoItems(todoItems.filter((_, i) => i !== idx))
    setHasUnsaved(true)
  }
  const handleToggleTodo = (idx: number) => {
    setTodoItems(todoItems.map((item, i) => i === idx ? { ...item, marked: !item.marked } : item))
    setHasUnsaved(true)
  }
  const handleEditTodo = (idx: number, value: string) => {
    setTodoItems(todoItems.map((item, i) => i === idx ? { ...item, text: value } : item))
    setHasUnsaved(true)
  }
  const handleClose = () => {
    if (content.type === 'todo' && hasUnsaved) {
      setShowUnsavedModal(true)
    }
    else {
      onOpenChange(false)
    }
  }
  const handleSave = () => {
    setShowUnsavedModal(false)
    setHasUnsaved(false)
    onOpenChange(false)
  }
  const handleDiscard = () => {
    setShowUnsavedModal(false)
    setHasUnsaved(false)
    onOpenChange(false)
  }

  if (!open)
    return null

  const renderTodoForm = () => (
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
        <div className="max-w-[700px] mx-auto w-full flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="Добавить пункт..."
              value={todoInput}
              onChange={e => setTodoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  handleAddTodo()
              }}
              disabled={updateContentMutation.isPending}
              className="flex-1"
            />
            <Button type="button" onClick={handleAddTodo} disabled={!todoInput.trim() || updateContentMutation.isPending} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {todoItems.length === 0 && <div className="text-muted-foreground text-sm">Нет пунктов</div>}
            {todoItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <Input
                  type="checkbox"
                  checked={item.marked}
                  onChange={() => handleToggleTodo(idx)}
                  className="w-5 h-5 cursor-pointer"
                  disabled={updateContentMutation.isPending}
                />
                <Input
                  value={item.text}
                  onChange={e => handleEditTodo(idx, e.target.value)}
                  className="flex-1 px-2 py-1"
                  disabled={updateContentMutation.isPending}
                />
                <button type="button" onClick={() => handleRemoveTodo(idx)} disabled={updateContentMutation.isPending} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center animate-in fade-in-0 transition-all duration-300 ease-in-out ${isFullScreen ? 'p-5' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`bg-background shadow-lg relative ${isFullScreen ? 'w-full h-full max-w-none rounded-none' : 'max-w-3xl w-[95vw] h-[90vh] rounded-lg'} p-0 gap-0 flex flex-col transition-all duration-300 ease-in-out animate-in fade-in-0 zoom-in-95`}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-4 border-b flex flex-row items-center justify-between">
          <div className="text-lg font-semibold">{content.type === 'todo' ? 'Редактировать список' : 'Редактировать заметку'}</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsFullScreen(!isFullScreen)}>
              {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {content.type === 'todo'
            ? (
                renderTodoForm()
              )
            : (
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
              )}
          <div className="p-6 pt-4 border-t bg-background mt-auto sticky bottom-0 z-10">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateContentMutation.isPending}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={
                  updateContentMutation.isPending
                  || (content.type === 'todo'
                    ? todoItems.length === 0 || todoItems.some(item => !item.text.trim())
                    : !editorData || !editorData.content || editorData.content.length === 0)
                }
              >
                {updateContentMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </form>
      </div>
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-sm">
            <div className="mb-4 text-lg font-semibold">Есть несохранённые изменения</div>
            <div className="mb-6 text-sm text-muted-foreground">Вы не сохранили изменения. Сохранить или сбросить?</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleDiscard}>Сбросить</Button>
              <Button onClick={handleSave}>Сохранить</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
