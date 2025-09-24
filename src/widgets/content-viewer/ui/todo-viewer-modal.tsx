import type { Content } from '@/shared/lib/schemas'
import { Calendar, Clock, ListChecks, Pencil, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import Modal from '@/shared/ui/modal'

interface TodoViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content
  onUpdate: (newTodos: { text: string, marked: boolean }[]) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function TodoViewerModal({ open, onOpenChange, item, onUpdate, onEdit, onDelete }: TodoViewerModalProps) {
  const [todos, setTodos] = useState<{ text: string, marked: boolean }[]>([])
  const [changed, setChanged] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    try {
      setTodos(JSON.parse(item.content))
    }
    catch {
      setTodos([])
    }
    setChanged(false)
  }, [item])

  useEffect(() => {
    if (!changed)
      return
    if (debounceRef.current)
      clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onUpdate(todos)
      setChanged(false)
    }, 300)
    return () => {
      if (debounceRef.current)
        clearTimeout(debounceRef.current)
    }
  }, [todos, changed, onUpdate])

  const handleToggle = (idx: number) => {
    setTodos(todos => todos.map((t, i) => i === idx ? { ...t, marked: !t.marked } : t))
    setChanged(true)
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item.id)
      onOpenChange(false)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      // eslint-disable-next-line no-alert
      if (confirm('Вы уверены, что хотите удалить этот элемент?')) {
        onDelete(item.id)
        onOpenChange(false)
      }
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <div
        className="relative w-full h-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="max-w-[750px] mx-auto h-full flex flex-col">
          <div className="flex-shrink-0 p-6 pb-0">
            <div className="space-y-4">
              {/* Type indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ListChecks className="w-4 h-4" />
                <span>Список задач</span>
              </div>
              {/* Title */}
              {item.title && (
                <h1 className="text-2xl font-bold tracking-tight leading-tight">
                  {item.title}
                </h1>
              )}
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(item.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {item.updated_at !== item.created_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      Обновлено:
                      {new Date(item.updated_at).toLocaleDateString('ru-RU', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-2 py-1 bg-muted/60 hover:bg-muted"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0.7 }}
                className="flex gap-2 pt-2"
              >
                {onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEdit}
                    className="text-xs"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Редактировать
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Удалить
                  </Button>
                )}
              </motion.div>
            </div>
          </div>
          {/* Content area with scroll */}
          <div className="flex-1 overflow-auto p-6 pt-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="flex flex-col gap-3">
                {todos.length === 0 && <div className="text-muted-foreground text-sm">Нет пунктов</div>}
                {todos.map((todo, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input type="checkbox" checked={todo.marked} onChange={() => handleToggle(idx)} className="w-5 h-5" />
                    <span className={todo.marked ? 'line-through opacity-60' : ''}>{todo.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
