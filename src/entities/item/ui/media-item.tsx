import { getPresignedMediaUrl } from "@/shared/lib/image-utils"
import { Content } from "@/shared/lib/schemas"
import { Badge } from "@/shared/ui/badge"
import { Session } from "@supabase/supabase-js"
import { Play } from "lucide-react"
import { useEffect, useState } from "react"

interface MediaItemProps {
  item: Content
  onItemClick?: (item: Content) => void
  session: Session | null
  thumbSrc: string | null
}

function renderImage(imageUrl: string, title: string | null, session: Session | null) {
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc0LjVMMTAwIDYyTDExMi41IDc0LjVMMTI1IDYyTDE0MCA3N1Y5NUg2MFY3N0w3NSA2Mkw4Ny41IDc0LjVaIiBmaWxsPSIjOUM5Q0EzIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTAiIHI9IjgiIGZpbGw9IiM5QzlDQTMiLz4KPHRLEHU+PC90ZXh0Pgo8L3N2Zz4K'
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    const loadImages = async () => {
      const url = await getPresignedMediaUrl(imageUrl, session?.access_token)
      setImages(url ? [url] : [])
    }
    loadImages()
  }, [imageUrl, session?.access_token])

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
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
      {images.length > 2 && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg transform rotate-2 translate-x-1 translate-y-1 shadow-sm"></div>
      )}
      {images.length > 1 && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg transform rotate-1 translate-x-0.5 translate-y-0.5 shadow-sm"></div>
      )}

      <div className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
        <img
          src={images[0]}
          alt={title || 'Изображение'}
          className="w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = fallbackImage
          }}
        />

        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className="flex -space-x-1">
            {images.slice(1, 4).map((url, index) => (
              <div key={index} className="w-8 h-8 rounded border-2 border-white overflow-hidden shadow-sm">
                <img
                  src={url}
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
            {images.length}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MediaItem({ item, onItemClick, session, thumbSrc }: MediaItemProps) {
  return (
    <div className="relative">
      {item.media_type === 'video' && item.thumbnail_url ? (
        <div className="relative" onClick={() => onItemClick?.(item)}>
          <img
            src={thumbSrc || ''}
            alt={item.title || 'Видео'}
            className="w-full object-cover aspect-video rounded-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-16 h-16 text-white/80 drop-shadow-lg" />
          </div>
        </div>
      ) : (
        renderImage(item.media_url || '', item.title || null, session)
      )}
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
  )
}