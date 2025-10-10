'use client'
import type { Content } from '@/shared/lib/schemas'
import { useMemo, useState } from 'react'
import { EditContentDialog } from '@/features/edit-content/ui/edit-content-dialog'
import { trpc } from '@/shared/api/trpc'
import { parseMediaJson } from '@/shared/lib/schemas'
import { AudioViewerModal } from './audio-viewer-modal'
import { LinkViewerModal } from './link-viewer-modal'
import { NoteViewerModal } from './note-viewer-modal'
import { TodoViewerModal } from './todo-viewer-modal'
import { UnifiedMediaModal } from './unified-image-modal'

interface ContentModalManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content | null
  allItems: Content[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onContentChanged?: () => void
}

export function ContentModalManager({
  open,
  onOpenChange,
  item,
  allItems,
  onEdit,
  onDelete,
  onContentChanged,
}: ContentModalManagerProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<Content | null>(null)

  const utils = trpc.useUtils()
  const updateMutation = trpc.content.update.useMutation({
    onSuccess: () => item && utils.content.getById.invalidate({ id: item.id }),
  })

  const imageGallery = useMemo(() => {
    if (!item || item.type !== 'media')
      return []
    return allItems
      .filter(i => i.type === 'media')
      .flatMap((i) => {
        const media = parseMediaJson(i.content)?.media
        if (media?.url)
          return [{ url: media.url, parentId: i.id, media_type: media.type, thumbnail_url: media.thumbnailUrl }]
        return []
      })
  }, [allItems, item])

  if (!item)
    return null

  if (item.type === 'media') {
    return (
      <UnifiedMediaModal
        open={open}
        onOpenChange={onOpenChange}
        item={item}
        gallery={imageGallery}
        onEdit={onEdit}
        onDelete={onDelete}
        onContentChanged={onContentChanged}
      />
    )
  }

  if (item.type === 'audio') {
    return (
      <AudioViewerModal
        open={open}
        onOpenChange={onOpenChange}
        item={item}
      />
    )
  }

  if (item.type === 'note') {
    return (
      <>
        <NoteViewerModal
          open={open && !editOpen}
          onOpenChange={onOpenChange}
          item={item}
          onEdit={() => {
            setEditItem(item)
            setEditOpen(true)
            onOpenChange(false)
          }}
          onDelete={onDelete}
        />
        {editItem && (
          <EditContentDialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open)
              if (!open) {
                setEditItem(null)
                onOpenChange(false)
              }
            }}
            content={editItem}
            onContentUpdated={() => {
              setEditOpen(false)
              setEditItem(null)
              onContentChanged?.()
              onOpenChange(false)
            }}
          />
        )}
      </>
    )
  }

  if (item.type === 'link') {
    return (
      <LinkViewerModal
        open={open}
        onOpenChange={onOpenChange}
        item={item}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )
  }

  if (item.type === 'todo') {
    return (
      <>
        <TodoViewerModal
          open={open && !editOpen}
          onOpenChange={onOpenChange}
          item={item}
          onUpdate={(newTodos) => {
            updateMutation.mutate({ id: item.id, content: JSON.stringify(newTodos) })
          }}
          onEdit={() => {
            setEditItem(item)
            setEditOpen(true)
            onOpenChange(false)
          }}
          onDelete={onDelete}
        />
        {editItem && (
          <EditContentDialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open)
              if (!open) {
                setEditItem(null)
                onOpenChange(false)
              }
            }}
            content={editItem}
            onContentUpdated={() => {
              setEditOpen(false)
              setEditItem(null)
              onContentChanged?.()
              onOpenChange(false)
            }}
          />
        )}
      </>
    )
  }

  return null
}
