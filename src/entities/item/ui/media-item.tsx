import { getPresignedMediaUrl } from "@/shared/lib/image-utils"
import { Content } from "@/shared/lib/schemas"
import { Badge } from "@/shared/ui/badge"
import { FileText } from "lucide-react"
import { Session } from "@supabase/supabase-js"
import Image from "next/image"
import { useEffect, useState } from "react"

async function getAspectRatioFromBase64(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()

    img.onload = () => {
      resolve(`${img.naturalWidth} / ${img.naturalHeight}`)
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = base64
  })
}

interface MediaItemProps {
  item: Content
  // eslint-disable-next-line no-unused-vars
  onItemClick?: (content: Content) => void
  session: Session | null
  thumbSrc: string | null
}

interface RenderImageProps {
  imageUrl: string
  title: string | null
  session: Session | null
  blurThumb?: string
  savedWidth?: number
  savedHeight?: number
}

function RenderImage({ imageUrl, title, session, blurThumb, savedWidth, savedHeight }: RenderImageProps) {
  const [image, setImage] = useState<string>()
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [blurAspectRatio, setBlurAspectRatio] = useState<string>('1 / 1')

  useEffect(() => {
    if (savedWidth && savedHeight) {
      setBlurAspectRatio(`${savedWidth} / ${savedHeight}`)
    } else if (naturalSize?.width && naturalSize?.height) {
      setBlurAspectRatio(`${naturalSize.width} / ${naturalSize.height}`)
    } else if (blurThumb) {
      getAspectRatioFromBase64(blurThumb)
        .then(setBlurAspectRatio)
        .catch(() => setBlurAspectRatio('1 / 1'))
    }
  }, [blurThumb, naturalSize, savedWidth, savedHeight])

  useEffect(() => {
    let cancelled = false
    const loadImages = async () => {
      setLoaded(false)
      setErrored(false)
      const url = await getPresignedMediaUrl(imageUrl, session?.access_token)
      if (cancelled) return
      setImage(url ? url : '')
      if (url) {
        const probe = new window.Image()
        probe.src = url
        probe.onload = () => {
          if (!cancelled) {
            setNaturalSize({ width: probe.naturalWidth, height: probe.naturalHeight })
          }
        }
        probe.onerror = () => {
          if (!cancelled) setNaturalSize(null)
        }
      }
    }
    loadImages()
    return () => {
      cancelled = true
    }
  }, [imageUrl, session?.access_token])

  return (
    <div
      className="relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-lg"
      style={{ aspectRatio: naturalSize ? `${naturalSize.width} / ${naturalSize.height}` : blurAspectRatio }}
    >
      {blurThumb && !loaded && !errored && (
        <Image
          src={blurThumb}
          alt="blur preview"
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-300 z-0"
          style={{ opacity: loaded ? 0 : 1 }}
          draggable={false}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
        />
      )}
      {image && !errored && (
        <Image
          src={image}
          alt={title || 'Изображение'}
          className="w-full h-full object-cover rounded-lg relative z-10 transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => { setErrored(true); setLoaded(true) }}
          draggable={false}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
        />
      )}
      {(!image || errored) && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <FileText className="w-8 h-8 opacity-60" />
        </div>
      )}
    </div>
  )
}

export default function MediaItem({ item, onItemClick, session, thumbSrc }: MediaItemProps) {
  const blurThumb = item.thumbnail_base64 || ''
  const isVideo = item.media_type === 'video' && item.thumbnail_url
  const mainSrc = isVideo ? (thumbSrc || '') : (item.media_url || '')
  const [thumbSize, setThumbSize] = useState<{ width: number; height: number } | null>(null)
  const [blurAspectRatio, setBlurAspectRatio] = useState<string>('16 / 9')

  useEffect(() => {
    if (item.media_width && item.media_height) {
      setBlurAspectRatio(`${item.media_width} / ${item.media_height}`)
    } else if (blurThumb) {
      getAspectRatioFromBase64(blurThumb)
        .then(setBlurAspectRatio)
        .catch(() => setBlurAspectRatio('16 / 9'))
    }
  }, [blurThumb, item.media_width, item.media_height])

  useEffect(() => {
    let cancelled = false
    if (!mainSrc) return
    const probe = new window.Image()
    probe.src = mainSrc
    probe.onload = () => {
      if (!cancelled) setThumbSize({ width: probe.naturalWidth, height: probe.naturalHeight })
    }
    probe.onerror = () => {
      if (!cancelled) setThumbSize(null)
    }
    return () => {
      cancelled = true
    }
  }, [mainSrc])

  return (
    <div className="relative" onClick={() => onItemClick?.(item)}>
      {isVideo ? (
        <div
          className="relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-lg"
          style={{ aspectRatio: thumbSize ? `${thumbSize.width} / ${thumbSize.height}` : blurAspectRatio }}
        >
          {blurThumb && !thumbSrc && (
            <Image
              src={blurThumb}
              alt="blur preview"
              className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-300 z-0"
              style={{ opacity: thumbSrc ? 0 : 1 }}
              draggable={false}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
            />
          )}
          {mainSrc && (
            <Image
              src={mainSrc}
              alt={item.title || 'Видео'}
              className="w-full h-full object-cover rounded-lg relative z-10 transition-opacity duration-300"
              style={{ opacity: thumbSrc ? 1 : 0 }}
              draggable={false}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
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
        mainSrc ? <RenderImage imageUrl={item.media_url || ''} title={item.title || null} session={session} blurThumb={blurThumb} savedWidth={item.media_width} savedHeight={item.media_height} /> : null
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