'use client'

import Image from 'next/image'

interface PreviewImageProps {
  url: string
  alt?: string
  className?: string
  skeletonClassName?: string
}

export function PreviewImage({ url, alt, className, skeletonClassName }: PreviewImageProps) {
  if (!url) {
    return <div className={skeletonClassName || 'bg-muted animate-pulse w-full h-full rounded'} />
  }
  return <Image src={url} alt={alt || ''} className={className} draggable={false} fill unoptimized />
}
