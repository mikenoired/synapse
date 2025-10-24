'use client'

import type { Content } from '@/shared/lib/schemas'
import { Badge } from '@synapse/ui/components'
import { Calendar, Clock } from 'lucide-react'
import { motion } from 'motion/react'
import React from 'react'
import { calculateReadingTime } from '@/shared/lib/schemas'

function ensureDataUri(base64: string): string {
  if (!base64) return ''
  if (base64.startsWith('data:')) return base64
  return `data:image/jpeg;base64,${base64}`
}

interface DocumentItemProps {
  item: Content
  index: number
  onItemClick?: (item: Content) => void
}

export default function DocumentItem({ item, index, onItemClick }: DocumentItemProps) {
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
      case 'doc':
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
      case 'doc':
      default:
        return 'Document'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      month: 'short',
      day: 'numeric',
    })
  }

  const readingTime = calculateReadingTime(item.content)

  const getTextPreview = (content: string) => {
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    return textContent.length > 150 ? textContent.substring(0, 150) + '...' : textContent
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div
        className="relative"
        onClick={() => onItemClick?.(item)}
      >
        {item.thumbnail_base64 && (
          <div className="h-32 w-full overflow-hidden">
            <img
              src={ensureDataUri(item.thumbnail_base64)}
              alt="Document thumbnail"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0 mt-0.5">
              {getDocumentIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight line-clamp-2">
                {item.title || 'Untitled Document'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {getDocumentTypeName(item.type)}
              </p>
            </div>
          </div>

          {/* Превью контента */}
          <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
            {getTextPreview(item.content)}
          </div>

          {/* Метаданные */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(item.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{readingTime}</span>
              </div>
            </div>
          </div>

          {/* Теги */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-200 dark:border-slate-700">
              {item.tags.slice(0, 3).map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-1 bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-300/60 dark:hover:bg-slate-600/60"
                >
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-1 bg-slate-200/60 dark:bg-slate-700/60"
                >
                  +{item.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
