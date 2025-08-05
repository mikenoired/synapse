import { EditContentDialog } from '@/features/edit-content/ui/edit-content-dialog';
import { trpc } from "@/shared/api/trpc";
import { getSecureImageUrl } from "@/shared/lib/image-utils";
import { Content } from "@/shared/lib/schemas";
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
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from 'react-hot-toast';

interface ItemProps {
  item: Content
  index: number
  session: Session | null,
  onContentChanged?: () => void
  onItemClick?: (item: Content) => void
  excludedTag?: string
}

// Helper function to parse image URLs from content
function parseImageUrls(content: string): string[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      return parsed
    } else {
      return [content] // Обратная совместимость
    }
  } catch {
    return [content] // Обратная совместимость для строк
  }
}

function renderImages(imageUrls: string[], title: string | null, session: Session | null) {
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc0LjVMMTAwIDYyTDExMi41IDc0LjVMMTI1IDYyTDE0MCA3N1Y5NUg2MFY3N0w3NSA2Mkw4Ny41IDc0LjVaIiBmaWxsPSIjOUM5Q0EzIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTAiIHI9IjgiIGZpbGw9IiM5QzlDQTMiLz4KPHRLEHU+PC90ZXh0Pgo8L3N2Zz4K'

  if (imageUrls.length === 1) {
    return (
      <img
        src={getSecureImageUrl(imageUrls[0], session?.access_token)}
        alt={title || 'Изображение'}
        className="w-full object-cover"
        onError={(e) => {
          e.currentTarget.src = fallbackImage
        }}
      />
    )
  }

  return (
    <div className="relative">
      {imageUrls.length > 2 && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg transform rotate-2 translate-x-1 translate-y-1 shadow-sm"></div>
      )}
      {imageUrls.length > 1 && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg transform rotate-1 translate-x-0.5 translate-y-0.5 shadow-sm"></div>
      )}

      <div className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
        <img
          src={getSecureImageUrl(imageUrls[0], session?.access_token)}
          alt={title || 'Изображение'}
          className="w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = fallbackImage
          }}
        />

        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className="flex -space-x-1">
            {imageUrls.slice(1, 4).map((url, index) => (
              <div key={index} className="w-8 h-8 rounded border-2 border-white overflow-hidden shadow-sm">
                <img
                  src={getSecureImageUrl(url, session?.access_token)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = fallbackImage
                  }}
                />
              </div>
            ))}
          </div>

          <div className="bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
            {imageUrls.length}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Item({ item, index, session, onContentChanged, onItemClick, excludedTag }: ItemProps) {
  const router = useRouter()
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

function ItemContent({ item, index, session }: ItemProps) {
  const getTextContent = useMemo(() => {
    if (item.type !== 'note') return item.content;

    const lowlight = createLowlight(common)
    const data = JSON.parse(item.content)
    if (data.type === 'doc') {
      return generateHTML(data, [StarterKit, Underline, CodeBlockLowlight.configure({ lowlight })])
    }
  }, [item.content])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group pb-4"
    >
      <div className={`hover:shadow-lg rounded-md transition-shadow cursor-pointer overflow-hidden relative p-0`}>
        {item.title && (<div className={`pt-3 px-3 transition-opacity duration-200 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background to-transparent text-foreground opacity-0 group-hover:opacity-100`}>
          <span className="text-lg font-semibold leading-tight">
            {item.title}
          </span>
        </div>)}
        <div className={item.type === 'image' ? 'p-0' : item.type === 'note' ? 'p-3' : ''}>
          {item.type === 'image' ? (
            <div className="relative">
              {renderImages(parseImageUrls(item.content), item.title || null, session)}

              {item.tags.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs bg-white/20 border-white/30 text-white">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : item.type === 'link' ? (
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
              <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {item.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </>
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