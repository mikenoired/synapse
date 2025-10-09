import type { Content } from '@/shared/lib/schemas'
import { Badge } from '@synapse/ui/components'
import { Music2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getPresignedMediaUrl } from '@/shared/lib/image-utils'
import { parseAudioJson, parseMediaJson } from '@/shared/lib/schemas'

async function getAspectRatioFromBase64(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(`${img.naturalWidth} / ${img.naturalHeight}`)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = base64
  })
}

interface MediaItemProps {
  item: Content
  onItemClick?: (content: Content) => void
  thumbSrc: string | null
}

interface RenderImageProps {
  imageUrl: string
  title: string | null
  blurThumb?: string
  savedWidth?: number
  savedHeight?: number
}

function RenderImage({ imageUrl, title, blurThumb, savedWidth, savedHeight }: RenderImageProps) {
  const [image, setImage] = useState<string>()
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [naturalSize, setNaturalSize] = useState<{ width: number, height: number } | null>(null)
  const [blurAspectRatio, setBlurAspectRatio] = useState<string>('1 / 1')

  useEffect(() => {
    if (savedWidth && savedHeight) {
      setBlurAspectRatio(`${savedWidth} / ${savedHeight}`)
    }
    else if (naturalSize?.width && naturalSize?.height) {
      setBlurAspectRatio(`${naturalSize.width} / ${naturalSize.height}`)
    }
    else if (blurThumb) {
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
      const url = await getPresignedMediaUrl(imageUrl)
      if (cancelled)
        return
      setImage(url || '')
      if (url) {
        const probe = new window.Image()
        probe.src = url
        probe.onload = () => {
          if (!cancelled) {
            setNaturalSize({ width: probe.naturalWidth, height: probe.naturalHeight })
          }
        }
        probe.onerror = () => {
          if (!cancelled)
            setNaturalSize(null)
        }
      }
    }
    loadImages()
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return (
    <div
      className="relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-md"
      style={{ aspectRatio: naturalSize ? `${naturalSize.width} / ${naturalSize.height}` : blurAspectRatio }}
    >
      {blurThumb && (
        <Image
          src={blurThumb}
          alt="blur preview"
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-200 ease-in-out z-0"
          style={{ opacity: loaded && !errored ? 0 : 1 }}
          draggable={false}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
        />
      )}
      {image && !errored && (
        <Image
          src={image}
          alt={title || 'Image'}
          className="w-full h-full object-cover relative z-10 transition-opacity duration-200 ease-in-out"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setErrored(true)
            setLoaded(true)
          }}
          draggable={false}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
        />
      )}
    </div>
  )
}

export default function MediaItem({ item, onItemClick, thumbSrc }: MediaItemProps) {
  const media = parseMediaJson(item.content)?.media
  const audioData = item.type === 'audio' ? parseAudioJson(item.content) : null
  const audio = audioData?.audio
  const isAudio = item.type === 'audio'
  const blurThumb = media?.thumbnailBase64 || ''
  const isVideo = media?.type === 'video'
  const mainSrc = isVideo ? (thumbSrc || (media?.thumbnailUrl || '')) : (media?.url || '')
  const [thumbSize, setThumbSize] = useState<{ width: number, height: number } | null>(null)
  const [blurAspectRatio, setBlurAspectRatio] = useState<string>('16 / 9')

  useEffect(() => {
    if (media?.width && media?.height) {
      setBlurAspectRatio(`${media.width} / ${media.height}`)
    }
    else if (blurThumb) {
      getAspectRatioFromBase64(blurThumb)
        .then(setBlurAspectRatio)
        .catch(() => setBlurAspectRatio('16 / 9'))
    }
  }, [blurThumb, media?.width, media?.height])

  useEffect(() => {
    let cancelled = false
    if (!mainSrc)
      return
    const probe = new window.Image()
    probe.src = mainSrc
    probe.onload = () => {
      if (!cancelled)
        setThumbSize({ width: probe.naturalWidth, height: probe.naturalHeight })
    }
    probe.onerror = () => {
      if (!cancelled)
        setThumbSize(null)
    }
    return () => {
      cancelled = true
    }
  }, [mainSrc])

  // Audio tiles do not preload the audio; playback happens in the modal

  if (isAudio) {
    const isTrack = Boolean(audioData?.track?.isTrack)
    const coverUrl = audioData?.cover?.url
    const fileName = (audio?.object || audio?.url || '').split('/').pop() || 'audio'

    if (isTrack && coverUrl) {
      return (
        <div className="relative group" onClick={() => onItemClick?.(item)}>
          <RenderImage imageUrl={coverUrl} title={item.title || null} />
          <div className="absolute bottom-0 left-0 right-0 p-2 pt-3 bg-gradient-to-t from-black/70 to-transparent text-white z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <div className="text-sm font-medium truncate">{audioData?.track?.title || item.title || fileName}</div>
            {(audioData?.track?.artist || audioData?.track?.album) && (
              <div className="text-xs opacity-80 truncate">{[audioData?.track?.artist, audioData?.track?.album].filter(Boolean).join(' • ')}</div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col" onClick={() => onItemClick?.(item)}>
        <div className="w-full aspect-square rounded-lg border flex items-center justify-center bg-muted/40">
          <Music2 className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground truncate">{fileName}</div>
      </div>
    )
  }

  return (
    <div className="relative" onClick={() => onItemClick?.(item)}>
      {isVideo
        ? (
            <div
              className="relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
              style={{ aspectRatio: thumbSize ? `${thumbSize.width} / ${thumbSize.height}` : blurAspectRatio }}
            >
              {blurThumb && (
                <Image
                  src={blurThumb}
                  alt="blur preview"
                  className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-500 ease-in-out z-0"
                  style={{ opacity: thumbSrc ? 0 : 1 }}
                  draggable={false}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
                />
              )}
              {mainSrc && (
                <Image
                  src={mainSrc}
                  alt={item.title || 'Video'}
                  className="w-full h-full object-cover relative z-10 transition-opacity duration-500 ease-in-out"
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
          )
        : (
            mainSrc ? <RenderImage imageUrl={media?.url || ''} title={item.title || null} blurThumb={blurThumb} savedWidth={media?.width} savedHeight={media?.height} /> : null
          )}
      {item.tags.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
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
