'use client'
import type { TouchEvent } from 'react'
import type { Content } from '@/shared/lib/schemas'
import { Badge, Button, Dialog, DialogContent, DialogTitle, Input, PreviewImage } from '@synapse/ui/components'
import { ChevronLeft, ChevronRight, Edit2, Layers, Play, Plus, Tag, Trash2, Ungroup, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { trpc } from '@/shared/api/trpc'
import { getPresignedMediaUrl } from '@/shared/lib/image-utils'
import { parseMediaJson } from '@/shared/lib/schemas'
import { CustomVideoPlayer } from './custom-video-player'

interface UnifiedMediaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content
  gallery?: { url: string, parentId: string, media_type?: string, thumbnail_url?: string }[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onContentChanged?: () => void
}

export function UnifiedMediaModal({
  open,
  onOpenChange,
  item,
  gallery = [],
  onEdit,
  onDelete,
  onContentChanged,
}: UnifiedMediaModalProps) {
  const initialIndex = (gallery.length > 0) ? gallery.findIndex(g => g.parentId === item.id) : 0
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0)
  const [isHovered, setIsHovered] = useState(false)
  const [direction, setDirection] = useState(0)
  const [showTags, setShowTags] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const router = useRouter()

  const imageUrls: string[] = (gallery.length > 0)
    ? gallery.map(g => g.url)
    : (() => {
        const media = parseMediaJson(item.content)?.media
        return media?.url ? [media.url] : [item.content]
      })()

  const isMultiple = imageUrls.length > 1

  const updateContentMutation = trpc.content.update.useMutation({
    onSuccess: () => {
      onContentChanged?.()
    },
  })

  const createContentMutation = trpc.content.create.useMutation({
    onSuccess: () => {
      onContentChanged?.()
    },
  })

  const deleteContentMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      onContentChanged?.()
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (open) {
      const newIndex = (gallery.length > 0) ? gallery.findIndex(g => g.parentId === item.id) : 0
      setCurrentIndex(newIndex >= 0 ? newIndex : 0)
      setShowTags(false)
    }
  }, [open, item.id])

  const goToNext = () => {
    setDirection(1)
    setCurrentIndex(i => (i < imageUrls.length - 1 ? i + 1 : i))
  }

  const goToPrevious = () => {
    setDirection(-1)
    setCurrentIndex(i => (i > 0 ? i - 1 : i))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open)
        return

      switch (e.key) {
        case 'Escape':
          if (showTags) {
            setShowTags(false)
          }
          else {
            onOpenChange(false)
          }
          break
        case 'ArrowLeft':
          if (!showTags) {
            e.preventDefault()
            goToPrevious()
          }
          break
        case 'ArrowRight':
          if (!showTags) {
            e.preventDefault()
            goToNext()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, showTags])

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd)
      return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && isMultiple) {
      goToNext()
    }
    if (isRightSwipe && isMultiple) {
      goToPrevious()
    }
  }

  const handleUngroup = async () => {
    if (!isMultiple)
      return

    // eslint-disable-next-line no-alert
    if (!confirm(`Separate ${imageUrls.length} images into separate elements?`))
      return

    try {
      const createPromises = imageUrls.map((url, index) => {
        return createContentMutation.mutateAsync({
          type: 'media',
          title: imageUrls.length > 1 && item.title
            ? `${item.title} (${index + 1})`
            : item.title,
          content: url,
          tags: item.tags || [],
        })
      })

      await Promise.all(createPromises)

      await deleteContentMutation.mutateAsync({ id: item.id })

      onOpenChange(false)
    }
    catch {
      // eslint-disable-next-line no-alert
      alert('Error separating images into separate elements')
    }
  }

  const handleAddTag = async (toAll: boolean = false) => {
    if (!newTag.trim())
      return

    try {
      if (toAll || !isMultiple) {
        const updatedTags = [...new Set([...(item.tags || []), newTag.trim()])]
        await updateContentMutation.mutateAsync({
          id: item.id,
          tags: updatedTags,
        })
      }
      else {
        const updatedTags = [...new Set([...(item.tags || []), newTag.trim()])]
        await updateContentMutation.mutateAsync({
          id: item.id,
          tags: updatedTags,
        })
      }

      setNewTag('')
    }
    catch {
      // eslint-disable-next-line no-alert
      alert('Error adding tag')
    }
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  }

  const handleEdit = () => {
    router.push(`/edit/${item.id}`)
    onOpenChange(false)
  }

  const handleDelete = () => {
    // eslint-disable-next-line no-alert
    if (confirm('Delete this content?')) {
      deleteContentMutation.mutate({ id: item.id })
    }
  }

  const currentMedia = gallery && gallery.length > 0
    ? gallery[currentIndex]
    : { url: item.media_url || imageUrls[currentIndex], media_type: item.media_type, thumbnail_url: item.thumbnail_url }

  const [mediaSrc, setMediaSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setMediaSrc(null)
    getPresignedMediaUrl(currentMedia.url)
      .then((url) => {
        if (!cancelled)
          setMediaSrc(url)
      })
      .catch(() => {
        if (!cancelled)
          setMediaSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [currentMedia.url])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="hidden"></DialogTitle>
      <DialogContent showCloseButton={false} className="max-w-none w-screen h-screen rounded-none min-h-0 p-0 m-0 bg-black/95 border-none flex flex-col">
        <div
          className="w-full h-full min-h-0 flex flex-col flex-1 relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300 ${isHovered || showTags ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                {item.title && (
                  <h2 className="text-lg font-semibold mb-1">{item.title}</h2>
                )}
                <div className="flex items-center gap-3 text-sm text-white/70">
                  {isMultiple && (
                    <>
                      <span>
                        {currentIndex + 1}
                        {' '}
                        of
                        {' '}
                        {imageUrls.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>Group</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isMultiple && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUngroup}
                    className="text-white hover:bg-white/20"
                    title="Separate"
                  >
                    <Ungroup className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTags(!showTags)}
                  className="text-white hover:bg-white/20"
                  title="Tags"
                >
                  <Tag className="w-4 h-4" />
                </Button>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="text-white hover:bg-white/20"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-white hover:bg-white/20"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {showTags && (
            <div className="absolute top-16 left-2 right-2 md:left-4 md:right-4 z-20 bg-black/90 backdrop-blur-sm rounded-lg p-3 md:p-4 text-white max-h-60 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Tags</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTags(false)}
                    className="text-white/70 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="bg-white/20 text-white border-white/30 text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag(true)
                        e.preventDefault()
                      }
                    }}
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 flex-1"
                  />
                  <Button
                    onClick={() => handleAddTag(true)}
                    disabled={!newTag.trim()}
                    className="bg-white/20 hover:bg-white/30 text-white shrink-0"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {isMultiple && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-xs text-white/70">
                      Tags apply to all images in the group
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden">
            <AnimatePresence initial={false} mode="sync" custom={direction}>
              {currentMedia.media_type === 'video'
                ? (
                    <motion.div
                      key={currentIndex}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: 'tween', duration: 0.32, ease: [0.33, 1, 0.68, 1] },
                        opacity: { duration: 0.2, ease: 'linear' },
                      }}
                      className="absolute inset-0 w-full h-full"
                      style={{ borderRadius: 12, background: '#000' }}
                    >
                      <CustomVideoPlayer
                        src={mediaSrc || ''}
                        poster={currentMedia.thumbnail_url}
                        autoPlay={true}
                        className="w-full h-full"
                      />
                    </motion.div>
                  )
                : (
                    <motion.img
                      key={currentIndex}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: 'tween', duration: 0.32, ease: [0.33, 1, 0.68, 1] },
                        opacity: { duration: 0.2, ease: 'linear' },
                      }}
                      src={mediaSrc || undefined}
                      alt={`${item.title || 'Image'} ${currentIndex + 1}`}
                      className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                      draggable={false}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc0LjVMMTAwIDYyTDExMi41IDc0LjVMMTI1IDYyTDE0MCA3N1Y5NUg2MFY3N0w3NSA2Mkw4Ny41IDc0LjVaIiBmaWxsPSIjOUM5Q0EzIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTAiIHI9IjgiIGZpbGw9IiM5QzlDQTMiLz4KPFRLEHU+PC90ZXh0Pgo8L3N2Zz4K'
                      }}
                    />
                  )}
            </AnimatePresence>

            {isMultiple && (
              <div className="hidden md:block">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-opacity duration-200 disabled:opacity-30 disabled:cursor-not-allowed z-30"
                >
                  <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" />
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex === imageUrls.length - 1}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-opacity duration-200 disabled:opacity-30 disabled:cursor-not-allowed z-30"
                >
                  <ChevronRight className="w-6 h-6 md:w-7 md:h-7" />
                </button>
              </div>
            )}
          </div>

          {isMultiple && <MiniatureCarousel gallery={gallery} currentIndex={currentIndex} setDirection={setDirection} setCurrentIndex={setCurrentIndex} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MiniatureCarousel({ gallery, currentIndex, setDirection, setCurrentIndex }: {
  gallery: { url: string, media_type?: string, thumbnail_url?: string }[]
  currentIndex: number
  setDirection: (direction: number) => void
  setCurrentIndex: (index: number) => void
}) {
  return (
    <div className="w-full p-4 bg-gradient-to-t from-black/50 to-transparent flex justify-center gap-2 max-w-full overflow-x-auto">
      {gallery.map(async (media, index) => {
        if (!media.url)
          return null
        const isVideo = media.media_type?.startsWith('video')
        const previewSrc = isVideo ? media.thumbnail_url || media.url : media.url
        const distance = Math.abs(index - currentIndex)
        const previewUrl = await getPresignedMediaUrl(previewSrc)
        if (distance > 15)
          return null
        return (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1)
              setCurrentIndex(index)
            }}
            className={`flex-shrink-0 w-16 h-16 overflow-hidden border-2 transition-all relative ${index === currentIndex
              ? 'border-white scale-110'
              : 'border-white/30 hover:border-white/60'
            }`}
          >
            <PreviewImage
              url={previewUrl}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover"
              skeletonClassName="w-full h-full bg-white/10 animate-pulse rounded"
            />
            {isVideo && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Play className="w-8 h-8 text-white/80 drop-shadow" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
