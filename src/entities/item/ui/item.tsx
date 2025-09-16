import { EditContentDialog } from '@/features/edit-content/ui/edit-content-dialog';
import { trpc } from "@/shared/api/trpc";
import { getPresignedMediaUrl } from "@/shared/lib/image-utils";
import { Content, LinkContent, parseLinkContent, extractTextFromStructuredContent } from "@/shared/lib/schemas";
import { Badge } from "@/shared/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from "@/shared/ui/context-menu";
import { Session } from "@supabase/supabase-js";
import { generateHTML } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from 'dompurify';
import { common, createLowlight } from "lowlight";
import { ListChecks } from 'lucide-react';
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import toast from 'react-hot-toast';
import MediaItem from './media-item';

interface ItemProps {
  item: Content
  index: number
  session: Session | null,
  onContentChanged?: () => void
  // eslint-disable-next-line no-unused-vars
  onItemClick?: (content: Content) => void
  excludedTag?: string
}

export default function Item({ item, index, session, onContentChanged, onItemClick, excludedTag }: ItemProps) {
  const [editOpen, setEditOpen] = useState(false)

  const deleteMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success('Элемент удален')
      onContentChanged?.()
    }
  })

  const handleDelete = () => deleteMutation.mutate({ id: item.id })
  const handleEdit = () => setEditOpen(true)

  const displayTags = excludedTag ? item.tags.filter(t => t !== excludedTag) : item.tags;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div onClick={() => onItemClick?.(item)} className="cursor-pointer">
            <ItemContent item={{
              ...item,
              tags: displayTags
            }} index={index} session={session} />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onItemClick?.(item)}>Открыть</ContextMenuItem>
          <ContextMenuItem onClick={handleEdit}>Редактировать</ContextMenuItem>
          <ContextMenuItem onClick={handleDelete}>Удалить</ContextMenuItem>
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

function ItemContent({ item, index, session, onItemClick }: ItemProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    if (item.media_type === 'video' && item.thumbnail_url) {
      setThumbSrc(null)
      getPresignedMediaUrl(item.thumbnail_url, session?.access_token)
        .then(url => { if (!cancelled) setThumbSrc(url) })
        .catch(() => { if (!cancelled) setThumbSrc(null) })
    }
    return () => { cancelled = true }
  }, [item.thumbnail_url, item.media_type, session?.access_token])

  const getTextContent = useMemo(() => {
    if (item.type !== 'note') return item.content;

    const lowlight = createLowlight(common)
    const data = JSON.parse(item.content)
    if (data.type === 'doc') {
      return generateHTML(data, [StarterKit, Underline, CodeBlockLowlight.configure({ lowlight })])
    }
  }, [item.content, item.type])

  const renderTodoPreview = () => {
    let todos: { text: string; marked: boolean }[] = []
    try {
      todos = JSON.parse(item.content)
    } catch {
      console.error('Failed to parse todos', item.content)
    }
    const done = todos.filter(t => t.marked).length
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          <ListChecks className="w-4 h-4" />
          {done} / {todos.length} выполнено
        </div>
        {todos.slice(0, 3).map((todo, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input type="checkbox" checked={todo.marked} readOnly disabled className="w-4 h-4" />
            <span className={todo.marked ? 'line-through opacity-60' : ''}>{todo.text}</span>
          </div>
        ))}
        {todos.length > 3 && <div className="text-xs text-muted-foreground">+ ещё {todos.length - 3}...</div>}
      </div>
    )
  }

  const renderLinkPreview = () => {
    const linkContent: LinkContent | null = parseLinkContent(item.content)

    if (!linkContent) {
      // Если это старый формат ссылки, показываем как раньше
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

    // Получаем текст из структурированного контента
    const fullText = linkContent.rawText || extractTextFromStructuredContent(linkContent.content)
    const previewText = fullText.length > 200
      ? fullText.substring(0, 200) + '...'
      : fullText

    return (
      <div className="space-y-3">
        {/* Заголовок */}
        <h3 className="font-semibold text-base leading-tight line-clamp-2">
          {linkContent.title || item.title || 'Без названия'}
        </h3>

        {/* Превью текста */}
        {previewText && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {previewText}
          </p>
        )}

        {/* URL */}
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
      className="group pb-4"
    >
      <div className={`hover:shadow-lg rounded-md transition-shadow cursor-pointer overflow-hidden relative p-0`}>
        {item.title && item.type !== 'link' && (<div className={`pt-3 px-3 transition-opacity duration-200 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background to-transparent text-foreground opacity-0 group-hover:opacity-100`}>
          <span className="text-lg font-semibold leading-tight">
            {item.title}
          </span>
        </div>)}
        <div className={item.type === 'media' ? 'p-0' : item.type === 'note' ? 'p-3' : item.type === 'todo' ? 'p-3' : item.type === 'link' ? 'p-3' : ''}>
          {item.type === 'media' ? (
            <MediaItem item={item} session={session} onItemClick={onItemClick} thumbSrc={thumbSrc} />
          ) : item.type === 'link' ? (
            <div>
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
            </div>
          ) : item.type === 'todo' ? (
            renderTodoPreview()
          ) : (
            <>
              <div className="prose max-w-none opacity-75" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getTextContent || '') }} />
              <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent p-3">
                {item.tags.map((tag: string) => (
                  <Badge key={tag} variant='secondary' className="text-xs">
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