import { Badge } from "@/components/ui/badge";
import { getSecureImageUrl } from "@/lib/image-utils";
import { Content } from "@/lib/schemas";
import { trpc } from "@/lib/trpc";
import { Session } from "@supabase/supabase-js";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { editorDataToShortText } from "./editor";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "./ui/context-menu";

interface ItemProps {
  item: Content
  index: number
  session: Session | null,
  onContentChanged?: () => void
  onItemClick?: (item: Content) => void
}

export default function Item({ item, index, session, onContentChanged, onItemClick }: ItemProps) {
  const router = useRouter()

  const deleteMutation = trpc.content.delete.useMutation({
    onSuccess: () => onContentChanged?.()
  })

  const handleDelete = () => deleteMutation.mutate({ id: item.id })
  const handleEdit = () => router.push(`/edit/${item.id}`)

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div onClick={() => onItemClick?.(item)} className="cursor-pointer">
          <ItemContent item={item} index={index} session={session} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onItemClick?.(item)}>Открыть</ContextMenuItem>
        <ContextMenuItem onClick={handleEdit}>Редактировать</ContextMenuItem>
        <ContextMenuItem onClick={handleDelete}>Удалить</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function ItemContent({ item, index, session }: ItemProps) {
  const getTextContent = () => {
    if (item.type !== 'note') return item.content;

    try {
      const parsedData = JSON.parse(item.content);
      if (parsedData.blocks) {
        return editorDataToShortText(parsedData);
      }
    } catch {
      // Fallback to plain text
    }
    return item.content;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group"
    >
      <div className={`hover:shadow-lg transition-shadow cursor-pointer overflow-hidden relative p-0`}>
        {item.title && (<div className={`pt-3 px-3 transition-opacity duration-200 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background to-transparent text-foreground opacity-0 group-hover:opacity-100`}>
          <span className="text-lg font-semibold leading-tight">
            {item.title}
          </span>
        </div>)}
        <div className={item.type === 'image' ? 'p-0' : item.type === 'note' ? 'p-3' : ''}>
          {item.type === 'image' ? (
            <div className="relative">
              <img
                src={getSecureImageUrl(item.content, session?.access_token)}
                alt={item.title || 'Uploaded image'}
                className="w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc0LjVMMTAwIDYyTDExMi41IDc0LjVMMTI1IDYyTDE0MCA3N1Y5NUg2MFY3N0w3NSA2Mkw4Ny41IDc0LjVaIiBmaWxsPSIjOUM5Q0EzIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTAiIHI9IjgiIGZpbGw9IiM5QzlDQTMiLz4KPHRLEHU+PC90ZXh0Pgo8L3N2Zz4K'
                }}
              />
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
              <p className="text-sm text-muted-foreground line-clamp-3">
                {getTextContent()}
              </p>
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