import type { Content, LinkContent } from '@/shared/lib/schemas'
import { cn } from '@synapse/ui/cn'
import {
  Badge,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@synapse/ui/components'
import { prose } from '@synapse/ui/prose'
import { generateHTML } from '@tiptap/core'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'
import { common, createLowlight } from 'lowlight'
import { ListChecks } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { EditContentDialog } from '@/features/edit-content/ui/edit-content-dialog'
import { trpc } from '@/shared/api/trpc'
import { getPresignedMediaUrl } from '@/shared/lib/image-utils'
import { extractTextFromStructuredContent, parseLinkContent, parseMediaJson } from '@/shared/lib/schemas'
import MediaItem from './media-item'

function extractTextFromHTML(html: string): string {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  return tempDiv.textContent || ''
}

function truncateHTMLContent(html: string, maxLength: number = 250): { html: string, isTruncated: boolean } {
  const textContent = extractTextFromHTML(html)

  if (textContent.length <= maxLength) {
    return { html, isTruncated: false }
  }

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  let currentLength = 0
  let truncated = false

  const walkNodes = (node: Node): void => {
    if (truncated)
      return

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (currentLength + text.length > maxLength) {
        const remainingLength = maxLength - currentLength
        node.textContent = `${text.substring(0, remainingLength)}...`
        truncated = true
        return
      }
      currentLength += text.length
    }
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const children = Array.from(element.childNodes)
      for (let i = 0; i < children.length; i++) {
        walkNodes(children[i])
        if (truncated) {
          for (let j = i + 1; j < children.length; j++) {
            element.removeChild(children[j])
          }
          break
        }
      }
    }
  }

  walkNodes(tempDiv)

  return { html: tempDiv.innerHTML, isTruncated: truncated }
}

interface ItemProps {
  item: Content
  index: number
  onContentChanged?: () => void
  onItemClick?: (content: Content) => void
  excludedTag?: string
}

export default function Item({ item, index, onContentChanged, onItemClick, excludedTag }: ItemProps) {
  const [editOpen, setEditOpen] = useState(false)

  const deleteMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success('Element was deleted')
      onContentChanged?.()
    },
  })

  const handleDelete = () => deleteMutation.mutate({ id: item.id })
  const handleEdit = () => setEditOpen(true)

  const displayTags = excludedTag ? item.tags.filter(t => t !== excludedTag) : item.tags

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div onClick={() => onItemClick?.(item)} className="cursor-pointer">
            <ItemContent
              item={{
                ...item,
                tags: displayTags,
              }}
              index={index}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onItemClick?.(item)}>Open</ContextMenuItem>
          <ContextMenuItem onClick={handleEdit}>Edit</ContextMenuItem>
          <ContextMenuItem onClick={handleDelete}>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {editOpen && item.type === 'note' && (
        <EditContentDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          content={item}
          onContentUpdated={onContentChanged}
        />
      )}
    </>
  )
}

function ItemContent({ item, index, onItemClick }: ItemProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    const media = item.type === 'media' ? parseMediaJson(item.content)?.media : undefined
    const thumb = media?.thumbnailUrl
    if (media?.type === 'video' && thumb) {
      setThumbSrc(null)
      getPresignedMediaUrl(thumb)
        .then((url) => {
          if (!cancelled)
            setThumbSrc(url)
        })
        .catch(() => {
          if (!cancelled)
            setThumbSrc(null)
        })
    }
    return () => {
      cancelled = true
    }
  }, [item.content, item.type])

  const getTextContent = useMemo(() => {
    if (item.type !== 'note')
      return item.content

    const lowlight = createLowlight(common)
    const data = JSON.parse(item.content)
    if (data.type === 'doc') {
      return generateHTML(data, [StarterKit, Underline, CodeBlockLowlight.configure({ lowlight })])
    }
  }, [item.content, item.type])

  const renderTodoPreview = () => {
    let todos: { text: string, marked: boolean }[] = []
    try {
      todos = JSON.parse(item.content)
    }
    catch {
      console.error('Failed to parse todos', item.content)
    }
    const done = todos.filter(t => t.marked).length
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          <ListChecks className="w-4 h-4" />
          {done}
          {' '}
          /
          {todos.length}
          {' '}
          done
        </div>
        {todos.slice(0, 3).map((todo, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input type="checkbox" checked={todo.marked} readOnly disabled className="w-4 h-4" />
            <span className={todo.marked ? 'line-through opacity-60' : ''}>{todo.text}</span>
          </div>
        ))}
        {todos.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +
            {todos.length - 3}
            ...
          </div>
        )}
        {item.tags && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.tags.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderLinkPreview = () => {
    const linkContent: LinkContent | null = parseLinkContent(item.content)

    if (!linkContent) {
      return (
        <>
          <div className="mb-4">
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {item.content}
            </a>
          </div>
        </>
      )
    }

    const fullText = linkContent.rawText || extractTextFromStructuredContent(linkContent.content)
    const previewText = fullText.length > 200
      ? `${fullText.substring(0, 200)}...`
      : fullText

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-base leading-tight line-clamp-2">
          {linkContent.title || item.title || 'No title'}
        </h3>

        {previewText && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {previewText}
          </p>
        )}

        <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
          {linkContent.url}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group"
    >
      <div className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden relative">
        <div className={item.type === 'media' || item.type === 'audio' ? 'p-0' : item.type === 'note' ? 'p-3' : item.type === 'todo' ? 'p-3' : item.type === 'link' ? 'p-3' : ''}>
          {item.type === 'media' || item.type === 'audio'
            ? (
                <MediaItem item={item} onItemClick={onItemClick} thumbSrc={thumbSrc} />
              )
            : item.type === 'link'
              ? (
                  <>
                    {renderLinkPreview()}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {item.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )
              : item.type === 'todo'
                ? (
                    renderTodoPreview()
                  )
                : (
                    <>
                      <TruncatedText html={getTextContent || ''} />
                      <div className="flex flex-wrap mt-3 absolute bottom-0 left-0 right-0 z-10">
                        {item.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
        </div>
      </div>
    </motion.div>
  )
}

interface TruncatedTextProps {
  html: string
  maxLength?: number
  className?: string
}

function TruncatedText({ html, maxLength = 250, className = '' }: TruncatedTextProps) {
  const { html: processedHTML, isTruncated } = truncateHTMLContent(html, maxLength)

  if (!isTruncated) {
    return (
      <div
        className={cn('max-w-none opacity-75', className, prose)}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedHTML) }}
      />
    )
  }

  return (
    <div className={`${className}`}>
      <div
        className={cn('max-w-none opacity-75', className, prose)}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedHTML) }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, transparent 10%, var(--background) 100%)',
        }}
      />
    </div>
  )
}
