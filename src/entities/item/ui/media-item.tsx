import { getPresignedMediaUrl } from "@/shared/lib/image-utils"
import { Content } from "@/shared/lib/schemas"
import { Badge } from "@/shared/ui/badge"
import { Session } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

interface MediaItemProps {
  item: Content
  onItemClick?: (item: Content) => void
  session: Session | null
  thumbSrc: string | null
}

function renderImage(imageUrl: string, title: string | null, session: Session | null, blurThumb?: string) {
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc0LjVMMTAwIDYyTDExMi41IDc0LjVMMTI1IDYyTDE0MCA3N1Y5NUg2MFY3N0w3NSA2Mkw4Ny41IDc0LjVaIiBmaWxsPSIjOUM5Q0EzIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTAiIHI9IjgiIGZpbGw9IiM5QzlDQTMiLz4KPHRLEHU+PC90ZXh0Pgo8L3N2Zz4K'
  const [images, setImages] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loadImages = async () => {
      const url = await getPresignedMediaUrl(imageUrl, session?.access_token)
      setImages(url ? [url] : [])
    }
    loadImages()
  }, [imageUrl, session?.access_token])

  return (
    <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-lg">
      {blurThumb && !loaded && (
        <img
          src={blurThumb}
          alt="blur preview"
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-300 z-0"
          style={{ opacity: loaded ? 0 : 1 }}
          draggable={false}
        />
      )}
      {images.length === 1 && (
        <img
          src={images[0]}
          alt={title || 'Изображение'}
          className="w-full h-full object-cover rounded-lg relative z-10 transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          draggable={false}
        />
      )}
    </div>
  )
}

export default function MediaItem({ item, onItemClick, session, thumbSrc }: MediaItemProps) {
  const blurThumb = item.thumbnail_base64 || ''
  const isVideo = item.media_type === 'video' && item.thumbnail_url
  const mainSrc = isVideo ? (thumbSrc || '') : (item.media_url || '')

  return (
    <div className="relative">
      {isVideo ? (
        <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-lg">
          {blurThumb && !thumbSrc && (
            <img
              src={blurThumb}
              alt="blur preview"
              className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-300 z-0"
              style={{ opacity: thumbSrc ? 0 : 1 }}
              draggable={false}
            />
          )}
          {mainSrc && (
            <img
              src={mainSrc}
              alt={item.title || 'Видео'}
              className="w-full h-full object-cover rounded-lg relative z-10 transition-opacity duration-300"
              style={{ opacity: thumbSrc ? 1 : 0 }}
              draggable={false}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-16 h-16 drop-shadow-lg"
            >
              <path
                d="M20 16C20 13.7909 22.2386 12.5532 24.0711 13.7574L50.1421 31.7574C51.8579 32.8921 51.8579 35.1079 50.1421 36.2426L24.0711 54.2426C22.2386 55.4468 20 54.2091 20 52V16Z"
                fill="white"
                fillOpacity="0.8"
              />
            </svg>
          </div>
        </div>
      ) : (
        mainSrc ? renderImage(item.media_url || '', item.title || null, session, blurThumb) : null
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