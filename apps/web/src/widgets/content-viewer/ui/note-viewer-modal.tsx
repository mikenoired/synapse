'use client'

import type { Content } from '@/shared/lib/schemas'
import { cn } from '@synapse/ui/cn'
import { Badge, Button, Modal } from '@synapse/ui/components'
import { prose } from '@synapse/ui/prose'
import { Calendar, Clock, FileText, Pencil, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EditorRenderer } from '@/widgets/editor/ui/editor-renderer'

interface NoteViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function NoteViewerModal({
  open,
  onOpenChange,
  item,
  onEdit,
  onDelete,
}: NoteViewerModalProps) {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  // Keyboard navigation handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open)
        return

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
    }
    else {
      router.push(`/edit/${item.id}`)
      onOpenChange(false)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      // eslint-disable-next-line no-alert
      if (confirm('Are you sure you want to delete this item?')) {
        onDelete(item.id)
        onOpenChange(false)
      }
    }
  }

  const renderContent = () => {
    if (item.type === 'note') {
      try {
        const parsedData = JSON.parse(item.content)
        if (parsedData.type === 'doc') {
          return <EditorRenderer data={parsedData} />
        }
      }
      catch {
        // Fallback to plain text if parsing fails
      }
    }

    return (
      <pre className="whitespace-pre-wrap font-sans text-foreground leading-relaxed">
        {item.content}
      </pre>
    )
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="size-4" />
                <span className="text-sm leading-none">Note</span>
              </div>

              {item.title && (
                <h1 className="text-3xl font-bold tracking-tight leading-tight">
                  {item.title}
                </h1>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  <span className="text-sm leading-none">
                    {new Date(item.created_at).toLocaleDateString('en-US', {
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
                    <Clock className="size-3" />
                    <span>
                      Updated:
                      {new Date(item.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

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

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0.7 }}
                className="flex gap-2 pt-2"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEdit}
                  className="text-xs"
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            <div className={cn('max-w-none', prose)}>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
