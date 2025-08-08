import { getPresignedMediaUrl } from "@/shared/lib/image-utils"
import Image from "next/image"
import { useEffect, useState } from "react"

interface PreviewImageProps {
  src: string
  token?: string
  alt?: string
  className?: string
  skeletonClassName?: string
}

export function PreviewImage({ src, token, alt, className, skeletonClassName }: PreviewImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    getPresignedMediaUrl(src, token)
      .then((presigned) => {
        if (!cancelled) {
          setUrl(presigned)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [src, token])

  if (loading) {
    return <div className={skeletonClassName || "bg-muted animate-pulse w-full h-full rounded"} />
  }
  if (error || !url) {
    return <div className={skeletonClassName || "bg-destructive/20 w-full h-full rounded flex items-center justify-center text-xs text-destructive"}>Ошибка</div>
  }
  return <Image src={url} alt={alt || ''} className={className} draggable={false} fill />
}