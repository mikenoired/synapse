'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Content } from "@/lib/schemas"
import { Calendar, Clock, ExternalLink, Link, Pencil, Trash2, X } from "lucide-react"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface LinkViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function LinkViewerModal({
  open,
  onOpenChange,
  item,
  onEdit,
  onDelete
}: LinkViewerModalProps) {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item.id)
      onOpenChange(false)
    } else {
      router.push(`/edit/${item.id}`)
      onOpenChange(false)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      if (confirm('Вы уверены, что хотите удалить этот элемент?')) {
        onDelete(item.id)
        onOpenChange(false)
      }
    }
  }

  const handleOpenLink = () => {
    window.open(item.content, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[600px] max-h-[80vh] w-full p-0 border-0 bg-background"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div
          className="relative w-full h-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-background/80 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Content container */}
          <div className="h-full flex flex-col p-6">
            {/* Header */}
            <div className="flex-shrink-0 space-y-4">
              {/* Type indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link className="w-4 h-4" />
                <span>Ссылка</span>
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
                  <span>{new Date(item.created_at).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                {item.updated_at !== item.created_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Обновлено: {new Date(item.updated_at).toLocaleDateString('ru-RU', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
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
            </div>

            {/* Main content area */}
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="text-center space-y-6 max-w-md">
                {/* Link preview */}
                <div className="p-6 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ExternalLink className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Внешняя ссылка
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-mono text-left break-all bg-muted/50 p-3 rounded">
                      {item.content}
                    </p>

                    <Button
                      onClick={handleOpenLink}
                      className="w-full"
                      size="lg"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Открыть ссылку
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex-shrink-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0.7 }}
                className="flex gap-2 justify-center pt-4 border-t border-border"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEdit}
                  className="text-xs"
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Редактировать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Удалить
                </Button>
              </motion.div>
            </div>

            {/* Reminder if exists */}
            {item.reminder_at && (
              <div className="flex-shrink-0 pt-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">Напоминание:</span>
                    <span className="text-muted-foreground">
                      {new Date(item.reminder_at).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 