'use client'

import { Content } from "@/lib/schemas"
import { Session } from "@supabase/supabase-js"
import { ImageGalleryModal } from "./image-gallery-modal"
import { LinkViewerModal } from "./link-viewer-modal"
import { NoteViewerModal } from "./note-viewer-modal"

interface ContentModalManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content | null
  allItems: Content[]
  session: Session | null
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function ContentModalManager({
  open,
  onOpenChange,
  item,
  allItems,
  session,
  onEdit,
  onDelete
}: ContentModalManagerProps) {
  if (!item) return null

  // For images, find all image items and current index for gallery functionality
  if (item.type === 'image') {
    const imageItems = allItems.filter(i => i.type === 'image')
    const currentIndex = imageItems.findIndex(i => i.id === item.id)

    return (
      <ImageGalleryModal
        open={open}
        onOpenChange={onOpenChange}
        items={imageItems}
        initialIndex={Math.max(0, currentIndex)}
        session={session}
        onEdit={onEdit}
        onDelete={onDelete}
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