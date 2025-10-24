'use client'

import type { Content } from '@/shared/lib/schemas'
import { cn } from '@synapse/ui/cn'
import { Badge, Button, Modal } from '@synapse/ui/components'
import { prose } from '@synapse/ui/prose'
import { Calendar, Clock, Download, Edit2, FileText, Pencil, Trash2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { calculateReadingTime } from '@/shared/lib/schemas'
import DOMPurify from 'dompurify'

function ensureDataUri(base64: string): string {
  if (!base64) return ''
  if (base64.startsWith('data:')) return base64
  return `data:image/jpeg;base64,${base64}`
}

interface DocumentViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function DocumentViewerModal({
  open,
  onOpenChange,
  item,
  onEdit,
  onDelete,
}: DocumentViewerModalProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄'
      case 'docx':
        return '📝'
      case 'epub':
        return '📚'
      case 'xlsx':
      case 'xls':
        return '📊'
      case 'csv':
        return '📈'
      default:
        return '📄'
    }
  }

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'PDF Document'
      case 'docx':
        return 'Word Document'
      case 'epub':
        return 'EPUB Book'
      case 'xlsx':
      case 'xls':
        return 'Excel Spreadsheet'
      case 'csv':
        return 'CSV File'
      default:
        return 'Document'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDelete = async () => {
    if (!onDelete) return

    setIsDeleting(true)
    try {
      await onDelete(item.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting document:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item.id)
    }
  }

  const readingTime = calculateReadingTime(item.content)

  const isHtmlContent = (content: string): boolean => {
    // Проверяем, содержит ли контент HTML теги
    const htmlTagRegex = /<[^>]+>/g
    return htmlTagRegex.test(content)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-4xl w-[95vw] h-[90vh] max-h-[90vh]"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{getDocumentIcon(item.type)}</div>
            <div>
              <h1 className="text-xl font-semibold text-foreground truncate max-w-md">
                {item.title || 'Untitled Document'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {getDocumentTypeName(item.type)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="h-8 px-3"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}

            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 px-3 text-destructive hover:text-destructive-foreground hover:bg-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Document Info */}
            <div className="p-6 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Created {formatDate(item.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{readingTime}</span>
                  </div>
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
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              <div className="p-6">
                {item.thumbnail_base64 && (
                  <div className="mb-6">
                    <img
                      src={ensureDataUri(item.thumbnail_base64)}
                      alt="Document thumbnail"
                      className="w-full max-w-md mx-auto rounded-lg shadow-md"
                    />
                  </div>
                )}

                <div className={cn('max-w-none document-content', prose)}>
                  {isHtmlContent(item.content) ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(item.content, {
                          ADD_TAGS: ['img', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
                          ADD_ATTR: ['src', 'alt', 'title', 'class', 'style', 'colspan', 'rowspan'],
                          ALLOW_DATA_ATTR: false,
                        })
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-foreground">
                      {item.content}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
