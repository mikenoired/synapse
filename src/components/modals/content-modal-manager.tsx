'use client'

import { Content } from "@/lib/schemas"
import { Session } from "@supabase/supabase-js"
import { LinkViewerModal } from "./link-viewer-modal"
import { NoteViewerModal } from "./note-viewer-modal"
import { UnifiedImageModal } from "./unified-image-modal"

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
  if (!item) return null

  // For images - use unified modal
  if (item.type === 'image') {
    return (
      <UnifiedImageModal
        open={open}
        onOpenChange={onOpenChange}
        item={item}
        session={session}
        onEdit={onEdit}
        onDelete={onDelete}
        onContentChanged={onContentChanged}
      />
    )
  }

  // For notes
  if (item.type === 'note') {
    return (
      <NoteViewerModal
        open={open}
        onOpenChange={onOpenChange}
        item={item}
        onEdit={onEdit}
        onDelete={onDelete}
      />
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

  return null
} 