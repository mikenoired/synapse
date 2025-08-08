'use client'

import { EditContentDialog } from '@/features/edit-content/ui/edit-content-dialog'
import { trpc } from '@/shared/api/trpc'
import { Content } from "@/shared/lib/schemas"
import { Session } from "@supabase/supabase-js"
import { useState } from 'react'
import { LinkViewerModal } from "./link-viewer-modal"
import { NoteViewerModal } from "./note-viewer-modal"
import { TodoViewerModal } from './todo-viewer-modal'
import { UnifiedMediaModal } from "./unified-image-modal"

interface ContentModalManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content | null
  allItems: Content[]
  session: Session | null
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onContentChanged?: () => void
}

export function ContentModalManager({
  open,
  onOpenChange,
  item,
  allItems,
  session,
  onEdit,
  onDelete,
  onContentChanged
}: ContentModalManagerProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<Content | null>(null)

  // Вынесено вне условий
  const utils = trpc.useUtils()
  const updateMutation = trpc.content.update.useMutation({
    onSuccess: () => item && utils.content.getById.invalidate({ id: item.id })
  })

  if (!item) return null

  // For images - use unified modal
  if (item.type === 'media') {
    const imageGallery = allItems
      .filter(i => i.type === 'media')
      .flatMap(i => {
        try {
          const parsed = JSON.parse(i.content);
          if (Array.isArray(parsed)) {
            return parsed.map((url: string) => ({
              url,
              parentId: i.id,
              media_type: i.media_type,
              thumbnail_url: i.thumbnail_url,
            }));
          }
          if (typeof parsed === "string") {
            return [{
              url: parsed,
              parentId: i.id,
              media_type: i.media_type,
              thumbnail_url: i.thumbnail_url,
            }];
          }
          return [];
        } catch (error) {
          return [{
            url: i.content,
            parentId: i.id,
            media_type: i.media_type,
            thumbnail_url: i.thumbnail_url,
          }];
        }
      })

    return (
      <UnifiedMediaModal
        open={open}
        onOpenChange={onOpenChange}
        item={item}
        session={session}
        gallery={imageGallery}
        onEdit={onEdit}
        onDelete={onDelete}
        onContentChanged={onContentChanged}
      />
    )
  }

  // For notes
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

  // For links
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

  // For todos
  if (item.type === 'todo') {
    return (
      <>
        <TodoViewerModal
          open={open && !editOpen}
          onOpenChange={onOpenChange}
          item={item}
          onUpdate={newTodos => {
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