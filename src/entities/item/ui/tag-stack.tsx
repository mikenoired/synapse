'use client'

import type { Content } from '@/shared/lib/schemas'
import { FileText, LinkIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getPresignedMediaUrl } from '@/shared/lib/image-utils'
import { parseMediaJson } from '@/shared/lib/schemas'
import { cn } from '@/shared/lib/utils'

interface TagStackProps {
  items: Content[]
}

function TagPreview({ item }: { item: Content }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadImages = async () => {
      setLoaded(false)
      setErrored(false)
      setImgSrc(null)

      const media = item.type === 'media' ? parseMediaJson(item.content)?.media : null
      if (media?.url) {
        const url = await getPresignedMediaUrl(media.url)
        if (cancelled)
          return

        setImgSrc(url || null)
      }
    }

    loadImages()

    return () => {
      cancelled = true
    }
  }, [item.type, item.content])

  if (item.type === 'media') {
    const media = parseMediaJson(item.content)?.media
    const blurThumb = media?.thumbnailBase64 || ''
    const isVideo = media?.type === 'video'

    return (
      <div
        className="relative w-full h-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
        style={{ aspectRatio: '1 / 1' }}
      >
        {blurThumb && (
          <Image
            src={blurThumb}
            alt="blur preview"
            className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-200 ease-in-out z-0"
            style={{ opacity: loaded && !errored ? 0 : 1 }}
            draggable={false}
            fill
            sizes="200px"
          />
        )}
        {imgSrc && !errored && (
          <Image
            src={imgSrc}
            alt={item.title || (isVideo ? 'Видео' : 'Изображение')}
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
            sizes="200px"
          />
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <svg
              width="32"
              height="32"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 drop-shadow-lg"
            >
              <path
                d="M20 16C20 13.7909 22.2386 12.5532 24.0711 13.7574L50.1421 31.7574C51.8579 32.8921 51.8579 35.1079 50.1421 36.2426L24.0711 54.2426C22.2386 55.4468 20 54.2091 20 52V16Z"
                fill="white"
                fillOpacity="0.8"
              />
            </svg>
          </div>
        )}
        {(!imgSrc || errored) && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-muted/50">
            <FileText className="w-8 h-8 opacity-60" />
          </div>
        )}
      </div>
    )
  }

  if (item.type === 'note' && item.title) {
    let preview = ''
    try {
      preview = (JSON.parse(item.content as string)?.blocks?.[0]?.data?.text as string) || ''
    }
    catch {
      preview = ''
    }
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3">{preview}</p>
      </div>
    )
  }

  if (item.type === 'link' && item.url) {
    return (
      <div className="p-4 flex flex-col justify-center items-center h-full text-center">
        <LinkIcon className="size-8 mb-2 text-muted-foreground" />
        <p className="text-sm font-medium line-clamp-2">{item.title || item.url}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate max-w-full">{item.url}</p>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col justify-center items-center h-full">
      <FileText className="size-8 text-muted-foreground" />
      <p className="mt-2 text-sm">Контент</p>
    </div>
  )
}

export function TagStack({ items }: TagStackProps) {
  return (
    <div className="relative aspect-square w-full cursor-pointer">
      {items.slice(0, 3).reverse().map((item, index) => (
        <div
          key={item.id}
          className={cn(
            'absolute w-full h-full overflow-hidden transition-all duration-300 ease-in-out group-hover:shadow-lg shadow-md p-0',
            index === 0 && 'z-30',
            index === 1 && 'z-20 rotate-0 translate-x-1.5 -translate-y-3 group-hover:rotate-3 group-hover:translate-x-4 group-hover:-translate-y-4',
            index === 2 && 'z-10 -rotate-2 -translate-x-1.5 translate-y-3 group-hover:-translate-x-4 group-hover:translate-y-4 group-hover:-rotate-3',
          )}
        >
          <TagPreview item={item} />
        </div>
      ))}
    </div>
  )
}
